const { expect } = require('chai')

describe('lib/parse-kinesis-record', () => {
  const lib = require('../../lib/parse-kinesis-record')

  describe('#parseKinesisRecord', () => {
    context('When called with a non string argument', () => {
      it('should throw an error', () => {
        const caller = () => lib.parseKinesisRecord({ this: { is: { not: { a: String } } } })

        expect(caller).to.throw(Error, 'Kinesis record expected to be string but got object')
      })
    })
  })

  describe('#flatJsonRecordsLambda', () => {
    context('When the Records have invalid eventSource', () => {
      it('should return an empty array', () => {
        const event = {
          Records: [
            { eventSource: 'aws:sqs', kinesis: { data: 'H4sIAAAAAAAAA4uuVkpUsjKs1QHTRlDauDYWAK14sVAZAAAA' } },
            { eventSource: 'aws:sqs', kinesis: { data: 'W3siYSI6NH0seyJhIjo1fSx7ImEiOjZ9XQ==' } }
          ]
        }

        const response = Array.from(lib.flatJsonRecordsLambda(event.Records))

        expect(response).to.have.property('length', 0)
        expect(response).to.deep.equal([])
      })
    })

    context('When one of the Records has an invalid JSON', () => {
      it('should return that record as an error', () => {
        const event = {
          Records: [
            { eventSource: 'aws:kinesis', kinesis: { data: 'eyJhIjoxfSx7ImEiOjJ9LHsiYSI6M31d' } },
            { eventSource: 'aws:kinesis', kinesis: { data: 'H4sIAAAAAAAAA4uuVkpUsjKs1QHTRlDauDYWAK14sVAZAAAA' } },
            { eventSource: 'aws:kinesis', kinesis: { data: 'W3siYSI6NH0seyJhIjo1fSx7ImEiOjZ9XQ==' } }
          ]
        }

        const response = Array.from(lib.flatJsonRecordsLambda(event.Records))

        expect(response).to.have.property('length', 7)
        const error = response.shift()
        expect(error).to.be.instanceof(Error)
        expect(error).to.have.property('json', '{"a":1},{"a":2},{"a":3}]')
        expect(response).to.deep.equal([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }, { a: 6 }])
      })
    })

    context('When each record contains a JSON array of objects', () => {
      it('should return a flat array', () => {
        const event = {
          Records: [
            { eventSource: 'aws:kinesis', kinesis: { data: 'H4sIAAAAAAAAA4uuVkpUsjKs1QHTRlDauDYWAK14sVAZAAAA' } },
            { eventSource: 'aws:kinesis', kinesis: { data: 'W3siYSI6NH0seyJhIjo1fSx7ImEiOjZ9XQ==' } }
          ]
        }

        const response = Array.from(lib.flatJsonRecordsLambda(event.Records))

        expect(response).to.have.property('length', 6)
        expect(response).to.deep.equal([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }, { a: 6 }])
      })
    })

    context('When each record contains a single JSON objects', () => {
      it('should return a flat array', () => {
        const event = {
          Records: [
            { eventSource: 'aws:kinesis', kinesis: { data: 'H4sIAAAAAAAAA6tWSlSyMtRRSlKyMtJRSlayMq4FAKtb1C4TAAAA' } },
            { eventSource: 'aws:kinesis', kinesis: { data: 'eyJhIjo0LCJiIjo1LCJjIjo2fQ==' } }
          ]
        }

        const response = Array.from(lib.flatJsonRecordsLambda(event.Records))

        expect(response).to.have.property('length', 2)
        expect(response).to.deep.equal([{ a: 1, b: 2, c: 3 }, { a: 4, b: 5, c: 6 }])
      })
    })
  })

  describe("#flatJsonSDKRecords", () => {

    context('When each record contains a JSON array of objects', () => {
      it('should return a flat array', () => {
        const Records = [
          { Data: 'H4sIAAAAAAAAA4uuVkpUsjKs1QHTRlDauDYWAK14sVAZAAAA', SequenceNumber: "00000", PartitionKey: "0000"},
          { Data: 'W3siYSI6NH0seyJhIjo1fSx7ImEiOjZ9XQ==', SequenceNumber: "00000", PartitionKey: "0000"}
        ]
        const response = Array.from(lib.flatJsonSDKRecords(Records))
        expect(response).to.have.property('length', 6)
        expect(response).to.deep.equal([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }, { a: 6 }])
      })
    })

    context('When each record contains a single JSON objects', () => {
      it('should return a flat array', () => {

        const Records = [
          { Data: 'H4sIAAAAAAAAA6tWSlSyMtRRSlKyMtJRSlayMq4FAKtb1C4TAAAA', SequenceNumber: "000", PartitionKey: "000" },
          { Data: 'eyJhIjo0LCJiIjo1LCJjIjo2fQ==', SequenceNumber: "000", PartitionKey: "000" }
        ]

        const response = Array.from(lib.flatJsonSDKRecords(Records))

        expect(response).to.have.property('length', 2)
        expect(response).to.deep.equal([{ a: 1, b: 2, c: 3 }, { a: 4, b: 5, c: 6 }])
      })
    })

    context('When each record contains a single JSON objects', () => {
      it('should return a flat array contining objects just from valid records.', () => {

        const Records = [
          { Data: 'H4sIAAAAAAAAA6tWSlSyMtRRSlKyMtJRSlayMq4FAKtb1C4TAAAA', SequenceNumber: "000", PartitionKey: "000" },
          { Data: 'eyJhIjo0LCJiIjo1LCJjIjo2fQ==' }
        ]

        const response = Array.from(lib.flatJsonSDKRecords(Records))

        expect(response).to.have.property('length', 1)
        expect(response).to.deep.equal([{ a: 1, b: 2, c: 3 }])
      })
    })

  })

  describe("#flatJsonSDKSingleRecord", () => {
    context('When the record contains a single JSON objects', () => {
      it('should return a flat array', () => {

        const Record = {
          Data: 'H4sIAAAAAAAAA6tWSlSyMtRRSlKyMtJRSlayMq4FAKtb1C4TAAAA',
          SequenceNumber: "000",
          PartitionKey: "000"
        }
        const response = Array.from(lib.flatJsonSDKSingleRecord(Record))

        expect(response).to.have.property('length', 1)
        expect(response).to.deep.equal([{ a: 1, b: 2, c: 3 }])
      })
    })
    context('When the record contains a JSON array of objects', () => {
      it('should return a flat array', () => {

        const Record = {
          Data: 'H4sIAAAAAAAAA4uuVkpUsjKs1QHTRlDauDYWAK14sVAZAAAA',
          SequenceNumber: "000",
          PartitionKey: "000"
        }
        const response = Array.from(lib.flatJsonSDKSingleRecord(Record))

        expect(response).to.have.property('length', 3)
        expect(response).to.deep.equal([{ a: 1 }, { a: 2 }, { a: 3 }])
      })
    })

    context('When the record is not invalid', () => {
      it('should return an empty array and log the error', () => {
        const Record = { Data: '' }
        const response = Array.from(lib.flatJsonSDKSingleRecord(Record))
        expect(response).to.deep.equal([])
      })
    })
  })
})
