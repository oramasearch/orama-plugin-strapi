'use strict'

const activeHooks = new Map()

module.exports = ({ strapi }) => ({
  registerHooks(collection, hooks) {
    if (activeHooks.has(collection.id)) {
      return
    }

    strapi.db.lifecycles.subscribe({
      models: [collection.entity],
      ...hooks
    })

    activeHooks.set(collection.id, hooks)
  },

  unregisterHooks(collection) {
    if (!activeHooks.has(collection.id)) {
      return
    }

    activeHooks.delete(collection.id)
  },

  isHookRegistered(collection) {
    return activeHooks.has(collection.id)
  }
})
