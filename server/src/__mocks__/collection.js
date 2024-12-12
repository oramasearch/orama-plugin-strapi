const mockCollection = {
  id: 1,
  entity: 'testEntity',
  indexId: 'testIndexId',
  status: 'outdated',
  searchableAttributes: ['name', 'description'],
  schema: {
    name: { type: 'string' },
    description: { type: 'string' }
  },
  includedRelations: ['relation1', 'relation2']
}

const mockNotValidCollection = {
  id: 1,
  entity: 'testEntity',
  indexId: 'testIndexId',
  status: 'updating',
  searchableAttributes: ['name', 'description'],
  schema: {
    name: { type: 'string' },
    description: { type: 'string' }
  },
  includedRelations: ['relation1', 'relation2']
}

module.exports = {
  mockCollection,
  mockNotValidCollection
}
