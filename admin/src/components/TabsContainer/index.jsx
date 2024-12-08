import React, { useRef } from 'react'
import { Tabs, Divider, Box } from '@strapi/design-system'

export const TabsContainer = ({ tabs }) => {
  const tabGroupRef = useRef()

  return (
    <Tabs.Root
      label="todo"
      id="tabs"
      variant="simple"
      style={{ marginTop: -24 }}
      ref={tabGroupRef}
      defaultValue={tabs[0].id}
    >
      <Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Trigger key={tab.id} value={tab.id}>
            {tab.title}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Divider />

      <Box paddingTop={6}>
        {tabs.map((tab) => (
          <Tabs.Content key={tab.id} value={tab.id}>
            {tab.content}
          </Tabs.Content>
        ))}
      </Box>
    </Tabs.Root>
  )
}
