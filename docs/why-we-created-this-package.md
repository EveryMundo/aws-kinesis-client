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
As you can see on the [Official Kinesis Pricing Page](https://aws.amazon.com/kinesis/data-streams/pricing/), AWS charges the usage of Kinesis by 
* ShardHours
* Data Retention Period
* PPU (Put Payload Unit)

What they consider 1 PPU is any PUT request with a size <= 25KB. That means if you send a message in which the length is < 25KB, you will be charged 1 PPU, and if the size is anywhere between 25KB and 50KB, you'll be charged 2 PPUs and so on.

## Scenario 1
### Scenario 1a
Let's say your application sends 1 JSON Document per Kinesis message, and it is producing 1,000 documents per second, thus 1,000 messages per second, with each one having a size averaging 1KB.

This means you are paying 1,000 PPUs / second.
The [Official Kinesis Pricing Page](https://aws.amazon.com/kinesis/data-streams/pricing/) says the cost of SharedHour varies per region and it goes from as low as $0.014/1M messages in US West (Oregon) to up to $0.0224/1M messages in Africa (Cape Town)

At the rate of producing 1,000 PPUs / second, the monthly costs would be:
Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   | (1000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.014 | $36.28/month
Africa (Cape Town) | (1000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.0224 | $58.06/month

#### Scenario 1b
If you change the app's logic from sending 1 JSON Document per Kinesis message to send an Array of 25 documents per Kinesis message, you will be sending 40 messages per second instead.

This means you'd be paying 40 PPUs / second.

At the rate of producing 40 PPUs / second, the monthly costs would be:
Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   | (40 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.014 | $1.45/month
Africa (Cape Town) | (40 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.0224 | $2.32/month

### Problem #1
In most cases, the application producing the data is doing it for other applications to consume such data, and changing the approach from 1 JSON Doc per Kinesis Message to Multiple JSON Docs / Kinesis Message would break the applications receiving the data.

### Scenario 2
#### Scenario 2a
Imagine the app from Scenario #1 is now growing and producing more data, and now it goes from 50,000 Documents per second to about 100,000 documents per second at any given time.

As you can see on the [Official Kinesis Limits Page](https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html), each Kinesis Shard can only take up to 1,000 messages per second. In the original scenario, in which the app sends 1 document per message, we'd have to provision the number of shards that would have the capability to intake that number of documents. So up to 100,000 divided by the Kinesis Shart limit (1,000) would result in a total of 100 shards.

The [Official Kinesis Pricing Page](https://aws.amazon.com/kinesis/data-streams/pricing/) says the cost of ShardHour varies per region and it goes from as low as $0.015/hour in US West (Oregon) to up to $0.024/hour in Africa (Cape Town)

By having 100 active shards, your average monthly cost with the shards only (whether or not they are being used) would be:
Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   | $0.015 * 24 hours * 30 days * 100 shards | $1080/month
Africa (Cape Town) | $0.024 * 24 hours * 30 days * 100 shards | $1728/month

At the rate of producing 10,000 PPUs / second, the monthly costs would be:
Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   | (50000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.014 | $1814.4/month
Africa (Cape Town) | (50000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.0224 | $2903.04/month

Thankfully, due to our previous implementation, we are now sending up to 25 JSON Documents per Kinesis message, and that would bring our maximum number of messages from 100k down to 4k, which means we only need 4 Kinesis Shards now :D

By having 4 active shards, your average monthly cost with the shards would be:
Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   | $0.015 * 24 hours * 30 days * 100 shards | $43.20/month
Africa (Cape Town) | $0.024 * 24 hours * 30 days * 100 shards | $69.12/month

At the rate of producing 10,000 PPUs / second, the monthly costs would be:

Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   |(50000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.014  | $142.15/month
Africa (Cape Town) |(50000 PPUs * 60 seconds * 60 minutes * 24 hours * 30) / 1M * $0.0224 | $232.24/month

#### Scenario 2b
Let's say you are not satisfied with that level of cost savings and you want to reduce it even further. You can do that by compressing the messages before sending them to Kinesis.

Most JSON Documents we circulation throw our systems at EveryMundo average in a size range between 1KB and 2KB. For those, the compression rate using gzip is about 90%, leaving us with 10% of the original size of a document. The ratio increases when we group them together but let's use this ratio for our calculations.

Now that we have 4,000 Kinesis messages that are 25KB each, and assuming we have a 90% reduction in byte size, we can group 10 times more JSON Documents per Kinesis Message and compress them. With that, we'd have the same-ish size per Kinesis Message of 25KB. But now, instead of sending 4,000 messages to Kinesis, we only need to send 400.

With 400 messages, we can now have a single Kenisis Shard instead of the previous 4.

By having 1 active shards your average monthly cost would be:
Region             | Calculation | Total
------------------ | ----------- | -----
US West (Oregon)   | $0.015 * 24 hours * 30 days * 1 shard | $10.80/month
Africa (Cape Town) | $0.024 * 24 hours * 30 days * 1 shard | $17.28/month

### Problem #2
Now, beyond the need to make the consumer apps supporting multi-doc messages, you also need to add support for decompressing them.

### Problem #3
In many scenarios, if you want to implement those changes in the producer applications, it is not realistic to align different teams working on producers and consumers in a way that could pause all the current data production (1 Doc/Message) and all the data consumers so you can deploy all the changes together at the same time.

## Solution
This npm package aims to solve all those problems for your all Lambda Functions applications using NodeJS.

And the way to do so is by making your application read/parse the Kinesis produced data with this very npm module, and later on, it has to be used to also send the data to Kinesis.

### Implementing it across applications
1. All the consumer apps of a given Kinesis Stream must implement the consumer generator of this npm module. That can be done at their own pace. Once all the consumers have deployed the new code using the consumer generator, nothing will break because the generator understands the current 1 doc per message approach.
1. Now, it's time to update the source code of the producer apps that feed the same Kinesis stream using this package to send the messages. Since the consumer apps are already ready to decompress and spread the array of messages, everything will keep working similarly.

### The Consumer
This package has seamless methods for you to use without changing the way the consumers work. Our consumer generator [flatJsonRecordsLambda](/lib/parse-kinesis-record.js) makes the transition very smooth.

It supports all 4 different scenarios all at the same time
1. Single JSON-Document Kinesis Message
1. Multi JSON-Document Kinesis Message
1. Single JSON-Document Kinesis Message compressed (gzip)
1. Multi JSON-Document Kinesis Message compressed (gzip)

Once you implement the consumer generator, you don't need to worry about how the message is coming.

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
Your application will still work as before, with 1 document at a time. All the logic to handle the different scenarios are encapsulated in the generator ```flatJsonRecordsLambda```

### The Producer
You can send the messages gzipped when necessary by using the [sendItOptimizedToKinesisWithRetry](/lib/send-to-kinesis-with-retry.js) function.

```
const emKinesisClient = require('@everymundo/aws-kinesis-client/lib/send-to-kinesis-with-retry')
const docs = [doc1, doc2,..., docN]
const res = await emKinesisClient.sendItOptimizedToKinesisWithRetry(StreamName, docs)
```
