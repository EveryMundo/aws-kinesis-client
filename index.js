const { client } = require('./lib/kinesis')
const { sendItToKinesisWithRetry } = require('./lib/send-to-kinesis-with-retry')
const { parseKinesisRecord, parseKinesisRecordToString } = require('./lib/parse-kinesis-record')

module.exports = {
  client,
  sendItToKinesisWithRetry,
  parseKinesisRecord,
  parseKinesisRecordToString
}
