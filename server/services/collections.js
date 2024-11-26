'use strict'

const ENTITY_NAME = 'plugin::orama-cloud.collection'

module.exports = ({ strapi }) => {
  const collectionSettings = strapi.config.get('plugin.orama-cloud.collectionSettings')

  return {
    /**
     * Find all collection records
     */
    async find() {
      const collections = await strapi.entityService.findMany(ENTITY_NAME)

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
     * @param {string} id
     */
    async findOne(id) {
      return strapi.entityService.findOne(ENTITY_NAME, id)
    },

    /**
     * Create a new collection record
     * @param {object} data
     */
    async create(data) {
      const entity = await strapi.entityService.create(ENTITY_NAME, {
        data: {
          ...data,
          status: 'outdated'
        }
      })

      strapi.plugin('orama-cloud').service('oramaManagerService').afterCollectionCreationOrUpdate({ id: entity.id })

      return entity
    },

    /**
     * Update a collection record by id
     * @param {string} id
     * @param {object} data
     */
    async update(id, data) {
      const entity = await strapi.entityService.update(ENTITY_NAME, id, {
        data: {
          ...data,
          status: 'outdated'
        }
      })

      strapi.plugin('orama-cloud').service('oramaManagerService').afterCollectionCreationOrUpdate({ id: entity.id })

      return entity
    },

    /**
     * Update the status of a collection record by id
     * without triggering lifecycle hooks.
     *
     * @param {string} id
     * @param {object} data
     */
    async updateWithoutHooks(id, data) {
      await strapi.db.connection('orama-cloud_collections').where({ id }).update(data)

      return await strapi.entityService.findOne('plugin::orama-cloud.collection', id)
    },

    /**
     * Delete a collection record by id
     * @param {string} id
     */
    async delete(id) {
      return strapi.entityService.delete(ENTITY_NAME, id)
    },

    /**
     * Deploy a collection record by id
     * @param {string} id
     */
    async deploy(id) {
      const collection = await this.findOne(id)

      if (!collection) {
        throw new Error(`Collection with id ${id} not found`)
      }

      await this.updateWithoutHooks(id, { status: 'outdated' })

      strapi.plugin('orama-cloud').service('oramaManagerService').deployIndex({ id })
    }
  }
}
