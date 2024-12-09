import { getTranslation } from './utils/getTranslation'
import { PLUGIN_ID } from './pluginId'
import { Initializer } from './components/Initializer'
import { PluginIcon } from './components/PluginIcon'
import { strapi } from '../../package.json'

export default {
  register(app) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: strapi.displayName
      },
      Component: async () => {
        const { App } = await import('./pages/App')

        return App
      }
    })

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID
    })
  },

  async registerTrads(app) {
    const { locales } = app

    const importedTranslations = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: getTranslation(data),
              locale
            }
          })
          .catch(() => {
            return {
              data: {},
              locale
            }
          })
      })
    )

    return importedTranslations
  }
}
