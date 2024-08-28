module.exports = {
    afterUpdate: async (event) => {
        const { result } = event;

        if (result.updateHook === 'cron') {
            const cronService = strapi.plugin('orama').service('cronService');
            cronService.registerCronJob(result);
        }

        if (result.updateHook === 'live') {
            const liveUpdateService = strapi.plugin('orama').service('liveUpdatesService');
            liveUpdateService.registerLifecycleHooks(result);
        }
    },

    afterCreate: async (event) => {
        const { result } = event;

        if (result.updateHook === 'cron') {
            const cronService = strapi.plugin('orama').service('cronService');
            cronService.registerCronJob(result);
        }

        if (result.updateHook === 'live') {
            const liveUpdateService = strapi.plugin('orama').service('liveUpdatesService');
            liveUpdateService.registerLifecycleHooks(result);
        }
    },

    afterDelete: async (event) => {
        const { result } = event;

        if (result.updateHook === 'cron') {
            const cronService = strapi.plugin('orama').service('cronService');
            cronService.registerCronJob(result);
        }

        if (result.updateHook === 'live') {
            const liveUpdateService = strapi.plugin('orama').service('liveUpdatesService');
            liveUpdateService.registerLifecycleHooks(result);
        }
    },
};