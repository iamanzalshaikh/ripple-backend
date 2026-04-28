import connectDB from "../src/config/db.js";
import RideEvent from "../src/models/rideEvent.model.js";

// S3 uploaded event images from C:\Users\ANZAL\Desktop\HerRIdez\HerRidez\events
const PROPER_BANNERS = [
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/84c55cda-ff7d-4b3c-a378-9879a1c3868e.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/38819fcd-6278-443d-9a05-5f3d207c5429.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/72cb93eb-9c70-471a-b648-10e6d51777e5.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/27d11079-d078-463d-8a55-9fcac97102ee.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/a207e1d4-4515-498b-90b1-957aa28ef6af.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/d2fae4f9-a6f8-4a25-9f5c-0d779f1643e1.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/59648a6e-bbaf-47c5-9d7b-d6af4d0d90b1.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/a16f0089-ed73-4ccf-98f5-7cb445fbb77c.png",
];

const run = async () => {
  await connectDB();

  const total = await RideEvent.countDocuments({});
  console.log(`Total events in DB: ${total}`);

  const events = await RideEvent.find({}).select("_id title banner").lean();

  let updated = 0;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const banner = event.banner as string | null;

    // Assign S3 banner cyclically — replace ALL events regardless of current banner
    // (removes Unsplash images and uses only our uploaded S3 event screenshots)
    const newBanner = PROPER_BANNERS[i % PROPER_BANNERS.length];

    // Only skip if already exactly one of our S3 event banners (avoid unnecessary writes)
    if (banner && PROPER_BANNERS.includes(banner)) {
      console.log(`⏭  Skipped: "${event.title}" (already has S3 banner)`);
      continue;
    }

    await RideEvent.findByIdAndUpdate(event._id, { $set: { banner: newBanner } });
    console.log(`✅ Updated: "${event.title}" → ${newBanner.split("/").pop()}`);
    updated++;
  }

  console.log(`\nDone! Updated ${updated} / ${total} events with S3 event images.`);
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
