import React from 'react'
import { Box, Field, MultiSelect, MultiSelectOption } from '@strapi/design-system'

const RelationsSelect = ({ onChange, collectionRelations, relations = [] }) => (
  <Box style={{ width: '100%' }}>
    <Field.Root id="with_field">
      <Field.Label>Relations</Field.Label>
      <MultiSelect
        placeholder="Select relations.."
        disabled={relations.length === 0}
        onChange={onChange}
        value={collectionRelations}
        withTags
      >
        {relations.map((relation, i) => (
          <MultiSelectOption key={relation.value + i} value={relation.value}>
            {relation.value}
          </MultiSelectOption>
        ))}
      </MultiSelect>
      <Field.Error />
      <Field.Hint />
    </Field.Root>
  </Box>
)

export default RelationsSelect
