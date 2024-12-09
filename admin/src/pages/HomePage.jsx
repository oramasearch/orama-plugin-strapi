import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { Box, Button, Flex, LinkButton, Loader, Modal, Typography, Status } from '@strapi/design-system'
import { Page, Layouts } from '@strapi/strapi/admin'
import { ExternalLink, Plus } from '@strapi/icons'
import { useFetchClient, useNotification } from '@strapi/strapi/admin'
import { PLUGIN_ID } from '../pluginId'
import CollectionsTable from '../components/CollectionsTable'
import CollectionForm from '../components/CollectionForm'

const isValidCollection = (collections, newCollection) => {
  if (collections.filter((col) => col.indexId === newCollection.indexId).length > 1) {
    return {
      error: 'Index ID must be unique'
    }
  }

  if (
    !newCollection.schema ||
    Object.keys(newCollection.schema).length === 0 ||
    !newCollection.searchableAttributes ||
    newCollection.searchableAttributes.length === 0
  ) {
    return {
      error: 'Select at least one searchable attribute'
    }
  }

  if (newCollection.indexId?.length === 0) {
    return {
      error: 'Index ID is required'
    }
  }

  return {
    error: false
  }
}

const HomePage = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [contentTypes, setContentTypes] = useState([])
  const [collections, setCollections] = useState([])
  const [currentContentType, setCurrentContentType] = useState(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [currentCollection, setCurrentCollection] = useState(null)
  const [formEditMode, setFormEditMode] = useState(false)
  const { get, post, put, del } = useFetchClient()
  const { toggleNotification } = useNotification()

  const fetchData = () => {
    get(`/${PLUGIN_ID}/collections`)
      .then((response) => setCollections(response.data))
      .then(() => setIsLoading(false))
      .catch((err) => {
        console.error('Failed to load collections.', err)
        toggleNotification({
          type: 'warning',
          defaultdefaultMessage: 'Failed to load collections.'
        })
      })

    get(`/${PLUGIN_ID}/content-types`)
      .then((response) => setContentTypes(response.data))
      .then(() => setIsLoading(false))
      .catch((err) => {
        console.error('Failed to load collections.', err)
        toggleNotification({
          type: 'warning',
          defaultdefaultMessage: 'Failed to load content types.'
        })
      })
  }

  useEffect(() => {
    fetchData()
    const intervalId = setInterval(fetchData, 5000)

    return () => clearInterval(intervalId)
  }, [get])

  useEffect(() => {
    if (currentCollection) {
      const contentType = contentTypes.find((ct) => ct.value === currentCollection.entity)
      setCurrentContentType(contentType)
    }
  }, [currentCollection])

  const handleCreateClick = () => {
    setCurrentCollection({
      indexId: '',
      entity: undefined,
      includedRelations: [],
      searchableAttributes: [],
      schema: {},
      status: 'outdated',
      updateHook: 'live',
      updateCron: '0 * * * *',
      deployedAt: undefined
    })
    setFormEditMode(false)
    setIsModalVisible(true)
  }

  const handleEditClick = (collection) => {
    setCurrentCollection(collection)
    setFormEditMode(true)
    setIsModalVisible(true)
  }

  const handleDeployClick = (collection) => {
    setCurrentCollection(collection)
    setShowConfirmationModal(true)
  }

  const handleChange = ({ name, value }) => {
    setCurrentCollection({ ...currentCollection, [name]: value })
  }

  const handleRelationsChange = (relations) => {
    setCurrentCollection({
      ...currentCollection,
      includedRelations: relations
    })
  }

  const handleSchemaChange = ({ schema, searchableAttributes }) => {
    setCurrentCollection({
      ...currentCollection,
      schema,
      searchableAttributes
    })
  }

  const onValidateError = (error) => {
    toggleNotification({
      type: 'warning',
      message: error
    })
  }

  const handleCreate = async () => {
    const { error } = isValidCollection(collections, currentCollection)

    if (error) {
      return onValidateError(error)
    }

    setIsSaving(true)

    try {
      const newCollection = await post(`/${PLUGIN_ID}/collections`, currentCollection)
      toggleNotification({
        type: 'success',
        message: 'Collection created successfully.'
      })
      setCollections((prevCollections) => [...prevCollections, newCollection.data])
      setIsModalVisible(false)
    } catch (err) {
      console.error(err)
      toggleNotification({
        type: 'warning',
        message: 'Failed to create collection.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async () => {
    const { error } = isValidCollection(collections, currentCollection)

    if (error) {
      return onValidateError(error)
    }

    setIsSaving(true)
    try {
      const collection = await put(`/${PLUGIN_ID}/collections/${currentCollection.documentId}`, currentCollection)
      toggleNotification({
        type: 'success',
        message: 'Collection updated successfully.'
      })
      setCollections((prevCollections) =>
        prevCollections.map((col) => (col.id === collection.data?.id ? collection.data : col))
      )
      setIsModalVisible(false)
    } catch (err) {
      console.error(err)
      toggleNotification({
        type: 'warning',
        message: 'Failed to update collection.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsModalVisible(false)
    try {
      await del(`/${PLUGIN_ID}/collections/${currentCollection.documentId}`)
      toggleNotification({
        type: 'success',
        message: 'Collection deleted successfully.'
      })
      setCollections((prevCollections) => prevCollections.filter((col) => col.id !== currentCollection.id))
    } catch (err) {
      console.error(err)
      toggleNotification({
        type: 'warning',
        message: 'Failed to delete collection.'
      })
    }
  }

  const handleDeploy = async () => {
    setShowConfirmationModal(false)
    try {
      await post(`/${PLUGIN_ID}/collections/${currentCollection.documentId}/deploy`)
      toggleNotification({
        type: 'success',
        message: 'Collection deployment started.'
      })
    } catch (err) {
      console.error(err)
      toggleNotification({
        type: 'warning',
        message: 'Failed to deploy collection.'
      })
    }
  }

  return (
    <Page.Main>
      <Layouts.Header
        title="Orama Cloud"
        subtitle="Manage collections to sync content types with your indexes on Orama Cloud."
        as="h2"
        primaryAction={
          <Flex gap={2}>
            {isLoading ? null : (
              <>
                <Button startIcon={<Plus />} size="L" onClick={handleCreateClick}>
                  Add collection
                </Button>
                <LinkButton
                  href="https://cloud.orama.com/indexes"
                  isExternal
                  endIcon={<ExternalLink />}
                  size="L"
                  variant="secondary"
                  style={{ whiteSpace: 'nowrap', textDecoration: 'none' }}
                >
                  View indexes
                </LinkButton>
              </>
            )}
          </Flex>
        }
      />
      <Layouts.Content>
        <Box background="neutral">
          {isLoading ? (
            <Flex justifyContent="center">
              <Loader>Loading content...</Loader>
            </Flex>
          ) : (
            <>
              <CollectionsTable
                collections={collections}
                onEditAction={handleEditClick}
                onDeployAction={handleDeployClick}
                onCreateAction={handleCreateClick}
              />
              {isModalVisible && (
                <Modal.Root
                  open={isModalVisible}
                  style={{ maxWidth: '700px' }}
                  onOpenChange={(isOpen) => {
                    if (!isOpen) {
                      setIsModalVisible(false)
                      setCurrentCollection(null)
                      setCurrentContentType(null)
                    }
                  }}
                  labelledBy="edit-collection-modal"
                >
                  <Modal.Content>
                    <Modal.Header>
                      <Modal.Title>Edit Collection</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <CollectionForm
                        collection={currentCollection}
                        contentTypeOptions={contentTypes}
                        currentContentType={currentContentType}
                        editMode={formEditMode}
                        onFieldChange={handleChange}
                        onRelationsChange={handleRelationsChange}
                        onSchemaChange={handleSchemaChange}
                      />
                    </Modal.Body>
                    <Modal.Footer>
                      {formEditMode ? (
                        <Flex justifyContent="space-between" grow={1}>
                          <Flex>
                            {formEditMode ? (
                              <Button onClick={handleDelete} variant="danger-light">
                                Delete collection
                              </Button>
                            ) : (
                              <Button onClick={() => setIsModalVisible(false)} variant="tertiary">
                                Cancel
                              </Button>
                            )}
                          </Flex>
                          <Flex gap={4}>
                            <LinkButton
                              href={`https://cloud.orama.com/indexes/view/${currentCollection.indexId}`}
                              isExternal
                              endIcon={<ExternalLink width={10} />}
                              variant="tertiary"
                              style={{
                                whiteSpace: 'nowrap',
                                textDecoration: 'none'
                              }}
                            >
                              View index
                            </LinkButton>
                            <Button onClick={handleUpdate} loading={isSaving}>
                              Update
                            </Button>
                          </Flex>
                        </Flex>
                      ) : (
                        <Flex justifyContent="flex-end" grow={1}>
                          <Button onClick={handleCreate} loading={isSaving}>
                            Create
                          </Button>
                        </Flex>
                      )}
                    </Modal.Footer>
                  </Modal.Content>
                </Modal.Root>
              )}
              {showConfirmationModal && (
                <Modal.Root
                  open={showConfirmationModal}
                  width="small"
                  onOpenChange={() => setShowConfirmationModal(false)}
                  labelledBy="confirmation-modal"
                >
                  <Modal.Content>
                    <Modal.Header>
                      <Typography>Deploy</Typography>
                    </Modal.Header>
                    <Modal.Body>
                      <Box>
                        <Typography>
                          By doing a manual deploy, your index will be updated immediately
                          <br />
                          with the most recent data from your Content-Type{' '}
                          <Flex inline>
                            <Status variant="secondary" size="S">
                              <Typography>{currentCollection.entity}</Typography>
                            </Status>
                          </Flex>
                          <br />
                          Do you want to proceed?
                        </Typography>
                      </Box>
                    </Modal.Body>
                    <Modal.Footer>
                      <Flex justifyContent="space-between">
                        <Button onClick={() => setShowConfirmationModal(false)} variant="tertiary">
                          Cancel
                        </Button>
                      </Flex>
                      <Flex gap={2}>
                        <LinkButton
                          href={`https://cloud.orama.com/indexes/view/${currentCollection.indexId}`}
                          isExternal
                          endIcon={<ExternalLink width={10} />}
                          variant="tertiary"
                          style={{
                            whiteSpace: 'nowrap',
                            textDecoration: 'none'
                          }}
                        >
                          View index
                        </LinkButton>
                        <Button onClick={handleDeploy} variant="primary">
                          Deploy now
                        </Button>
                      </Flex>
                    </Modal.Footer>
                  </Modal.Content>
                </Modal.Root>
              )}
            </>
          )}
        </Box>
      </Layouts.Content>
    </Page.Main>
  )
}

export { HomePage }
