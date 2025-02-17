'use strict'

const { CloudManager } = require('@oramacloud/client')
const { getSelectedPropsFromObj } = require('../../../utils')

const getAssociatedActionName = (action) => {
  const actionMap = {
    insert: 'upsert',
    update: 'upsert',
    delete: 'delete'
  }

  return actionMap[action]
}

class OramaManager {
  constructor({ strapi }) {
    this.strapi = strapi
    this.contentTypesService = strapi.plugin('orama-cloud').service('contentTypesService')
    this.collectionService = strapi.plugin('orama-cloud').service('collectionsService')
    this.privateApiKey = strapi.config.get('plugin::orama-cloud.privateApiKey')
    this.collectionSettings = strapi.config.get('plugin::orama-cloud.collectionSettings')

    this.oramaCloudManager = new CloudManager({ api_key: this.privateApiKey })
    this.DocumentActionsMap = {
      upsert: this.oramaUpsert.bind(this),
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
      ...(collection.includeDrafts === false && {
        where: {
          publishedAt: { $ne: null }
        }
      }),
      offset
    })

    if (entries.length > 0) {
      await this.oramaUpsert({
        collection,
        entries,
        action: 'insert',
        isFromBulk: true
      })

      return await this.bulkInsert(collection, offset + entries.length)
    } else if (offset === 0 && entries.length === 0) {
      return { documents_count: 0, forceEmptyDeploy: true }
    }

    return { documents_count: offset }
  }

  /*
   * Updates the schema of a collection in the Orama Cloud using the OramaCloud SDK.
   * Fetches schema from the collection settings if provided, otherwise uses the searchableAttributes from the collection schema.
   * @param {Object} collection - Collection object
   * */
  async updateSchema(collection) {
    const customSchema = this.collectionSettings?.[collection.indexId]?.schema

    const oramaSchema =
      customSchema ??
      getSelectedPropsFromObj({
        props: collection.searchableAttributes,
        obj: collection.schema
      })

    await this.oramaUpdateSchema({
      indexId: collection.indexId,
      schema: oramaSchema
    })
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
   * Updates documents of the specified index in the Orama Cloud using the OramaCloud SDK
   * Formats data before insertion using the documentsTransformer function, if provided
   * @param {string} indexId - Index ID
   * @param {Array} entries - Array of entries
   * */
  async oramaUpsert({
    collection: { indexId, entity, schema, includedRelations, includeDrafts },
    action,
    entries,
    isFromBulk
  }) {
    let filteredEntries = entries
    const index = this.oramaCloudManager.index(indexId)

    if (!isFromBulk) {
      filteredEntries = await this.contentTypesService.getEntries({
        contentType: entity,
        relations: includedRelations,
        schema: schema,
        where: {
          id: {
            $in: entries.map(({ id }) => id)
          },
          ...(includeDrafts === false && {
            publishedAt: { $ne: null }
          })
        }
      })
    }

    const transformedData = this.documentsTransformer(indexId, filteredEntries)

    if (!transformedData) {
      this.strapi.log.error(`ERROR: documentsTransformer needs a return value`)
      return false
    }

    const result = await index[action](transformedData)

    this.strapi.log.info(
      `${action.toUpperCase()}: document with id ${transformedData.map(({ id }) => id)} into index ${indexId}`
    )

    return result
  }

  /*
   * Delete documents of the specified index in the Orama Cloud using the OramaCloud SDK
   * @param {string} indexId - Index ID
   * @param {Array} entries - Array of entries
   * */
  async oramaDelete({ collection: { indexId }, entries }) {
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
  async handleDocument({ collection, record, action }) {
    const associatedActionName = getAssociatedActionName(action)

    if (!action || !record || !this.DocumentActionsMap[associatedActionName]) {
      this.strapi.log.warn(`Action ${action} not found. Skipping...`)

      return false
    }

    const { createdBy, updatedBy, ...rest } = record

    return await this.DocumentActionsMap[associatedActionName]({
      collection,
      action,
      entries: [{ ...rest, id: rest.id.toString() }]
    })
  }

  /*
   * Handles the collection creation or update
   * Used by the afterCollectionCreationOrUpdate lifecycle hook
   * @param {Object} collection - Collection object
   * */
  async afterCollectionCreationOrUpdate({ documentId }) {
    const collection = await this.collectionService.findOne(documentId)

    if (!this.validate(collection)) {
      return
    }

    await this.updatingStarted(collection)

    await this.resetIndex(collection)

    await this.updateSchema(collection)

    const { documents_count, forceEmptyDeploy } = await this.bulkInsert(collection)

    if (forceEmptyDeploy) {
      this.strapi.log.debug(`No documents found for ${collection.entity}. Deploying empty index.`)
      await this.resetIndex(collection)
      await this.oramaDeployIndex(collection)
    } else if (documents_count > 0) {
      await this.oramaDeployIndex(collection)
    }

    await this.updatingCompleted(collection, documents_count)
  }

  /*
   * Deploys a specified collection index
   * Triggered by Admin UI 'Deploy' CTA
   * @param {Object} collection - Collection object
   * */
  async deployIndex(collection) {
    this.strapi.log.debug(
      `Processing scheduled index update for ${collection.entity} with indexId ${collection.indexId}`
    )

    if (!this.validate(collection)) {
      this.strapi.log.error(`Collection not valid.`)
      return
    }

    await this.updatingStarted(collection)

    await this.updateSchema(collection)

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
  async processLiveUpdate(collection, record, action) {
    if (!this.validate(collection)) {
      return
    }

    this.strapi.log.debug(`Processing live update for ${collection.entity} with indexId ${collection.indexId}`)

    await this.updatingStarted(collection)

    const handleDocumentResult = await this.handleDocument({
      collection,
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
  async processScheduledUpdate(collection) {
    if (!this.validate(collection)) {
      return
    }

    this.strapi.log.debug(
      `Processing scheduled index update for ${collection.entity} with indexId ${collection.indexId}`
    )

    await this.updatingStarted(collection)

    await this.resetIndex(collection)

    await this.updateSchema(collection)

    const { documents_count } = await this.bulkInsert(collection)

    if (documents_count > 0) {
      await this.oramaDeployIndex(collection)
    }

    await this.updatingCompleted(collection, documents_count)

    this.strapi.log.debug(`Scheduled update for ${collection.entity} with indexId ${collection.indexId} completed`)
  }
}

module.exports = {
  OramaManager,
  service: ({ strapi }) => new OramaManager({ strapi })
}
