const zlib = require('zlib')
const gzHeader = Buffer.from([0x1f, 0x8b])

const parseKinesisRecord = (record) => {
  if (typeof record !== 'string') {
    throw new Error('Kinesis record expected to be string but got', typeof record)
  }

  const buffer = Buffer.from(record, 'base64')

  if (buffer.indexOf(gzHeader) === 0) {
    return zlib.gunzipSync(buffer)
  }

  return buffer
}

const parseKinesisRecordToString = (record, encoding = 'utf8') => parseKinesisRecord(record).toString(encoding)

module.exports = { parseKinesisRecord, parseKinesisRecordToString }
