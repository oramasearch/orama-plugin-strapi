'use strict'

const DOCUMENT_NAME = 'plugin::orama-cloud.collection'

module.exports = ({ strapi }) => {
  const collectionSettings = strapi.config.get('plugin::orama-cloud.collectionSettings')

  return {
    /**
     * Find all collection records
     */
    async find() {
      const collections = await strapi.documents(DOCUMENT_NAME).findMany()

      return collectionSettings
        ? collections.reduce((acc, collection) => {
            const settings = collectionSettings[collection.indexId]
            const hasValidSettings = settings?.schema && settings?.transformer

            if (settings) {
              if (hasValidSettings) {
                acc.push({
                  ...collection,
                  hasSettings: true
                })
              } else {
                strapi.log.warn(
                  `Collection with indexId ${collection.indexId} has settings but no schema or transformer`
                )
              }
            } else {
              acc.push(collection)
            }

            return acc
          }, [])
        : collections
    },

    /**
     * Find a collection record by id
     * @param {string} documentId
     */
    async findOne(documentId) {
      return strapi.documents(DOCUMENT_NAME).findOne({
        documentId
      })
    },

    /**
     * Create a new collection record
     * @param {object} data
     */
    async create(data) {
      const document = await strapi.documents(DOCUMENT_NAME).create({
        data: {
          ...data,
          status: 'outdated'
        }
      })

      strapi
        .plugin('orama-cloud')
        .service('oramaManagerService')
        .afterCollectionCreationOrUpdate({ documentId: document.documentId })

      return document
    },

    /**
     * Update a collection record by id
     * @param {string} documentId
     * @param {object} data
     */
    async update(documentId, data) {
      const document = await strapi.documents(DOCUMENT_NAME).update({
        documentId,
        data: {
          ...data,
          status: 'outdated'
        }
      })

      strapi
        .plugin('orama-cloud')
        .service('oramaManagerService')
        .afterCollectionCreationOrUpdate({ documentId: document.documentId })

      return document
    },

    /**
     * Update the status of a collection record by id
     * without triggering lifecycle hooks.
     *
     * @param {string} id
     * @param {object} data
     */
    async updateWithoutHooks(id, data) {
      return await strapi.db.transaction(async ({ trx }) => {
        return await trx.from('orama-cloud_collections').where({ id }).update(data, '*')
      })
    },

    /**
     * Delete a collection record by id
     * @param {string} documentId
     */
    async delete(documentId) {
      return strapi.documents(DOCUMENT_NAME).delete({ documentId, locale: '*' })
    },

    /**
     * Deploy a collection record by id
     * @param {string} documentId
     */
    async deploy(documentId) {
      const collection = await this.findOne(documentId)

      if (!collection) {
        throw new Error(`Collection with documentId ${documentId} not found`)
      }

      strapi.plugin('orama-cloud').service('oramaManagerService').deployIndex(collection)
    }
  }
}
