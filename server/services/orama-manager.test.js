const { OramaManager } = require('./orama-manager')
const { CloudManager } = require('@oramacloud/client')
const { mockCollection, mockNotValidCollection } = require('../__mocks__/collection')
const { mockedTestRecord } = require('../__mocks__/content-types')

const mockedDocumentTransformer = jest.fn((documents) => documents)

const strapi = {
  plugin: jest.fn().mockReturnThis(),
  service: jest.fn().mockReturnThis(),
  config: {
    get: jest.fn((string) => {
      if (string === 'plugin.orama-cloud.privateApiKey') return 'mockPrivateApiKey'
      if (string === 'plugin.orama-cloud.documentsTransformer') return null
    })
  },
  log: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
  }
}

global.console.error = jest.fn()

const contentTypesService = {
  getEntries: jest
    .fn()
    .mockResolvedValueOnce([{ id: 1, title: 'Test Entry' }])
    .mockResolvedValueOnce([])
}

const collectionService = {
  findOne: jest.fn(),
  updateWithoutHooks: jest.fn()
}

strapi.plugin.mockReturnValue({
  service: jest.fn((serviceName) => {
    if (serviceName === 'contentTypesService') return contentTypesService
    if (serviceName === 'collectionsService') return collectionService
  })
})

const mockedBulkInsertResult = { documents_count: 1 }

