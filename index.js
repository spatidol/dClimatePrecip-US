const { Requester, Validator } = require('@chainlink/external-adapter')
const geoTz = require('geo-tz')

// Define custom error scenarios for the API.
// Return true for the adapter to retry.
const customError = (data) => {
  if (data.Response === 'Error') return true
  return false
}

// Define custom parameters to be used by the adapter.
// Extra parameters can be stated in the extra object,
// with a Boolean value indicating whether or not they
// should be required.
const customParams = {
  lat: ['lat'], // within us
  lon: ['lon'], // within us
  date: ['date', 'day'],
  endpoint: false
}

const createRequest = (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id
  const endpoint = validator.validated.data.endpoint || 'grid-history/cpcc_precip_us-daily'
  const lat = validator.validated.data.lat
  const lon = validator.validated.data.lon
  const location = `${lat}_${lon}`
  const url = `https://api.dclimate.net/apiv3/${endpoint}/${location}`
  const auth = process.env.AUTH_TOKEN
  let tz
  // date comes in as unix utc - convert here to timezone of lat lon
  try {
    tz = geoTz(lat, lon)[0]
  } catch (err) {
    return callback(500, Requester.errored(jobRunID, err))
  }

  const options = { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }
  const d = new Date(validator.validated.data.date * 1000).toLocaleString('en-US', options).split('/')
  const date = `${d[2]}-${d[0]}-${d[1]}`

  const params = {
    date
  }

  // This is where you would add method and headers
  // you can add method like GET or POST and add it to the config
  // The default is GET requests
  // method = 'get'
  // headers = 'headers.....'
  const config = {
    url,
    params,
    headers: { Authorization: auth, accept: 'application/json' },
    timeout: 10000
  }

  // The Requester allows API calls be retry in case of timeout
  // or connection failure
  Requester.request(config, customError)
    .then(response => {
      // It's common practice to store the desired value at the top-level
      // result key. This allows different adapters to be compatible with
      // one another.
      const initResult = Requester.getResult(response.data, ['data', date])
      const result = initResult.split(' ')[0]
      if (typeof result === 'undefined') {
        const error = 'Result could not be found in path'
        throw new Error(error)
      }
      if (Number(result) === 0 || isNaN(Number(result))) {
        const error = 'Invalid result'
        throw new Error(error)
      }
      response.data = {}
      response.data.result = Number(result) * 25.4
      callback(response.status, Requester.success(jobRunID, response))
    })
    .catch(error => {
      callback(500, Requester.errored(jobRunID, error))
    })
}

// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data)
  })
}

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data)
  })
}

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
  createRequest(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false
    })
  })
}

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest
