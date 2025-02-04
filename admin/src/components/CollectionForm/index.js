import {
  Box,
  Divider,
  Flex,
  Radio,
  RadioGroup,
  SingleSelect,
  SingleSelectOption,
  Checkbox,
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
              <Flex gap={4} style={{ width: "100%" }}>
                <Box style={{ flexGrow: 1 }}>
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
                </Box>
                <Box>
                  <Flex direction="column" alignItems="center">
                    <Typography variant="beta" style={{ fontSize: "0.75rem" }}>Include drafts?</Typography>
                    <Checkbox
                      checked={collection.includeDrafts}
                      onChange={() => onFieldChange({ name: 'includeDrafts', value: !collection.includeDrafts })}
                      style={{ margin: '16px 0px 28px 0' }}
                    />
                  </Flex>
                </Box>
              </Flex>
              <Flex alignItems="flex-start" justifyContent="space-between" style={{ width: '100%' }}>
                <Flex flexShrink={1} style={{ width: '49%' }}>
                  <SingleSelect
                    required
                    onChange={(value) => onFieldChange({ name: 'entity', value })}
                    label="Content Type"
                    placeholder="Content Type"
                    name="entity"
                    id="entity"
                    hint="Choose the Content Type you want to map with your index on Orama Cloud."
                    value={collection?.entity}
                  >
                    {contentTypeOptions?.length > 0 &&
                      contentTypeOptions.map((ct, i) => (
                        <SingleSelectOption key={i} value={ct.value}>
                          {ct.label}
                        </SingleSelectOption>
                      ))}
                  </SingleSelect>
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
                <RadioGroup
                  labelledBy="updateHook"
                  name="updateHook"
                  id="updateHook"
                  size="L"
                  onChange={(e) => onFieldChange({ name: 'updateHook', value: e.target.value })}
                  value={collection?.updateHook || 'live'}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <Radio value="live">Live update</Radio>
                  </div>
                  <div>
                    <Radio value="cron">Scheduled job</Radio>
                  </div>
                </RadioGroup>
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
                  <SingleSelect
                    required
                    onChange={(value) => onFieldChange({ name: 'updateCron', value })}
                    label="Deploy Frequency"
                    placeholder="Set deploy frequency"
                    name="updateCron"
                    id="updateCron"
                    hint="Set the frequency to update your index."
                    value={collection?.updateCron || '0 * * * *'}
                  >
                    {cronSettings.map((option, i) => (
                      <SingleSelectOption key={i} value={option.value}>
                        {option.label}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
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
