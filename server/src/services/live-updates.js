'use strict'

module.exports = ({ strapi }) => {
  const oramaService = strapi.plugin('orama-cloud').service('oramaManagerService')
  const collectionService = strapi.plugin('orama-cloud').service('collectionsService')
  const cronService = strapi.plugin('orama-cloud').service('cronService')
  const hookManagerService = strapi.plugin('orama-cloud').service('hookManagerService')

  return {
    registerLifecycleHooks(collection) {
      const { id } = collection

      // Remove any existing cron job for the collection
      cronService.removeCronJob(id)

      strapi.log.info(`registering life-cycle hooks for ${collection.entity}`)

      // Register lifecycle hooks to trigger updates when an entity is created, updated or deleted
      hookManagerService.unregisterHooks(collection)
      hookManagerService.registerHooks(collection, {
        async afterCreate(event) {
          await handleLiveUpdates(event, 'create')
        },
        async afterUpdate(event) {
          await handleLiveUpdates(event, 'update')
        },
        async afterDelete(event) {
          await handleLiveUpdates(event, 'delete')
        }
      })

      async function handleLiveUpdates(event, action) {
        const { result } = event

        oramaService.processLiveUpdate(collection, result, action)
      }
    }
  }
}
