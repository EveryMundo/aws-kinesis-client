const zlib = require('zlib')
const logr = require('@everymundo/simple-logr')
const boundaries = require('@everymundo/number-utils/lib/boundaries')
const kinesis = require('./kinesis')
const flatstr = require('flatstr')

const sleep = (n) => new Promise(resolve => setTimeout(resolve, boundaries(n, 100, 5000, 500)))
const delayedCall = async (n, func, ...args) => {
  logr.warn(`Waiting ${n}ms`)
  await sleep(n)

  return func(...args)
}

const KINESIS_MAX_RETRIES = boundaries(process.env.KINESIS_MAX_RETRIES, 1, 10, 5)
const KINESIS_RETRY_DELAY = boundaries(process.env.KINESIS_RETRY_DELAY, 10, 1000, 250)

logr.info({ KINESIS_MAX_RETRIES, KINESIS_RETRY_DELAY })

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
  const PartitionKey = flatstr(attempt === 1
    ? `${params.Records[0].PartitionKey}-${attempt + 1}`
    : params.Records[0].PartitionKey.replace(`-${attempt}`, `-${attempt + 1}`))

  if (kinesisResponse.FailedRecordCount === params.Records.length) {
    logr.error({ errCode: 'ALL', FailedRecordCount, StreamName }, `sendItToKinesis attempt #${attempt} failed`)

    const Records = new Array(FailedRecordCount)

    for (let i = kinesisResponse.Records.length; i--;) {
      Records[i] = { Data: params.Records[i].Data, PartitionKey }
    }

    // return sendItToKinesisWithRetry(params, maxRetries, attempt + 1)
    return delayedCall(attempt * KINESIS_RETRY_DELAY, () => sendItToKinesisWithRetry(params, maxRetries, attempt + 1))
  }

  logr.error({ errCode: 'SOME', FailedRecordCount, StreamName }, `sendItToKinesis attempt #${attempt} failed`)

  const Records = new Array(FailedRecordCount)

  for (let j = 0, i = kinesisResponse.Records.length; i--;) {
    if (!('SequenceNumber' in kinesisResponse.Records[i])) {
      Records[j++] = { Data: params.Records[i].Data, PartitionKey }
    }
  }

  // return sendItToKinesisWithRetry({ StreamName, Records }, maxRetries, attempt + 1)
  return delayedCall(attempt * KINESIS_RETRY_DELAY, () => sendItToKinesisWithRetry({ StreamName, Records }, maxRetries, attempt + 1))
}

const sendItCompressedToKinesisWithRetry = async (params, maxRetries, thresholdInBytes = 25600) => {
  for (let i = params.Records.length; i--;) {
    if (Buffer.byteLength(params.Records[i].Data) > thresholdInBytes) {
      params.Records[i].Data = zlib.gzipSync(params.Records[i].Data)
    }
  }

  return sendItToKinesisWithRetry(params, maxRetries)
  // return delayedCall(200, () => sendItToKinesisWithRetry(params, maxRetries))
}

const _1MB = 1024 * 1024
const _10MB = 11 * _1MB

const splitDocs = (Docs, thresholdInBytes = 25600, _level = 6, previousSliceSize) => {
  const level = boundaries(_level, 3, 9, 6)
  // console.log({ thresholdInBytes, level, _level })
  const jsonBuffer = Buffer.from(JSON.stringify(Docs))

  if (jsonBuffer.byteLength < thresholdInBytes) {
    return [{ gzip: false, level, Data: jsonBuffer }]
  }

  if (jsonBuffer.byteLength < _10MB) {
    const gzipped = zlib.gzipSync(jsonBuffer, { level })

    // console.log({ gzippedSize: gzipped.byteLength, _1MB, diff: _1MB - gzipped.byteLength, '%': Math.abs(_1MB - gzipped.byteLength) / _1MB, level })
    if (gzipped.byteLength < _1MB) {
      return [{ gzip: true, level, Data: gzipped }]
    }
  }

  // const slices = Math.ceil(gzipped.byteLength / _1MB)
  const slices = { length: Math.ceil(jsonBuffer.byteLength / _10MB) }
  // console.log({ slices: slices.length, 'jsonBuffer.byteLength': jsonBuffer.byteLength, _10MB })
  const sliceSize = Math.ceil(Docs.length / slices.length)

  let newLevel = previousSliceSize <= sliceSize ? level + 1 : level
  // return Array.from(slices, (_, i) => splitDocs2(Docs.slice(i * sliceSize, i * sliceSize + sliceSize), thresholdInBytes, newLevel, sliceSize)).flat()
  let res = []
  for (let i = 0; i < slices.length; i++) {
    res = res.concat(splitDocs(Docs.slice(i * sliceSize, i * sliceSize + sliceSize), thresholdInBytes, newLevel, sliceSize))
    newLevel = res[res.length - 1].level
  }

  return res.flat()
}

const sendItOptimizedToKinesisWithRetry = async (StreamName, Docs, maxRetries) => {
  const params = {
    StreamName,
    Records: splitDocs(Docs).map(({ Data }) => ({
      Data,
      PartitionKey: '' + ~~(Math.random() * 200)
    }))
  }

  // return params
  return sendItToKinesisWithRetry(params, maxRetries)
}

module.exports = {
  _1MB,
  splitDocs2: splitDocs,
  sendItToKinesisWithRetry,
  sendItCompressedToKinesisWithRetry,
  sendItOptimizedToKinesisWithRetry
}
