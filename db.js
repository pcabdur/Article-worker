const fs = require('fs');
const path = require('path');
const amqp = require('amqplib');
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'articles_db';
const COLLECTION = 'articles';
const DATA_FOLDER = './data';
const QUEUE = 'article_queue';

async function startWorker() {
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const db = mongoClient.db(DB_NAME);
  const collection = db.collection(COLLECTION);

  const conn = await amqp.connect('amqp://localhost');
  const channel = await conn.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });

  channel.consume(QUEUE, async (msg) => {
    if (msg !== null) {
      const articleId = msg.content.toString();
      const filePath = path.join(DATA_FOLDER, `${articleId}.json`);

      try {
        const raw = fs.readFileSync(filePath);
        const articleData = JSON.parse(raw);

        await collection.insertOne({
          articleId,
          data: articleData,
          insertedAt: new Date()
        });

        channel.ack(msg);
      } catch (err) {
        console.error(`Error processing ${articleId}:`, err.message);
        channel.ack(msg); // You can change this to nack if you want retries
      }
    }
  }, { noAck: false });
}

startWorker().catch(console.error);
