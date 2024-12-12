'use strict'

const registeredCronJobs = new Map()

module.exports = ({ strapi }) => {
  const oramaService = strapi.plugin('orama-cloud').service('oramaManagerService')
  const collectionService = strapi.plugin('orama-cloud').service('collectionsService')
  const hookManagerService = strapi.plugin('orama-cloud').service('hookManagerService')

  return {
    registerCronJob(collection) {
      strapi.log.info(`Registering cron-job for collection ${collection.id}`)

      const { id, entity, updateCron: cronFrequency, updateHook } = collection

      if (updateHook === 'cron' && cronFrequency) {
        if (registeredCronJobs.has(id)) {
          this.removeCronJob(id)
        }

        const cronJob = strapi.cron.add({
          [`orama-collection-update-${id}`]: {
            task: async () => {
              strapi.log.debug(`Running cron job for collection ${id}, entity ${entity}`)
              try {
                await oramaService.processScheduledUpdate(collection)
              } catch (error) {
                strapi.log.error(error)
              }
            },
            options: {
              rule: cronFrequency
            }
          }
        })

        registeredCronJobs.set(id, cronJob)

        // Register lifecycle hooks to update the status of the collection
        // when an entity is created, updated or deleted.
        this.registerLifecycleHooks(collection)

        strapi.log.info(`Cron job registered for collection ${id} with frequency: ${cronFrequency}`)
      }
    },

    removeCronJob(id) {
      if (registeredCronJobs.has(id)) {
        const cronJob = registeredCronJobs.get(id)
        cronJob.stop()
        strapi.log.debug(`Cron job stopped for collection ${id}`)
        registeredCronJobs.delete(id)
        strapi.log.debug(`Cron job removed for collection ${id}`)
      }
    },

    registerLifecycleHooks(collection) {
      hookManagerService.unregisterHooks(collection)
      hookManagerService.registerHooks(collection, {
        afterCreate() {
          handleUpdateStatus(collection)
        },
        afterUpdate() {
          handleUpdateStatus(collection)
        },
        afterDelete() {
          handleUpdateStatus(collection)
        }
      })

      async function handleUpdateStatus() {
        await collectionService.updateWithoutHooks(collection.id, {
          status: 'outdated'
        })

        oramaService.processScheduledUpdate(collection)
      }
    }
  }
}
