function createKinesisClient ({ region = process.env.AWS_REGION, accessKeyId, secretAccessKey } = {}, endpoint = process.env.AWS_KINESIS_ENDPOINT) {
  const http = require(endpoint ? new URL(endpoint).protocol.replace(/\W+/, '') : 'https')

  const agent = new http.Agent({ keepAlive: true })
  const params = {
    accessKeyId,
    secretAccessKey,
    region,
    endpoint,
    sslEnabled: !(endpoint && endpoint.startsWith('http:')),
    httpOptions: { agent }
  }

  return new (require('aws-sdk/clients/kinesis'))(params)
}

const client = createKinesisClient()

module.exports = { client, createKinesisClient }
