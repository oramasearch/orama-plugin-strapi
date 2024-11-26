'use strict'

const { CloudManager } = require('@oramacloud/client')
const { getSelectedPropsFromObj } = require('../../utils')

class OramaManager {
  constructor({ strapi }) {
    this.strapi = strapi
    this.contentTypesService = strapi.plugin('orama-cloud').service('contentTypesService')
    this.collectionService = strapi.plugin('orama-cloud').service('collectionsService')
    this.privateApiKey = strapi.config.get('plugin.orama-cloud.privateApiKey')
    this.collectionSettings = strapi.config.get('plugin.orama-cloud.collectionSettings')

    this.oramaCloudManager = new CloudManager({ api_key: this.privateApiKey })
    this.DocumentActionsMap = {
      create: this.oramaInsert.bind(this),
      update: this.oramaUpdate.bind(this),
      delete: this.oramaDelete.bind(this)
    }
  }

  /*
   * Validates the collection before processing
   * Checks if the collection exists, if the private API key is set and if the collection is not already updating or updated
   * Returns true if the collection is valid, false otherwise
   * @param {Object} collection - Collection object
   * */
  validate(collection) {
    const collectionSettings = this.collectionSettings?.[collection.indexId]

    if (!collection) {
      this.strapi.log.error(`Collection not found`)
      return false
    }

    if (!this.privateApiKey) {
      this.strapi.log.error('Private API key is required to process index updates')
      return false
    }

    if (collection.status === 'updating') {
      this.strapi.log.debug(
        `SKIP: Collection ${collection.entity} with indexId ${collection.indexId} is already updating`
      )
      return false
    }

    if (collection.status === 'updated') {
      this.strapi.log.debug(
        `SKIP: Collection ${collection.entity} with indexId ${collection.indexId} is already updated`
      )
      return false
    }

    if (
      collectionSettings &&
      ((collectionSettings.schema && !collectionSettings.transformer) ||
        (!collectionSettings.schema && collectionSettings.transformer))
    ) {
      this.strapi.log.error(`ERROR: Both schema and transformer are required in the collection settings`)
      return false
    }

    return true
  }

  /*
   * Transforms the documents before inserting them into the index
   * The transformer function is defined in the collection settings
   * If no transformer function is defined, the documents are returned as is
   * @param {String} indexId - Index ID
   * @param {Array} entries - Array of entries
   * */
  documentsTransformer(indexId, entries) {
    const transformer = this.collectionSettings?.[indexId]?.transformer

    if (!transformer) {
      return entries
    }

    return entries.map((entry) => transformer(entry))
  }

  /*
   * Set the collection status to outdated
   * @param {Object} collection - Collection object
   * */
  async setOutdated(collection) {
    return await this.collectionService.updateWithoutHooks(collection.id, {
      status: 'outdated'
    })
  }

  /*
   * Set the collection status to updating
   * @param {Object} collection - Collection object
   * */
  async updatingStarted(collection) {
    return await this.collectionService.updateWithoutHooks(collection.id, {
      status: 'updating'
    })
  }

  /*
   * Set the collection status to updated and update the deployed_at field
   * Also updates the documents_count field if provided
   * @param {Object} collection - Collection object
   * @param {Number} documents_count - Number of documents in the collection
   * */
  async updatingCompleted(collection, documents_count) {
    return await this.collectionService.updateWithoutHooks(collection.id, {
      status: 'updated',
      deployed_at: new Date(),
      ...(documents_count && { documents_count })
    })
  }

  /*
   * Deploys an index to the Orama Cloud using the OramaCloud SDK
   * @param {Object} collection - Collection object
   * */
  async oramaDeployIndex({ indexId }) {
    const index = this.oramaCloudManager.index(indexId)
    const result = await index.deploy()

    this.strapi.log.info(`Index ${indexId} deployed`)

    return result
  }

  /*
   * Pushes empty snapshot in the Orama Cloud using the OramaCloud SDK
   * @param {Object} collection - Collection object
   * */
  async resetIndex({ indexId }) {
    const index = this.oramaCloudManager.index(indexId)
    return await index.snapshot([])
  }

  /*
   * Processes all entries from a collection and inserts them into the index
   * Bulk insert is done recursively to avoid memory issues
   * Bulk dispatches 50 entries at a time
   * @param {Object} collection - Collection object
   * @param {Number} offset - Offset for pagination
   * */
  async bulkInsert(collection, offset = 0) {
    const entries = await this.contentTypesService.getEntries({
      contentType: collection.entity,
      relations: collection.includedRelations,
      schema: collection.schema,
      offset
    })

    if (entries.length > 0) {
      await this.oramaInsert({
        indexId: collection.indexId,
        entries
      })

      return await this.bulkInsert(collection, offset + entries.length)
    }

    return { documents_count: offset }
  }

  /*
   * Updates the schema of an index in the Orama Cloud using the OramaCloud SDK
   * @param {string} indexId - Index ID
   * @param {Object} schema - Schema object
   * */
  async oramaUpdateSchema({ indexId, schema }) {
    const index = this.oramaCloudManager.index(indexId)
    await index.updateSchema({ schema })
  }

  /*
   * Inserts new documents into the index in the Orama Cloud using the OramaCloud SDK
   * Formats data before insertion using the documentsTransformer function, if provided
   * @param {string} indexId - Index ID
   * @param {Array} entries - Array of entries
   * */
  async oramaInsert({ indexId, entries }) {
    const index = this.oramaCloudManager.index(indexId)
    const transformedData = this.documentsTransformer(indexId, entries)

    if (!transformedData) {
      this.strapi.log.error(`ERROR: documentsTransformer needs a return value`)
      return false
    }

    const result = await index.insert(transformedData)

    this.strapi.log.info(`INSERT: documents with id ${transformedData.map(({ id }) => id)} into index ${indexId}`)

    return result
  }

