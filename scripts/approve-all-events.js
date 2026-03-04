// One-time migration: approve all existing ride events that have approved=false
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

const rideEventSchema = new mongoose.Schema({}, { strict: false, collection: 'ride_events' });
const RideEvent = mongoose.model('RideEvent', rideEventSchema);

async function approveAll() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!');

    const result = await RideEvent.updateMany(
      { approved: { $ne: true } },
      { $set: { approved: true } }
    );

    console.log(`✅ Approved ${result.modifiedCount} events.`);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected.');
  }
}

approveAll();
