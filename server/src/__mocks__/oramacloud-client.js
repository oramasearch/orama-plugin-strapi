class MockCloudManager {
  constructor() {
    this.index = jest.fn().mockReturnThis()
    this.deploy = jest.fn()
    this.snapshot = jest.fn()
    this.updateSchema = jest.fn()
    this.insert = jest.fn()
    this.update = jest.fn()
    this.delete = jest.fn()
  }
}

module.exports = { CloudManager: MockCloudManager }
