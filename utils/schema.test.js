const { getSchemaFromAttributes, getSelectedAttributesFromSchema, getSchemaFromEntryStructure } = require('./schema')

describe('Schema Utils', () => {
  describe('getSchemaFromAttributes', () => {
    it('should return the correct schema for flat attributes', () => {
      const attributes = ['name', 'age']
      const schema = {
        name: { type: 'string' },
        age: { type: 'number' },
        address: { type: 'object' }
      }
      const result = getSchemaFromAttributes({ attributes, schema })
      expect(result).toEqual({
        name: { type: 'string' },
        age: { type: 'number' }
      })
    })

    it('should return the correct schema for nested attributes', () => {
      const attributes = ['address.city', 'address.zip']
      const schema = {
        address: {
          city: { type: 'string' },
          zip: { type: 'number' },
          street: { type: 'string' }
        }
      }
      const result = getSchemaFromAttributes({ attributes, schema })
      expect(result).toEqual({
        address: {
          city: { type: 'string' },
          zip: { type: 'number' }
        }
      })
    })
  })

  describe('getSelectedAttributesFromSchema', () => {
    it('should return the correct list of attributes for flat schema', () => {
      const schema = {
        name: 'string',
        age: 'number'
      }
      const result = getSelectedAttributesFromSchema({ schema })
      expect(result).toEqual(['name', 'age'])
    })

    it('should return the correct list of attributes for nested schema', () => {
      const schema = {
        address: {
          city: 'string',
          zip: 'number'
        }
      }
      const result = getSelectedAttributesFromSchema({ schema })
      expect(result).toEqual(['address.city', 'address.zip'])
    })
  })

  describe('getSchemaFromEntryStructure', () => {
    it('should return the correct schema', () => {
      const entry = {
        potato: 'hello',
        apple: 5,
        watermelon: {
          seeds: {
            many: true
          }
        },
        banana: ['yellow', 'green']
      }
      const result = getSchemaFromEntryStructure(entry)

      expect(result).toEqual({
        potato: 'string',
        apple: 'number',
        watermelon: { seeds: { many: 'boolean' } },
        banana: 'string[]'
      })
    })
  })
})
