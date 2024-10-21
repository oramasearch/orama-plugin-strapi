import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Flex,
  HeaderLayout,
  LinkButton,
  Loader,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  Layout,
  ContentLayout,
  Typography,
  Status
} from '@strapi/design-system'
import { ExternalLink, Plus } from '@strapi/icons'
import { useFetchClient, useNotification } from '@strapi/helper-plugin'
import CollectionsTable from '../../components/CollectionsTable'
import pluginId from '../../pluginId'
import CollectionForm from '../../components/CollectionForm'

const isValidCollection = (collection) => {
  if (!collection.schema || Object.keys(collection.schema).length === 0) {
    return {
      error: 'Select at least one attribute'
    }
  }

  if (!collection.searchableAttributes || collection.searchableAttributes.length === 0) {
    return {
      error: 'Select at least one searchable attribute'
    }
  }

  if (collection.indexId?.length === 0) {
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
  const toggleNotification = useNotification()

  const fetchData = () => {
    get(`/${pluginId}/collections`)
      .then((response) => setCollections(response.data))
      .then(() => setIsLoading(false))
      .catch((err) => {
        console.error('Failed to load collections.', err)
        toggleNotification({
          type: 'warning',
          message: 'Failed to load collections.'
        })
      })

    get(`/${pluginId}/content-types`)
      .then((response) => setContentTypes(response.data))
      .then(() => setIsLoading(false))
      .catch((err) => {
        console.error('Failed to load collections.', err)
        toggleNotification({
          type: 'warning',
          message: 'Failed to load content types.'
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

      if (contentType?.availableRelations.length === 0) {
        setCurrentCollection({
          ...currentCollection,
          includedRelations: []
        })
      }
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
    if (!isValidCollection(currentCollection)) {
      return onValidateError()
    }

    setIsSaving(true)

    try {
      const newCollection = await post(`/${pluginId}/collections`, currentCollection)
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
    const { error } = isValidCollection(currentCollection)
    if (error) {
      return onValidateError(error)
    }

    setIsSaving(true)
    try {
      const collection = await put(`/${pluginId}/collections/${currentCollection.id}`, currentCollection)
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
      await del(`/${pluginId}/collections/${currentCollection.id}`)
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
      await post(`/${pluginId}/collections/${currentCollection.id}/deploy`)
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
    <Layout sideNav={null}>
      <HeaderLayout
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
      <ContentLayout>
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
                <ModalLayout
                  style={{ maxWidth: '700px' }}
                  onClose={() => {
                    setIsModalVisible(false)
                    setCurrentCollection(null)
                    setCurrentContentType(null)
                  }}
                  labelledBy="edit-collection-modal"
                >
                  <ModalHeader>
                    <Typography>Edit Collection</Typography>
                  </ModalHeader>
                  <ModalBody>
                    <CollectionForm
                      collection={currentCollection}
                      contentTypeOptions={contentTypes}
                      currentContentType={currentContentType}
                      editMode={formEditMode}
                      onFieldChange={handleChange}
                      onRelationsChange={handleRelationsChange}
                      onSchemaChange={handleSchemaChange}
                    />
                  </ModalBody>
                  <ModalFooter
                    startActions={
                      formEditMode ? (
                        <Button onClick={handleDelete} variant="danger-light">
                          Delete collection
                        </Button>
                      ) : (
                        <Button onClick={() => setIsModalVisible(false)} variant="tertiary">
                          Cancel
                        </Button>
                      )
                    }
                    endActions={
                      formEditMode ? (
                        <>
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
                        </>
                      ) : (
                        <Button onClick={handleCreate} loading={isSaving}>
                          Create
                        </Button>
                      )
                    }
                  />
                </ModalLayout>
              )}
              {showConfirmationModal && (
                <ModalLayout
                  width="small"
                  onClose={() => setShowConfirmationModal(false)}
                  labelledBy="confirmation-modal"
                >
                  <ModalHeader>
                    <Typography>Deploy</Typography>
                  </ModalHeader>
                  <ModalBody>
                    <Box>
                      <Typography>
                        By doing a manual deploy, your index will be updated immediately
                        <br />
                        with the most recent data from your Content-Type{' '}
                        <Flex inline>
                          <Status variant="secondary" size="S" showBullet={false}>
                            <Typography>{currentCollection.entity}</Typography>
                          </Status>
                        </Flex>
                        <br />
                        Do you want to proceed?
                      </Typography>
                    </Box>
                  </ModalBody>
                  <ModalFooter
                    startActions={
                      <Button onClick={() => setShowConfirmationModal(false)} variant="tertiary">
                        Cancel
                      </Button>
                    }
                    endActions={
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
                    }
                  />
                </ModalLayout>
              )}
            </>
          )}
        </Box>
      </ContentLayout>
    </Layout>
  )
}

export default HomePage
