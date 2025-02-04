const contentTypesServiceInit = require('./content-types')
const { mockedContentTypes, expectedContentTypes } = require('../__mocks__/content-types')

const strapi = {
  contentTypes: mockedContentTypes,
  query: jest.fn().mockReturnThis(),
  findMany: jest.fn()
}

const contentTypesService = contentTypesServiceInit({ strapi })

describe('contentTypesService', () => {
  describe('getContentTypes', () => {
    it('should return an array of content types', async () => {
      const contentTypes = contentTypesService.getContentTypes()

      expect(contentTypes).toBeInstanceOf(Array)
      expect(contentTypes).toHaveLength(2)
      expect(contentTypes).toStrictEqual(expectedContentTypes)
    })
  })

  describe('getEntries', () => {
    it('should fetch entries for a given content type', async () => {
      const mockEntries = [{ id: 1, title: 'Test Entry' }]
      strapi.query().findMany.mockResolvedValue(mockEntries)

      const params = {
        contentType: 'api::blog-post.blog-post',
        relations: [],
        schema: { title: 'string' },
        offset: 0,
        limit: 50
      }

      const entries = await contentTypesService.getEntries(params)

      expect(strapi.query).toHaveBeenCalledWith('api::blog-post.blog-post')
      expect(strapi.query().findMany).toHaveBeenCalledWith({
        populate: {},
        select: ['id', 'title'],
        limit: 50,
        offset: 0
      })
      expect(entries).toEqual(mockEntries)
    })

    it('should fetch entries with relations', async () => {
      const mockEntries = [{ id: 1, title: 'Test Entry', author: { name: 'Author' } }]
      strapi.query().findMany.mockResolvedValue(mockEntries)

      const params = {
        contentType: 'api::blog-post.blog-post',
        relations: ['author'],
        schema: { title: 'string', author: { name: 'string' } },
        offset: 0,
        limit: 50
      }

      const entries = await contentTypesService.getEntries(params)

      expect(strapi.query).toHaveBeenCalledWith('api::blog-post.blog-post')
      expect(strapi.query().findMany).toHaveBeenCalledWith({
        populate: { author: { select: ['name'] } },
        select: ['id', 'title'],
        limit: 50,
        offset: 0
      })
      expect(entries).toEqual(mockEntries)
    })

    it('should fetch only published entries if includeDrafts is false', async () => {
      const mockEntries = [
        { id: 1, title: 'Test Entry', author: { name: 'Author' }, publishedAt: '2021-01-01' },
        { id: 2, title: 'Test Entry (draft)', author: { name: 'Mario' }, publishedAt: null }
      ]
      strapi.query().findMany.mockResolvedValue(mockEntries)

      const params = {
        contentType: 'api::blog-post.blog-post',
        relations: ['author'],
        schema: { title: 'string', author: { name: 'string' } },
        where: {
          publishedAt: {
            $ne: null
          }
        },
        offset: 0,
        limit: 50
      }

      const entries = await contentTypesService.getEntries(params)

      expect(strapi.query).toHaveBeenCalledWith('api::blog-post.blog-post')
      expect(strapi.query().findMany).toHaveBeenCalledWith({
        populate: { author: { select: ['name'] } },
        select: ['id', 'title'],
        where: {
          publishedAt: {
            $ne: null
          }
        },
        limit: 50,
        offset: 0
      })
      expect(entries).toEqual(mockEntries)
    })
  })
})
