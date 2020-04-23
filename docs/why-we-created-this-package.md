- [Explanation](#explanation)
- [Scenario 1](#scenario-1)
- [Problem #1](#problem-1)
- [Scenario 2](#scenario-2) 
- [Problem #2](#problem-2)
- [Problem #3](#problem-3)
- [Solution](#solution)

# Why did we create this package?

## TL-DR
Save Money on Kinesis Streams usage

## Explanation
As you can see on the [Official Kinesis Pricing Page](https://aws.amazon.com/kinesis/data-streams/pricing/) AWS charges the usage of Kinesis by 
* ShardHours
* Data Retention Period
* PPU (Put Payload Unit)

They consider 1 PPU any PUT request with a size <= 25KB. If you send a which the size < 25KB you will pay 1 PPU and if the size is anywhere between 25KB and 50KB you'll pay 2 PPUs and so on.

## Scenario 1
### Scenario 1a
Let's say your application sends 1 JSON Document per Kinesis message and this same app is producing 1,000 documents per second, thus 1,000 messages per second with each message having a size of 1KB.

This means you are paying 1,000 PPUs / second.
The [Official Kinesis Pricing Page](https://aws.amazon.com/kinesis/data-streams/pricing/) says the the cost of SharHour varies per region and if goes from as low as $0.014/1M messages in US West (Oregon) to up to $0.0224/1M messages in Africa (Cape Town)

At the rate of producing 1,000 PPUs / second the monthly costs wuuld be:
Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   | (1000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.014 | $36.28/month
Africa (Cape Town) | (1000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.0224 | $58.06/month

#### Scenario 1b
If you change the logic of the app to instead of sending 1 JSON Document per Kinesis message you send and Array of 25 documents per message you would be sending 40 messages per second.

This means you'd be paying 40 PPUs / second

At the rate of producing 40 PPUs / second the monthly costs wuuld be:
Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   | (1000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.014 | $1.45/month
Africa (Cape Town) | (1000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.0224 | $2.32/month

### Problem #1
In many cases the application that produces the data is producing it so some other application can consuming it and changing the approach from 1 JSON Doc per Kinesis Message to Multiple JSON Docs / Kinesis Message would break the apps that are receiving the data.

### Scenario 2
#### Scenario 2a
Now imagine that the app from Scenario #1 is now growing and now it is producing more data, and now it goes from 50,000 Documents per second to about 100,000 documents per second at any given time.

As you can see on the [Official Kinesis Limits Page](https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html) each Shard can only take up to 1,000 messages per second per Shard. In the original scenario, in which the app sends 1 document per message, we'd have to provision a number of shards that would have to be the number of documents (up to 100,000) divided by the limit (1,000), a total of 100 shards.

The [Official Kinesis Pricing Page](https://aws.amazon.com/kinesis/data-streams/pricing/) says the the cost of SharHour varies per region and if goes from as low as $0.015/hour in US West (Oregon) to up to $0.024/hour in Africa (Cape Town)

By having 100 active shards your average monthly cost with the shards would be:
Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   | $0.015 * 24 hours * 30 days * 100 shards | $1080/month
Africa (Cape Town) | $0.024 * 24 hours * 30 days * 100 shards | $1728/month

At the rate of producing 10,000 PPUs / second the monthly costs wuuld be:
Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   | (50000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.014 | $1814.4/month
Africa (Cape Town) | (50000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.0224 | $2903.04/month

Thankfully, due to our previous implementation we are sending up to 25 Documents per message and that would bring our maximum number of messages down to 4,000, which means a need of 4 shards now :D

By having 4 active shards your average monthly cost with the shards would be:
Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   | $0.015 * 24 hours * 30 days * 100 shards | $43.20/month
Africa (Cape Town) | $0.024 * 24 hours * 30 days * 100 shards | $69.12/month

At the rate of producing 10,000 PPUs / second the monthly costs wuuld be:

Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   |(50000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.014  | $142.15/month
Africa (Cape Town) |(50000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.0224 | $232.24/month

#### Scenario 2b
Let's say you are not satisfied with that and you want to reduce it even further. You can do that by compressing the messages before sending them to Kinesis.

For most JSON Documents we have at EveryMundo that have a size between 1KB and 2KB the compression rate using gzip is about 90%, leaving us with a 10% of the original size of the document. The ration increases when we group them together but let's use that ratio for our calculations.

Now we have 4,000 messages that are 25KB each. Assuming we have a ration of 90% reduction we could group 10 times more Documents per message and then compress it and we'd have the same-ish size per message of 25KB. But now instead of 4,000 messages we have 400 messages.

With 400 messages we can have just 1 shard instead of the previous 4

By having 1 active shards your average monthly cost would be:
US West (Oregon)   | $0.015 * 24 hours * 30 days * 1 shard | $10.80/month
Africa (Cape Town) | $0.024 * 24 hours * 30 days * 1 shard | $17.28/month

### Problem #2
Now not just you need to make the consumers to support multi-doc messages you also have to make them support decompressing those messages.

### Problem #3
In many scenarios it is not possible to align the work of different teams working on producers and consumers at the same time in a way you could pause the curret data production (1 Doc/Message) and all the data consumers and deploy all together and then put them to run again all at the same time.

## Solution
This very npm package solves it all.

### Implementing it across applications
1. All the consumer apps o of a given stream implement the consumer generator at their own pace and then deploy their apps
1. Once all the consumers have deployed the consumer generator the producer app for the stream deploys the producer function.

### The Consumer
This package have seamless methods for you to use without changing the way the consumers work. Our consumer generator [flatJsonRecordsLambda](lib/parse-kinesis-record.js) makes the transition very smooth.

It supports all the 4 different scenarios all at the same time
1. Single JSON-Document Kinesis Message
1. Multi JSON-Document Kinesis Message
1. Single JSON-Document Kinesis Message compressed (gzip)
1. Multi JSON-Document Kinesis Message compressed (gzip)

Once you implement the consumer generator you don't need to worry about how the message is coming

Common scenario for Lambda Functions triggered by Kinesis Streams:
```js
const handler = async (event) => {
  for (const record of event.kinesis.Records) {
    const json = Buffer.from(record, 'base64').toString('utf8')
    const doc = JSON.parse(json)
    // then you logic kicks in...
  }
}
```
The changes you'd need to make would be these:
```js
const kinesisParser = require('@everymundo/aws-kinesis-client/lib/parse-kinesis-record')
const handler = async (event) => {
  for (const doc of kinesisParser.flatJsonRecordsLambda(event.Records)) {
    // then you logic kicks in...
  }
}
```
Your application will still work as before with 1 document at time, all the logic to handle the different scenarios are encapsulated in the generator ```flatJsonRecordsLambda```

### The Producer
The way you can send the messages gzipped when necessary is by using the [sendItOptimizedToKinesisWithRetry](lib/send-to-kinesis-with-retry.js) function.

```
const emKinesisClient = require('@everymundo/aws-kinesis-client/lib/send-to-kinesis-with-retry')
const docs = [doc1, doc2,..., docN]
const res = await emKinesisClient.sendItOptimizedToKinesisWithRetry(StreamName, docs)
```

