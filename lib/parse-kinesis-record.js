const zlib = require('zlib')
const logr = require('@everymundo/simple-logr')
const { parseJson } = require('@everymundo/json-utils')

const gzHeader = Buffer.from([0x1f, 0x8b])

const parseKinesisRecord = (record) => {
  if (typeof record !== 'string') {
    throw new Error(`Kinesis record expected to be string but got ${typeof record}`)
  }

  const buffer = Buffer.from(record, 'base64')

  if (buffer.indexOf(gzHeader) === 0) {
    return zlib.gunzipSync(buffer)
  }

  return buffer
}

const parseKinesisRecordToString = (record, encoding = 'utf8') => parseKinesisRecord(record).toString(encoding)

function * parseAndYieldFlat (jsonString) {
  const parsed = parseJson(jsonString)
  if (Array.isArray(parsed)) {
    for (let j = 0; j < parsed.length; j++) {
      yield parsed[j]
    }
  } else {
    if (parsed instanceof Error) {
      parsed.json = jsonString
    }

    yield parsed
  }
}

function * flatJsonRecordsLambda (Records) {
  const recLen = Records.length
  for (let i = 0; i < recLen; i++) {
    const record = Records[i]
    if (!record || record.eventSource !== 'aws:kinesis') {
      logr.error(`flatJsonRecords invalid record index ${i}`)

      continue
    }

    const jsonString = parseKinesisRecordToString(record.kinesis.data)
    yield * parseAndYieldFlat(jsonString)
  }
}

function * flatJsonSDKRecords (Records) {
  const recLen = Records.length
  for (let i = 0; i < recLen; i++) {
    const record = Records[i]
    if (!record || !record.SequenceNumber || !record.PartitionKey) {
      logr.error(`flatJsonRecords invalid record index ${i}`)

      continue
    }

    const jsonString = parseKinesisRecordToString(record.Data)
    yield * parseAndYieldFlat(jsonString)
  }
}

function * flatJsonSDKSingleRecord (record) {
  if (!record || !record.SequenceNumber || !record.PartitionKey) {
    logr.error(`flatJsonRecords invalid record ${record}`)
    return null
  }

  const jsonString = parseKinesisRecordToString(record.Data)
  yield * parseAndYieldFlat(jsonString)
}

module.exports = {
  parseKinesisRecord,
  parseKinesisRecordToString,
  flatJsonRecordsLambda,
  flatJsonSDKRecords,
  flatJsonSDKSingleRecord
}
