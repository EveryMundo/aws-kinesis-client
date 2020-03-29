const logr = require('@everymundo/simple-logr')
const kinesis = require('./kinesis')

const KINESIS_MAX_RETRIES = Math.abs(process.env.KINESIS_MAX_RETRIES) || 3
const sendItToKinesisWithRetry = async (params, maxRetries = KINESIS_MAX_RETRIES, attempt = 1) => {
  if (attempt > maxRetries) {
    throw new Error(`sendItToKinesis ${params.StreamName} failed after ${attempt} attempts`)
  }

  const kinesisResponse = await kinesis.client.putRecords(params).promise()
  if (kinesisResponse.FailedRecordCount === 0) {
    return kinesisResponse
  }

  logr.debug({ kinesisResponse })

  const { StreamName } = params
  const { FailedRecordCount } = kinesisResponse
  const PartitionKey = params.Records[0].PartitionKey.replace(`-${attempt}`, `-${attempt + 1}`)

  if (kinesisResponse.FailedRecordCount === params.Records.length) {
    logr.error({ errCode: 'ALL', FailedRecordCount, StreamName }, `sendItToKinesis attempt #${attempt} failed`)

    const Records = new Array(FailedRecordCount)

    for (let i = kinesisResponse.kinesisReport.length; i--;) {
      Records[i] = { Data: params.Records[i].Data, PartitionKey }
    }

    return sendItToKinesisWithRetry(params, attempt + 1)
  }

  logr.error({ errCode: 'SOME', FailedRecordCount, StreamName }, `sendItToKinesis attempt #${attempt} failed`)

  const Records = new Array(FailedRecordCount)

  for (let j = 0, i = kinesisResponse.kinesisReport.length; i--;) {
    if (!('SequenceNumber' in kinesisResponse.kinesisReport[i])) {
      Records[j++] = { Data: params.Records[i].Data, PartitionKey }
    }
  }

  return sendItToKinesisWithRetry({ StreamName, Records }, attempt + 1)
}

module.exports = { sendItToKinesisWithRetry }
