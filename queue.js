require('dotenv').config();

const fs = require('fs');
const path = require('path');
const amqp = require('amqplib');

const DATA_FOLDER = './data';
const QUEUE = 'article_queue';

async function startProducer() {
  const conn = await amqp.connect('amqp://localhost');
  const channel = await conn.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });

  const files = fs.readdirSync(DATA_FOLDER).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const articleId = path.parse(file).name;

    channel.sendToQueue(QUEUE, Buffer.from(articleId), { persistent: true });
    console.log(` Queued article ID: ${articleId}`);
  }

  setTimeout(() => {
    conn.close();
    process.exit(0);
  }, 500);
}

startProducer().catch(console.error);
