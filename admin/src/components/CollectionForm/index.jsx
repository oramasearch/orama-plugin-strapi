import {
  Box,
  Checkbox,
  Divider,
  Field,
  Flex,
  Radio,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography
} from '@strapi/design-system'
import React, { memo, useEffect, useState } from 'react'
import RelationsSelect from '../RelationsSelect'
import SchemaMapper from '../SchemaMapper'
import cronSettings from '../../utils/cronSettings'
import { TabsContainer } from '../TabsContainer'

const CollectionForm = ({
  collection,
  contentTypeOptions,
  currentContentType,
  onFieldChange,
  onRelationsChange,
  onSchemaChange
}) => {
  const [nextRun, setNextRun] = useState('on content update')
  const [cronUpdates, setCronUpdates] = useState(collection?.updateHook === 'cron')

  useEffect(() => {
    if (collection?.updateHook === 'cron' && collection?.updateCron) {
      const cronSetting = cronSettings.find((setting) => setting.value === collection.updateCron)
      if (cronSetting) {
        setCronUpdates(true)
        setNextRun(cronSetting.getNextRun().toLocaleString())
      }
    } else {
      setCronUpdates(false)
      setNextRun('on content update')
    }
  }, [collection?.updateHook, collection?.updateCron])

  return (
    <TabsContainer
      tabs={[
        {
          id: 'general',
          title: 'General',
          content: (
            <Flex direction="column" alignItems="flex-start" gap={6}>
              <Flex gap={4} style={{ width: '100%' }}>
                <Box style={{ flexGrow: 1 }}>
                  <Field.Root id="with_field" style={{ width: '100%' }}>
                    <Field.Label>Index ID</Field.Label>
                    <TextInput
                      required
                      onChange={(e) => onFieldChange({ name: 'indexId', value: e.target.value })}
                      label="Index ID"
                      placeholder="Orama Cloud Index ID"
                      name="indexId"
                      id="indexId"
                      hint="Your Orama Cloud Index ID. Go to Orama Dashboard > Indexes to find it."
                      style={{ width: '100%' }}
                      value={collection?.indexId}
                    />
                    <Field.Error />
                    <Field.Hint />
                  </Field.Root>
                </Box>
                <Box>
                  <Field.Root id="with_field" style={{ display: 'flex', alignItems: 'center' }}>
                    <Field.Label>Include drafts?</Field.Label>
                    <Checkbox
                      checked={collection.includeDrafts}
                      onClick={() => onFieldChange({ name: 'includeDrafts', value: !collection.includeDrafts })}
                      style={{ margin: '8px 0px 10px' }}
                    />
                  </Field.Root>
                </Box>
              </Flex>
              <Flex alignItems="flex-start" justifyContent="space-between" style={{ width: '100%' }}>
                <Flex style={{ width: '49%' }}>
                  <Field.Root id="with_field" style={{ width: '100%' }}>
                    <Field.Label>Content Type</Field.Label>
                    <SingleSelect
                      required
                      onValueChange={(value) => onFieldChange({ name: 'entity', value })}
                      label="Content Type"
                      placeholder="Content Type"
                      name="entity"
                      id="entity"
                      hint="Choose the Content Type you want to map with your index on Orama Cloud."
                      style={{ width: '100%' }}
                      value={collection?.entity}
                    >
                      {contentTypeOptions?.length > 0 &&
                        contentTypeOptions.map((ct, i) => (
                          <SingleSelectOption key={i} value={ct.value}>
                            {ct.label}
                          </SingleSelectOption>
                        ))}
                    </SingleSelect>
                    <Field.Error />
                    <Field.Hint />
                  </Field.Root>
                </Flex>
                <Flex direction="column" alignItems="flex-start" style={{ width: '49%' }}>
                  <RelationsSelect
                    relations={currentContentType?.availableRelations}
                    collectionRelations={collection?.includedRelations}
                    onChange={onRelationsChange}
                  />
                </Flex>
              </Flex>
              {currentContentType?.schema && (
                <>
                  <Divider style={{ width: '100%' }} />
                  <Flex alignItems="flex-start" gap={4} style={{ width: '100%' }}>
                    <SchemaMapper
                      collection={collection}
                      contentTypeSchema={currentContentType?.schema}
                      onSchemaChange={onSchemaChange}
                    />
                  </Flex>
                </>
              )}
            </Flex>
          )
        },
        {
          id: 'update-settings',
          title: 'Update Settings',
          content: (
            <Flex alignItems="flex-start" justifyContent="flex-start">
              <Box width="100%">
                <Box marginBottom={2}>
                  <Typography variant="pi" fontWeight="bold">
                    Update Hook
                  </Typography>
                </Box>
                <Radio.Group
                  name="updateHook"
                  id="updateHook"
                  size="L"
                  onValueChange={(value) => onFieldChange({ name: 'updateHook', value })}
                  value={collection?.updateHook || 'live'}
                >
                  <Radio.Item value="live">Live update</Radio.Item>
                  <Radio.Item value="cron">Scheduled job</Radio.Item>
                </Radio.Group>
              </Box>
              <Box width="100%">
                <Box>
                  <Box marginBottom={1}>
                    <Typography variant="pi" fontWeight="bold">
                      Next run
                    </Typography>
                  </Box>
                  <Typography variant="omega">{nextRun}</Typography>
                </Box>
                <Box paddingTop={4} style={{ opacity: cronUpdates ? 1 : 0 }}>
                  <Field.Root name="update-settings">
                    <Field.Label>Deploy Frequency</Field.Label>
                    <SingleSelect
                      required
                      onChange={(value) => onFieldChange({ name: 'updateCron', value })}
                      name="updateCron"
                      id="updateCron"
                      hint="Set the frequency to update your index."
                      value={collection?.updateCron || '0 * * * *'}
                      defaultValue={collection?.updateCron || '0 * * * *'}
                    >
                      {cronSettings.map((option, i) => (
                        <SingleSelectOption key={i} value={option.value}>
                          {option.label}
                        </SingleSelectOption>
                      ))}
                    </SingleSelect>
                  </Field.Root>
                </Box>
              </Box>
            </Flex>
          )
        }
      ]}
    />
  )
}

export default memo(CollectionForm)
