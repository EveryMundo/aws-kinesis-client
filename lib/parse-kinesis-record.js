const zlib = require('zlib')
const logr = require('@everymundo/simple-logr')

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

function * flatJsonRecordsLambda (Records) {
  const recLen = Records.length
  for (let i = 0; i < recLen; i++) {
    const record = Records[i]
    if (!record || record.eventSource !== 'aws:kinesis') {
      logr.error(`flatJsonRecords invalid record index ${i}`)

      continue
    }

    const parsed = JSON.parse(parseKinesisRecordToString(record.kinesis.data))
    if (Array.isArray(parsed)) {
      for (let j = 0; j < parsed.length; j++) {
        yield parsed[j]
      }
    } else {
      yield parsed
    }
  }
}

module.exports = { parseKinesisRecord, parseKinesisRecordToString, flatJsonRecordsLambda }
