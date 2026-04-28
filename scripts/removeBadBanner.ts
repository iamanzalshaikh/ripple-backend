import connectDB from "../src/config/db.js";
import RideEvent from "../src/models/rideEvent.model.js";

// The bad image to remove (Screenshot 2026-04-28 121318.png)
const BAD_BANNER = "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/38819fcd-6278-443d-9a05-5f3d207c5429.png";

// Remaining 7 good S3 images (cycled as replacements)
const GOOD_BANNERS = [
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/84c55cda-ff7d-4b3c-a378-9879a1c3868e.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/72cb93eb-9c70-471a-b648-10e6d51777e5.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/27d11079-d078-463d-8a55-9fcac97102ee.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/a207e1d4-4515-498b-90b1-957aa28ef6af.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/d2fae4f9-a6f8-4a25-9f5c-0d779f1643e1.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/59648a6e-bbaf-47c5-9d7b-d6af4d0d90b1.png",
  "https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/a16f0089-ed73-4ccf-98f5-7cb445fbb77c.png",
];

const run = async () => {
  await connectDB();

  const affected = await RideEvent.find({ banner: BAD_BANNER }).select("_id title").lean();
  console.log(`Found ${affected.length} events with the bad banner.`);

  let idx = 0;
  for (const event of affected) {
    const replacement = GOOD_BANNERS[idx % GOOD_BANNERS.length];
    await RideEvent.findByIdAndUpdate(event._id, { $set: { banner: replacement } });
    console.log(`✅ Fixed: "${event.title}" → ${replacement.split("/").pop()}`);
    idx++;
  }

  console.log(`\nDone! Replaced ${affected.length} events.`);
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
