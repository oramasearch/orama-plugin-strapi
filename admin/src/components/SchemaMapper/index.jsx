import React from 'react'
import {
  Box,
  Checkbox,
  Flex,
  Switch,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  Typography
} from '@strapi/design-system'
import WarningIcon from '../WarningIcon'
import { getSelectedPropsFromObj, getSelectedAttributesFromSchema } from '../../../../utils/schema'

const isCollection = (value) => Array.isArray(value) && value.length > 0 && typeof value[0] === 'object'

const handleObjectField = (acc, fieldKey, fieldValue, relations) => {
  if (relations.includes(fieldKey)) {
    Object.keys(fieldValue).forEach((key) => acc.push(`${fieldKey}.${key}`))
  }
}

const handleCollectionField = (acc, fieldKey, fieldValue, relations) => {
  if (relations.includes(fieldKey)) {
    acc.push(fieldKey)
  }
}

const generateSelectableAttributesFromSchema = ({ schema, relations }) => {
  const handlers = {
    object: handleObjectField,
    collection: handleCollectionField
  }

  return Object.entries(schema).reduce((acc, [fieldKey, fieldValue]) => {
    const fieldType = fieldValue === 'collection' ? 'collection' : typeof fieldValue

    if (fieldType in handlers) {
      handlers[fieldType](acc, fieldKey, fieldValue, relations)
    } else if (!isCollection(fieldValue)) {
      acc.push(fieldKey)
    }

    return acc
  }, [])
}

const SchemaMapper = ({ collection, contentTypeSchema, onSchemaChange }) => {
  const [selectedAttributes, setSelectedAttributes] = React.useState(
    getSelectedAttributesFromSchema({
      schema: collection?.schema
    })
  )
  const [searchableAttributes, setSearchableAttributes] = React.useState(collection?.searchableAttributes || [])

  const schemaAttributes = generateSelectableAttributesFromSchema({
    schema: contentTypeSchema,
    relations: collection?.includedRelations
  })

  React.useEffect(() => {
    const schema = getSelectedPropsFromObj({
      props: selectedAttributes,
      obj: contentTypeSchema
    })

    onSchemaChange({ schema, searchableAttributes })
  }, [searchableAttributes, selectedAttributes])

  const isChecked = (field) => {
    return selectedAttributes.includes(field)
  }

  const handleCheck = (field) => {
    if (selectedAttributes.includes(field)) {
      setSelectedAttributes(selectedAttributes.filter((f) => f !== field))
      if (searchableAttributes.includes(field)) {
        setSearchableAttributes(searchableAttributes.filter((f) => f !== field))
      }
    } else {
      setSelectedAttributes([...selectedAttributes, field])
    }
  }

  const isSearchableSelected = (field) => {
    return searchableAttributes.includes(field)
  }

  const handleSearchable = (field) => {
    if (!isChecked(field)) {
      return
    }

    if (searchableAttributes.includes(field)) {
      setSearchableAttributes(searchableAttributes.filter((f) => f !== field))
    } else {
      setSearchableAttributes([...searchableAttributes, field])
    }
  }

  const selectAllAttributes = () => {
    if (selectedAttributes.length === schemaAttributes.length) {
      setSelectedAttributes([])
      setSearchableAttributes([])
    } else {
      setSelectedAttributes(schemaAttributes)
    }
  }

  return (
    <Box marginBottom={2} width="100%">
      <Typography variant="beta" fontWeight="bold">
        Attributes Mapping<b style={{ color: '#ee5e52' }}>*</b>
      </Typography>
      <Flex style={{ marginBottom: 16, marginTop: 4 }}>
        <Typography variant="gamma" color="grey-600">
          Select the attributes you want to include in your Orama Cloud index document.
        </Typography>
      </Flex>
      <Box>
        <Table colCount={3} rowCount={schemaAttributes.length}>
          <Thead>
            <Tr>
              <Th>
                <Checkbox
                  aria-label="Select all entries"
                  checked={selectedAttributes.length === schemaAttributes.length}
                  onChange={() => selectAllAttributes()}
                />
              </Th>
              <Th style={{ minWidth: '300px' }}>
                <Typography variant="sigma">Attribute</Typography>
              </Th>
              <Th>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    width: '100%'
                  }}
                >
                  <Typography variant="sigma">Searchable</Typography>
                </div>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {schemaAttributes.map((field) => (
              <Tr key={field}>
                <Td>
                  <Checkbox checked={isChecked(field)} onChange={() => handleCheck(field)} />
                </Td>
                <Td
                  onClick={() => handleCheck(field)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Typography textColor="neutral800">{field}</Typography>
                  {contentTypeSchema[field] === 'collection' && (
                    <>
                      <Tooltip label="This attribute needs work through a documentsTransformer">
                        <a href="https://docs.orama.com/cloud/data-sources/native-integrations/strapi" target="_blank">
                          <WarningIcon size={16} fill="#ddaa00" style={{ margin: '5px 0 0 5px' }} />
                        </a>
                      </Tooltip>
                    </>
                  )}
                </Td>
                <Td>
                  <Flex justifyContent="flex-end">
                    <Switch selected={isSearchableSelected(field)} onChange={() => handleSearchable(field)} />
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  )
}

export default SchemaMapper
