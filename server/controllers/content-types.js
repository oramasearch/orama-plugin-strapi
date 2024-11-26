'use strict'

module.exports = ({ strapi }) => {
  return {
    async getContentTypes(ctx) {
      return strapi.plugin('orama-cloud').service('contentTypesService').getContentTypes()
    },

    getAvailableRelations(ctx) {
      const { id } = ctx.params

      return strapi.plugin('orama-cloud').service('contentTypesService').getAvailableRelations({ contentTypeId: id })
    },

    async getContentTypesSchema(ctx) {
      const { id } = ctx.params
      const { includedRelations } = ctx.query

      const includedRelationsArray = includedRelations?.split(',') || []

      return strapi.plugin('orama-cloud').service('contentTypesService').getContentTypeSchema({
        contentTypeId: id,
        includedRelations: includedRelationsArray
      })
    }
  }
}
