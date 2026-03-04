import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) { console.error('MONGO_URI missing'); process.exit(1); }

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db();
    const result = await db.collection('ride_events').updateMany(
      { approved: { $ne: true } },
      { $set: { approved: true } }
    );
    console.log(`✅ Approved ${result.modifiedCount} existing events`);
  } finally {
    await client.close();
  }
}

run().catch(console.error);
