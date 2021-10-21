const assert = require('chai').assert
const createRequest = require('../index.js').createRequest

describe('createRequest', () => {
  const jobID = '1'

  context('successful calls', () => {
    const requests = [
      { name: 'id not supplied', testData: { data: { lat: '36.53', lon: '-116.93', date: '1634023282' } } },
      { name: 'lat/lon/date', testData: { id: jobID, data: { lat: '36.53', lon: '-116.93', date: '1634023282' } } },
      { name: 'lat/lon/day', testData: { id: jobID, data: { lat: '36.53', lon: '-116.93', day: '1634023282' } } }
    ]

    requests.forEach(req => {
      it(`${req.name}`, (done) => {
        createRequest(req.testData, (statusCode, data) => {
          assert.equal(statusCode, 200)
          assert.equal(data.jobRunID, jobID)
          assert.isNotEmpty(data.data)
          assert.isAbove(Number(data.result), 0)
          assert.isAbove(Number(data.data.result), 0)
          done()
        })
      })
    })
  })

  context('error calls', () => {
    const requests = [
      { name: 'empty body', testData: {} },
      { name: 'empty data', testData: { data: {} } },
      { name: 'lat not supplied', testData: { id: jobID, data: { lon: '-116.93', date: '1634023282' } } },
      { name: 'lon not supplied', testData: { id: jobID, data: { lat: '36.53', date: '1634023282' } } },
      { name: 'date not supplied', testData: { id: jobID, data: { lat: '36.53', lon: '-116.93' } } },
      { name: 'unknown lat', testData: { id: jobID, data: { lat: '76876', lon: '-116.93', date: '1634023282' } } },
      { name: 'unknown lon', testData: { id: jobID, data: { lat: '36.53', lon: '99876', date: '1634023282' } } },
      { name: 'unknown date', testData: { id: jobID, data: { lat: '36.53', lon: '-116.93', date: 'not_real' } } }
    ]

    requests.forEach(req => {
      it(`${req.name}`, (done) => {
        createRequest(req.testData, (statusCode, data) => {
          assert.equal(statusCode, 500)
          assert.equal(data.jobRunID, jobID)
          assert.equal(data.status, 'errored')
          assert.isNotEmpty(data.error)
          done()
        })
      })
    })
  })
})