  /*
   * Updates documents of the specified index in the Orama Cloud using the OramaCloud SDK
   * Formats data before insertion using the documentsTransformer function, if provided
   * @param {string} indexId - Index ID
   * @param {Array} entries - Array of entries
   * */
  async oramaUpdate({ indexId, entries }) {
    const index = this.oramaCloudManager.index(indexId)
    const transformedData = this.documentsTransformer(indexId, entries)

    if (!transformedData) {
      this.strapi.log.error(`ERROR: documentsTransformer needs a return value`)
      return false
    }

    const result = await index.update(transformedData)

    this.strapi.log.info(`UPDATE: document with id ${transformedData.map(({ id }) => id)} into index ${indexId}`)

    return result
  }

  /*
   * Delete documents of the specified index in the Orama Cloud using the OramaCloud SDK
   * @param {string} indexId - Index ID
   * @param {Array} entries - Array of entries
   * */
  async oramaDelete({ indexId, entries }) {
    const index = this.oramaCloudManager.index(indexId)
    const result = await index.delete(entries.map(({ id }) => id))

    this.strapi.log.info(`DELETE: document with id ${entries.map(({ id }) => id)} from index ${indexId}`)

    return result
  }

  /*
   * Handles the document based on the action
   * Used by the live update feature
   * @param {string} indexId - Index ID
   * @param {Object} record - Record object
   * @param {string} action - Action to perform (insert, update, delete)
   * */
  async handleDocument({ indexId, record, action }) {
    if (!action || !record || !this.DocumentActionsMap[action]) {
      return false
    }

    const { createdBy, updatedBy, ...rest } = record

    return await this.DocumentActionsMap[action]({ indexId, entries: [{ ...rest, id: rest.id.toString() }] })
  }

  /*
   * Handles the collection creation or update
   * Used by the afterCollectionCreationOrUpdate lifecycle hook
   * @param {Object} collection - Collection object
   * */
  async afterCollectionCreationOrUpdate({ id }) {
    const collection = await this.collectionService.findOne(id)

    if (!this.validate(collection)) {
      return
    }

    const customSchema = this.collectionSettings?.[collection.indexId]?.schema

    const oramaSchema =
      customSchema ??
      getSelectedPropsFromObj({
        props: collection.searchableAttributes,
        obj: collection.schema
      })

    await this.updatingStarted(collection)

    await this.resetIndex(collection)

    await this.oramaUpdateSchema({
      indexId: collection.indexId,
      schema: oramaSchema
    })

    const { documents_count } = await this.bulkInsert(collection)

    if (documents_count > 0) {
      await this.oramaDeployIndex(collection)
    }

    await this.updatingCompleted(collection, documents_count)
  }

  /*
   * Deploys a specified collection index
   * Triggered by Admin UI 'Deploy' CTA
   * @param {Object} collection - Collection object
   * */
  async deployIndex({ id }) {
    const collection = await this.collectionService.findOne(id)

    this.strapi.log.debug(
      `Processing scheduled index update for ${collection.entity} with indexId ${collection.indexId}`
    )

    if (!this.validate(collection)) {
      return
    }

    await this.updatingStarted(collection)

    await this.oramaDeployIndex(collection)

    await this.updatingCompleted(collection)

    this.strapi.log.debug(`UPDATE: ${collection.entity} with indexId ${collection.indexId} completed`)
  }

  /*
   * Processes the live update for a collection
   * Triggered by the afterCreate, afterUpdate, afterDelete collection lifecycle hooks
   * @param {Object} collection - Collection object
   * @param {Object} record - Record object
   * @param {string} action - Action triggered (insert, update, delete)
   * */
  async processLiveUpdate({ id }, record, action) {
    const collection = await this.collectionService.findOne(id)

    if (!this.validate(collection)) {
      return
    }

    this.strapi.log.debug(`Processing live update for ${collection.entity} with indexId ${collection.indexId}`)

    await this.updatingStarted(collection)

    const handleDocumentResult = await this.handleDocument({
      indexId: collection.indexId,
      record,
      action
    })

    if (!handleDocumentResult) {
      await this.setOutdated(collection)
      return
    }

    await this.setOutdated(collection)

    this.strapi.log.debug(`Live update for ${collection.entity} with indexId ${collection.indexId} completed`)
  }

  /*
   * Processes the scheduled update for a collection
   * Triggered by the afterCreate, afterUpdate, afterDelete collection lifecycle hooks
   * @param {Object} collection - Collection object
   * */
  async processScheduledUpdate({ id }) {
    const collection = await this.collectionService.findOne(id)

    if (!this.validate(collection)) {
      return
    }

    this.strapi.log.debug(
      `Processing scheduled index update for ${collection.entity} with indexId ${collection.indexId}`
    )

    await this.updatingStarted(collection)

    await this.resetIndex(collection)

    const { documents_count } = await this.bulkInsert(collection)

    await this.updatingCompleted(collection, documents_count)

    this.strapi.log.debug(`Scheduled update for ${collection.entity} with indexId ${collection.indexId} completed`)
  }
}

module.exports = {
  OramaManager,
  service: ({ strapi }) => new OramaManager({ strapi })
}
