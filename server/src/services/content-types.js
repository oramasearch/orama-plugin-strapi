'use strict'

const OramaTypesMap = {
  string: 'string',
  text: 'string',
  email: 'string',
  richtext: 'string',
  boolean: 'boolean',
  integer: 'number',
  biginteger: 'number',
  decimal: 'number',
  float: 'number',
  uid: 'string',
  date: 'string',
  time: 'string',
  datetime: 'string',
  enumeration: 'enum',
  collection: 'collection'
}

const arrayRelations = ['oneToMany', 'manyToMany']

const filterContentTypesAPIs = ({ contentTypes }) => {
  return Object.keys(contentTypes).reduce((sanitized, contentType) => {
    if (contentType.startsWith('api::')) {
      sanitized[contentType] = contentTypes[contentType]
    }
    return sanitized
  }, {})
}

const isValidType = (type) => {
  return !['component', 'media', 'blocks', 'json', 'password'].includes(type)
}

const isIgnoredAttribute = (attribute) => ['publishedAt', 'createdAt', 'updatedAt'].includes(attribute.name)

const isValidRelation = ({ attribute, includedRelations }) => {
  return (
    attribute.target.startsWith('api::') && (includedRelations.includes(attribute.name) || includedRelations === '*')
  )
}

const shouldAttributeBeIncluded = (attribute, includedRelations) => {
  return (
    isValidType(attribute.type) &&
    !isIgnoredAttribute(attribute) &&
    (attribute.type !== 'relation' || isValidRelation({ attribute, includedRelations }))
  )
}

const getSelectedRelations = ({ schema, relations }) => {
  return relations.reduce((acc, relation) => {
    if (relation in schema) {
      if (schema[relation] === 'collection') {
        acc[relation] = {
          select: '*'
        }
      } else {
        acc[relation] = {
          select: Object.keys(schema[relation]).map((key) => key)
        }
      }
    }

    return acc
  }, {})
}

const getSelectedFieldsConfigObj = (schema) =>
  Object.entries(schema).reduce(
    (acc, [key, value]) => (typeof value === 'object' || value === 'collection' ? acc : [...acc, key]),
    ['id']
  )

module.exports = ({ strapi }) => {
  return {
    getContentTypes() {
      const contentTypes = filterContentTypesAPIs({
        contentTypes: strapi.contentTypes
      })

      return Object.entries(contentTypes).map(([contentType, c]) => ({
        value: contentType,
        label: c.info.displayName,
        schema: this.getSchemaFromContentTypeAttributes({
          attributes: c.attributes,
          includedRelations: '*'
        }),
        availableRelations: this.getAvailableRelations({
          contentTypeId: contentType
        })
      }))
    },

    async getEntries({ contentType, relations = [], schema, offset = 0, limit = 50 }) {
      const selectedRelations = getSelectedRelations({ schema, relations })
      const selectedFields = getSelectedFieldsConfigObj(schema)

      return await strapi.query(contentType).findMany({
        populate: selectedRelations,
        select: selectedFields,
        limit,
        offset
      })
    },

    getAvailableRelations({ contentTypeId }) {
      const contentType = strapi.contentTypes[contentTypeId]
      const res = Object.entries(contentType.attributes).reduce((relations, [attributeName, attributeValue]) => {
        if (
          attributeValue.type === 'relation' &&
          isValidRelation({
            attribute: {
              name: attributeName,
              target: attributeValue.target
            },
            includedRelations: '*'
          })
        ) {
          relations.push({
            value: attributeName,
            label: attributeValue.target
          })
        }

        return relations
      }, [])

      return res
    },

    getType(attribute) {
      if (attribute.type === 'relation') {
        if (arrayRelations.includes(attribute.relation)) {
          return OramaTypesMap.collection
        } else {
          return this.getContentTypeSchema({
            contentTypeId: attribute.target,
            includedRelations: []
          })
        }
      }

      return OramaTypesMap[attribute.type]
    },

    getSchemaFromContentTypeAttributes({ attributes, includedRelations }) {
      return Object.entries(attributes).reduce((schema, [attributeName, attributeValue]) => {
        if (
          shouldAttributeBeIncluded(
            {
              type: attributeValue.type,
              name: attributeName,
              target: attributeValue.target
            },
            includedRelations
          )
        ) {
          schema[attributeName] = this.getType(attributeValue)
        }
        return schema
      }, {})
    },

    getContentTypeSchema({ contentTypeId, includedRelations }) {
      const contentType = strapi.contentTypes[contentTypeId]
      return this.getSchemaFromContentTypeAttributes({
        attributes: contentType.attributes,
        includedRelations
      })
    }
  }
}
