const { client } = require('./lib/kinesis')
const {
  sendItToKinesisWithRetry,
  sendItCompressedToKinesisWithRetry,
  sendItOptimizedToKinesisWithRetry
} = require('./lib/send-to-kinesis-with-retry')

const {
  flatJsonRecordsLambda,
  parseKinesisRecord,
  parseKinesisRecordToString
} = require('./lib/parse-kinesis-record')

module.exports = {
  client,
  sendItToKinesisWithRetry,
  sendItCompressedToKinesisWithRetry,
  sendItOptimizedToKinesisWithRetry,
  flatJsonRecordsLambda,
  parseKinesisRecord,
  parseKinesisRecordToString
}