describe('OramaManager', () => {
  let oramaManager

  beforeEach(() => {
    oramaManager = new OramaManager({ strapi })

    jest.spyOn(CloudManager.prototype, 'constructor').mockImplementation(() => {})

    jest.spyOn(CloudManager.prototype, 'index').mockReturnValue({
      updateSchema: jest.fn(),
      deploy: jest.fn(),
      snapshot: jest.fn(),
      insert: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(true)
    })

    collectionService.findOne.mockReturnValue(mockCollection)
  })

  describe('validate', () => {
    afterEach(() => {
      strapi.config.get = jest.fn((string) => {
        if (string === 'plugin.orama-cloud.privateApiKey') return 'mockPrivateApiKey'
        if (string === 'plugin.orama-cloud.documentsTransformer') return null
      })
    })

    it('should return false if collection is not found', () => {
      const result = oramaManager.validate(null)

      expect(result).toBe(false)
      expect(strapi.log.error).toHaveBeenCalledWith('Collection not found')
    })

    it('should return false if privateApiKey is not found', () => {
      strapi.config.get = jest.fn((string) => {
        if (string === 'plugin.orama-cloud.privateApiKey') return null
        if (string === 'plugin.orama-cloud.documentsTransformer') return null
      })
      oramaManager = new OramaManager({ strapi })
      const result = oramaManager.validate(mockCollection)

      expect(result).toBe(false)
      expect(strapi.log.error).toHaveBeenCalledWith('Private API key is required to process index updates')
    })

    it('should return false if collection status is updating', () => {
      const result = oramaManager.validate({ ...mockCollection, status: 'updating' })

      expect(result).toBe(false)
      expect(strapi.log.debug).toHaveBeenCalledWith(
        `SKIP: Collection ${mockCollection.entity} with indexId ${mockCollection.indexId} is already updating`
      )
    })

    it('should return false if collection status is updated', () => {
      const result = oramaManager.validate({ ...mockCollection, status: 'updated' })

      expect(result).toBe(false)
      expect(strapi.log.debug).toHaveBeenCalledWith(
        `SKIP: Collection ${mockCollection.entity} with indexId ${mockCollection.indexId} is already updated`
      )
    })

    it('should return true if all validations pass', () => {
      const result = oramaManager.validate(mockCollection)

      expect(result).toBe(true)
    })
  })

  describe('setOutdated', () => {
    it('should update collection status to outdated', async () => {
      await oramaManager.setOutdated(mockCollection)

      expect(collectionService.updateWithoutHooks).toHaveBeenCalledWith(mockCollection.id, {
        status: 'outdated'
      })
    })
  })

  describe('updatingStarted', () => {
    it('should update collection status to updating', async () => {
      await oramaManager.updatingStarted(mockCollection)

      expect(collectionService.updateWithoutHooks).toHaveBeenCalledWith(mockCollection.id, {
        status: 'updating'
      })
    })
  })

  describe('updatingCompleted', () => {
    it('should update collection status to updated', async () => {
      await oramaManager.updatingCompleted(mockCollection, 1)

      expect(collectionService.updateWithoutHooks).toHaveBeenCalledWith(mockCollection.id, {
        status: 'updated',
        deployed_at: expect.any(Date),
        documents_count: 1
      })
    })
  })

  describe('oramaDeployIndex', () => {
    it('should deploy index', async () => {
      const { deploy } = new CloudManager({ strapi }).index()

      await oramaManager.oramaDeployIndex(mockCollection)

      expect(deploy).toHaveBeenCalled()
    })
  })

  describe('resetIndex', () => {
    it('should reset index', async () => {
      const { snapshot } = new CloudManager({ strapi }).index()

      await oramaManager.resetIndex(mockCollection)

      expect(snapshot).toHaveBeenCalled()
    })
  })

  describe('bulkInsert', () => {
    it('should insert entries', async () => {
      const oramaInsertSpy = jest.spyOn(oramaManager, 'oramaInsert').mockResolvedValue()
      const bulkInsertSpy = jest.spyOn(oramaManager, 'bulkInsert')

      await oramaManager.bulkInsert(mockCollection)

      expect(bulkInsertSpy).toHaveBeenNthCalledWith(1, mockCollection)
      expect(oramaInsertSpy).toHaveBeenCalledWith({
        indexId: mockCollection.indexId,
        entries: [{ id: 1, title: 'Test Entry' }]
      })
      expect(bulkInsertSpy).toHaveBeenLastCalledWith(mockCollection, 1)
    })
  })

  describe('oramaUpdateSchema', () => {
    it('should update schema', async () => {
      const { updateSchema } = new CloudManager({ strapi }).index()

      await oramaManager.oramaUpdateSchema(mockCollection)

      expect(updateSchema).toHaveBeenCalled()
    })
  })

  describe('oramaInsert', () => {
    it('should insert entries', async () => {
      const { insert } = new CloudManager({ strapi }).index()

      await oramaManager.oramaInsert({
        indexId: mockCollection.indexId,
        entries: [{ id: 1, title: 'Test Entry' }]
      })

      expect(insert).toHaveBeenCalledWith([{ id: 1, title: 'Test Entry' }])
      expect(mockedDocumentTransformer).not.toHaveBeenCalledWith([{ id: 1, title: 'Test Entry' }])
    })

    it('should call documentsFormatter fn if declared in plugin config', async () => {
      const { insert } = new CloudManager({ strapi }).index()

      await oramaManager.oramaInsert({
        indexId: mockCollection.indexId,
        entries: [{ id: 1, title: 'Test Entry' }]
      })

      expect(insert).toHaveBeenCalledWith([{ id: 1, title: 'Test Entry' }])
      expect(mockedDocumentTransformer).toHaveBeenCalledWith([{ id: 1, title: 'Test Entry' }])
    })

    afterEach(() => {
      strapi.config.get = jest.fn((string) => {
        if (string === 'plugin.orama-cloud.privateApiKey') return 'mockPrivateApiKey'
        if (string === 'plugin.orama-cloud.documentsTransformer') return mockedDocumentTransformer
      })
    })
  })

  describe('oramaUpdate', () => {
    it('should update entries', async () => {
      const { update } = new CloudManager({ strapi }).index()

      await oramaManager.oramaUpdate({
        indexId: mockCollection.indexId,
        entries: [{ id: 1, title: 'Test Entry' }]
      })

      expect(update).toHaveBeenCalledWith([{ id: 1, title: 'Test Entry' }])
    })
  })

  describe('handleDocument', () => {
    it('should return if action is not found', async () => {
      const { insert } = new CloudManager({ strapi }).index()

      await oramaManager.handleDocument({
        indexId: mockCollection.indexId,
        record: mockedTestRecord,
        action: 'unknown'
      })

      expect(insert).not.toHaveBeenCalled()
    })

    it('should return if record is not valid', async () => {
      const { insert, update, delete: cloudManagerDelete } = new CloudManager({ strapi }).index()

      await oramaManager.handleDocument({
        indexId: mockCollection.indexId,
        record: null,
        action: 'unknown'
      })

      expect(insert).not.toHaveBeenCalled()
      expect(update).not.toHaveBeenCalled()
      expect(cloudManagerDelete).not.toHaveBeenCalled()
    })

    it('should return if action is create', async () => {
      const { insert } = new CloudManager({ strapi }).index()

      await oramaManager.handleDocument({
        indexId: mockCollection.indexId,
        record: mockedTestRecord,
        action: 'create'
      })

      expect(insert).toHaveBeenCalledWith([{ id: '1', title: 'Test Entry' }])
    })

    it('should return if action is update', async () => {
      const { update } = new CloudManager({ strapi }).index()

      await oramaManager.handleDocument({
        indexId: mockCollection.indexId,
        record: mockedTestRecord,
        action: 'update'
      })

      expect(update).toHaveBeenCalledWith([{ id: '1', title: 'Test Entry' }])
    })

    it('should return if action is delete', async () => {
      const { delete: deleteFn } = new CloudManager({ strapi }).index()

      await oramaManager.handleDocument({
        indexId: mockCollection.indexId,
        record: mockedTestRecord,
        action: 'delete'
      })

      expect(deleteFn).toHaveBeenCalledWith(['1'])
    })
  })

  describe('processCollection', () => {
    let updatingStartedSpy,
      oramaDeployIndexSpy,
      resetIndexSpy,
      bulkInsertSpy,
      setOutdatedSpy,
      handleDocumentSpy,
      updatingCompletedSpy,
      cloudManager

    beforeEach(() => {
      jest.spyOn(oramaManager, 'validate')
      updatingStartedSpy = jest.spyOn(oramaManager, 'updatingStarted').mockResolvedValue()
      resetIndexSpy = jest.spyOn(oramaManager, 'resetIndex').mockResolvedValue()
      oramaDeployIndexSpy = jest.spyOn(oramaManager, 'oramaDeployIndex').mockResolvedValue()
      bulkInsertSpy = jest.spyOn(oramaManager, 'bulkInsert').mockResolvedValue(mockedBulkInsertResult)
      setOutdatedSpy = jest.spyOn(oramaManager, 'setOutdated').mockResolvedValue()
      handleDocumentSpy = jest.spyOn(oramaManager, 'handleDocument')
      updatingCompletedSpy = jest.spyOn(oramaManager, 'updatingCompleted').mockResolvedValue()
      cloudManager = new CloudManager({ strapi }).index()
    })

    describe('afterCollectionCreationOrUpdate', () => {
      it('should populate index', async () => {
        const { updateSchema, deploy } = cloudManager

        await oramaManager.afterCollectionCreationOrUpdate(mockCollection)

        expect(oramaManager.validate).toHaveBeenCalledWith(mockCollection)
        expect(updatingStartedSpy).toHaveBeenCalledWith(mockCollection)
        expect(resetIndexSpy).toHaveBeenCalledWith(mockCollection)
        expect(updateSchema).toHaveBeenCalledWith({
          indexId: mockCollection.index,
          schema: mockCollection.schema
        })
        expect(oramaDeployIndexSpy).toHaveBeenCalled()
        expect(bulkInsertSpy).toHaveBeenCalledWith(mockCollection)
        expect(updatingCompletedSpy).toHaveBeenCalledWith(mockCollection, mockedBulkInsertResult.documents_count)
      })
      it('should not populate if collection is not valid', async () => {
        collectionService.findOne.mockReturnValueOnce(mockNotValidCollection)
        const { updateSchema, deploy } = cloudManager

        const result = await oramaManager.afterCollectionCreationOrUpdate(mockNotValidCollection)

        expect(oramaManager.validate).toHaveBeenCalledWith(mockNotValidCollection)
        expect(result).toBeUndefined()
        expect(updatingStartedSpy).not.toHaveBeenCalled()
        expect(resetIndexSpy).not.toHaveBeenCalled()
        expect(updateSchema).not.toHaveBeenCalled()
        expect(deploy).not.toHaveBeenCalled()
        expect(bulkInsertSpy).not.toHaveBeenCalled()
        expect(updatingCompletedSpy).not.toHaveBeenCalled()
      })
    })

    describe('deployIndex', () => {
      it('should deploy index', async () => {
        await oramaManager.deployIndex(mockCollection)

        expect(oramaManager.validate).toHaveBeenCalledWith(mockCollection)
        expect(updatingStartedSpy).toHaveBeenCalledWith(mockCollection)
        expect(oramaDeployIndexSpy).toHaveBeenCalledWith(mockCollection)
        expect(updatingCompletedSpy).toHaveBeenCalledWith(mockCollection)
      })
      it('should not deploy index if collection is not valid', async () => {
        collectionService.findOne.mockReturnValueOnce(mockNotValidCollection)

        const result = await oramaManager.deployIndex(mockCollection)

        expect(oramaManager.validate).toHaveBeenCalledWith(mockNotValidCollection)
        expect(result).toBeUndefined()
        expect(updatingStartedSpy).not.toHaveBeenCalledWith()
        expect(oramaDeployIndexSpy).not.toHaveBeenCalledWith()
        expect(updatingCompletedSpy).not.toHaveBeenCalledWith()
      })
    })

    describe('processLiveUpdate', () => {
      it('should process live update', async () => {
        await oramaManager.processLiveUpdate({ id: 1 }, mockedTestRecord, 'create')

        expect(oramaManager.validate).toHaveBeenCalledWith(mockCollection)
        expect(updatingStartedSpy).toHaveBeenCalledWith(mockCollection)
        expect(handleDocumentSpy).toHaveBeenCalledWith({
          indexId: mockCollection.indexId,
          record: mockedTestRecord,
          action: 'create'
        })
        expect(setOutdatedSpy).toHaveBeenCalledWith(mockCollection)
      })

      it('should not process live update if collection is not valid', async () => {
        collectionService.findOne.mockReturnValueOnce(mockNotValidCollection)

        await oramaManager.processLiveUpdate({ id: 1 }, mockedTestRecord, 'create')

        expect(oramaManager.validate).toHaveBeenCalledWith(mockNotValidCollection)
        expect(updatingStartedSpy).not.toHaveBeenCalled()
        expect(handleDocumentSpy).not.toHaveBeenCalled()
        expect(setOutdatedSpy).not.toHaveBeenCalled()
      })

      it('should not process live update if record handling had any issues', async () => {
        collectionService.findOne.mockReturnValueOnce(mockCollection)

        //Force handleDocument to reject
        handleDocumentSpy.mockResolvedValueOnce(false)

        await oramaManager.processLiveUpdate({ id: 1 }, mockedTestRecord, 'create')

        expect(oramaManager.validate).toHaveBeenCalledWith(mockCollection)
        expect(updatingStartedSpy).toHaveBeenCalled()
        expect(handleDocumentSpy).toHaveBeenCalled()
        expect(setOutdatedSpy).toHaveBeenCalled()
      })
    })

    describe('processScheduledUpdate', () => {
      it('should process scheduled update', async () => {
        await oramaManager.processScheduledUpdate({ id: 1 })

        expect(oramaManager.validate).toHaveBeenCalledWith(mockCollection)
        expect(updatingStartedSpy).toHaveBeenCalledWith(mockCollection)
        expect(resetIndexSpy).toHaveBeenCalledWith(mockCollection)
        expect(bulkInsertSpy).toHaveBeenCalledWith(mockCollection)
        expect(updatingCompletedSpy).toHaveBeenCalledWith(mockCollection, mockedBulkInsertResult.documents_count)
      })

      it('should not process scheduled update if collection is not valid', async () => {
        collectionService.findOne.mockReturnValueOnce(mockNotValidCollection)

        await oramaManager.processScheduledUpdate({ id: 1 })

        expect(oramaManager.validate).toHaveBeenCalledWith(mockNotValidCollection)
        expect(updatingStartedSpy).not.toHaveBeenCalled()
        expect(resetIndexSpy).not.toHaveBeenCalled()
        expect(bulkInsertSpy).not.toHaveBeenCalled()
        expect(updatingCompletedSpy).not.toHaveBeenCalled()
      })
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })
})
