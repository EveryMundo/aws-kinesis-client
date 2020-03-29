const endpoint = process.env.AWS_KINESIS_ENDPOINT
const http = require(endpoint ? new URL(endpoint).protocol.replace(/\W+/, '') : 'https')

const agent = new http.Agent({ keepAlive: true })
const params = {
  endpoint,
  sslEnabled: !(endpoint && endpoint.startsWith('http:')),
  httpOptions: { agent }
}

const client = new (require('aws-sdk/clients/kinesis'))(params)

module.exports = { client, params }
