const getSchemaFromAttributes = ({ attributes, schema }) => {
  return attributes.reduce((acc, field) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      if (!acc[parent]) {
        acc[parent] = {}
      }

      acc[parent][child] = schema[parent][child]
    } else {
      acc[field] = schema[field]
    }
    return acc
  }, {})
}

const getSelectedAttributesFromSchema = ({ schema }) => {
  return Object.entries(schema).reduce((acc, [fieldKey, fieldValue]) => {
    if (typeof fieldValue === 'object') {
      Object.keys(fieldValue).forEach((key) => acc.push(`${fieldKey}.${key}`))
    } else {
      acc.push(fieldKey)
    }
    return acc
  }, [])
}

const getSchemaFromEntryStructure = (entry) => {
  return Object.entries(entry).reduce((acc, [key, value]) => {
    if (Array.isArray(value)) {
      const firstValue = value[0]
      if (['string', 'number', 'boolean'].includes(typeof firstValue)) {
        acc[key] = `${typeof firstValue}[]`
      }
    } else if (typeof value === 'object') {
      acc[key] = getSchemaFromEntryStructure(value)
    } else {
      acc[key] = typeof value
    }
    return acc
  }, {})
}

module.exports = {
  getSchemaFromAttributes,
  getSelectedAttributesFromSchema,
  getSchemaFromEntryStructure
}
