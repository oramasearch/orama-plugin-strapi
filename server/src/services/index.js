'use strict'

const collectionsService = require('./collections')
const contentTypesService = require('./content-types')
const cronService = require('./cron')
const hookManagerService = require('./hook-manager')
const liveUpdatesService = require('./live-updates')
const { service: oramaManagerService } = require('./orama-manager')

module.exports = {
  collectionsService,
  contentTypesService,
  cronService,
  hookManagerService,
  liveUpdatesService,
  oramaManagerService
}
