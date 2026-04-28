import fs from "fs";
import path from "path";
import connectDB from "../src/config/db.js";
import RideEvent from "../src/models/rideEvent.model.js";
import User from "../src/models/user.model.js";
import mongoose from "mongoose";

const MD_FILE = "c:\\Users\\ANZAL\\Desktop\\HerRIdez\\HerRidez\\data\\rideevent.md";

const uploadedUrls: string[] = [
  'https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/84c55cda-ff7d-4b3c-a378-9879a1c3868e.png',
  'https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/38819fcd-6278-443d-9a05-5f3d207c5429.png',
  'https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/72cb93eb-9c70-471a-b648-10e6d51777e5.png',
  'https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/27d11079-d078-463d-8a55-9fcac97102ee.png',
  'https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/a207e1d4-4515-498b-90b1-957aa28ef6af.png',
  'https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/d2fae4f9-a6f8-4a25-9f5c-0d779f1643e1.png',
  'https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/59648a6e-bbaf-47c5-9d7b-d6af4d0d90b1.png',
  'https://herridez-media-bucket.s3.ap-south-1.amazonaws.com/events/a16f0089-ed73-4ccf-98f5-7cb445fbb77c.png'
];

const run = async () => {
  await connectDB();

  console.log("Fetching users...");
  const users = await User.find({}).limit(50).lean();
  if (users.length === 0) {
    console.error("No users found in database. Please run user seed first.");
    process.exit(1);
  }

  console.log("Reading ride events from markdown...");
  const mdContent = fs.readFileSync(MD_FILE, "utf-8");
  const startIndex = mdContent.indexOf('[');
  const endIndex = mdContent.lastIndexOf(']');
  if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find JSON block in markdown.");
    process.exit(1);
  }
  const baseEvents = JSON.parse(mdContent.slice(startIndex, endIndex + 1));

  console.log("Clearing existing ride events (optional, but requested 'correct final fix')...");
  // await RideEvent.deleteMany({}); // Uncomment if you want a clean slate

  console.log("Generating 40 events...");

  const categoryMap: any = {
    ride: "city",
    meetup: "city",
    track: "national",
    event: "state",
  };

  const cities = ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai"];

  for (let i = 0; i < 40; i++) {
    const baseEvent = baseEvents[i % baseEvents.length];
    const user = users[i % users.length];
    const bannerUrl = uploadedUrls[i % uploadedUrls.length];
    const city = cities[Math.floor(Math.random() * cities.length)];

    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + (Math.floor(Math.random() * 30) + 1)); // 1 to 30 days in future

    const newEvent = new RideEvent({
      title: `${baseEvent.title} - ${i + 1}`,
      description: `Join us for an exciting ${baseEvent.eventType} in ${city}. Organized by ${user.name || 'Admin'}.`,
      organizerId: user._id,
      banner: bannerUrl,
      privacy: "public",
      price: baseEvent.price || 0,
      approved: true,
      location: city,
      category: categoryMap[baseEvent.eventType] || "city",
      route: {
        startPoint: { type: "Point", coordinates: [72.8777 + (Math.random() - 0.5), 19.0760 + (Math.random() - 0.5)] },
        endPoint: { type: "Point", coordinates: [72.8777 + (Math.random() - 0.5), 19.0760 + (Math.random() - 0.5)] },
        polyline: [{ lat: 19.0760, lng: 72.8777 }],
        distance: Math.floor(Math.random() * 100) + 10,
        estimatedDuration: Math.floor(Math.random() * 300) + 60,
        difficulty: ["beginner", "intermediate", "advanced"][Math.floor(Math.random() * 3)]
      },
      scheduledAt: scheduledAt,
      timezone: "Asia/Kolkata",
      rules: ["Helmet mandatory", "Respect local laws", "No stunting"],
      minRidingHours: Math.floor(Math.random() * 5),
      maxParticipants: baseEvent.maxParticipants || 50,
      status: "SCHEDULED"
    });

    await newEvent.save();
    console.log(`Created event ${i + 1}: ${newEvent.title}`);
  }

  const finalCount = await RideEvent.countDocuments({});
  console.log(`Final count of events in database: ${finalCount}`);
  console.log("Successfully created 40 events!");
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
