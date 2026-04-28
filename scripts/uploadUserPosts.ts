import fs from "fs";
import path from "path";
import connectDB from "../src/config/db.js";
import User from "../src/models/user.model.js";
import Post from "../src/models/post.model.js";
import { uploadOnS3 } from "../src/config/s3.js";

const POST_DIR = "c:\\Users\\ANZAL\\Desktop\\HerRIdez\\HerRidez\\POST";

const CAPTIONS = [
  "Exploring the open roads! 🏍️",
  "Riding is life. #BikerLife",
  "The wind in my face and the road beneath my wheels.",
  "Weekend ride vibes! ✨",
  "Living for the ride. #HerRidez",
  "Just me and my machine. 🤘",
  "Discovering new places, one ride at a time.",
  "Born to ride, forced to work.",
  "Nothing beats a good morning ride.",
  "Chasing the sunset! 🌅",
];

const run = async () => {
  await connectDB();

  console.log("Reading POST directory...");
  const files = fs.readdirSync(POST_DIR);
  const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i));

  if (imageFiles.length === 0) {
    console.error("No image files found in POST directory!");
    process.exit(1);
  }

  console.log(`Found ${imageFiles.length} images. Uploading to S3...`);
  const s3Urls: string[] = [];

  for (const file of imageFiles) {
    const filePath = path.join(POST_DIR, file);
    const buffer = fs.readFileSync(filePath);
    const mimetype = file.endsWith(".png") ? "image/png" : 
                     file.endsWith(".webp") ? "image/webp" : "image/jpeg";
    
    const url = await uploadOnS3(buffer, "posts", mimetype);
    if (url) {
      s3Urls.push(url);
      console.log(`✅ Uploaded ${file} -> ${url}`);
    } else {
      console.error(`❌ Failed to upload ${file}`);
    }
  }

  if (s3Urls.length === 0) {
    console.error("No images were successfully uploaded!");
    process.exit(1);
  }

  console.log("\nFetching users...");
  const users = await User.find({}).select("_id name city ridingStyle").lean();
  console.log(`Total users found: ${users.length}`);

  let created = 0;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const s3Url = s3Urls[i % s3Urls.length];
    const caption = CAPTIONS[i % CAPTIONS.length];

    await Post.create({
      userId: user._id,
      caption: `${caption} Greeting from ${user.city}!`,
      media: [{ url: s3Url, type: "photo" }],
      privacy: "public",
      location: { name: user.city, lat: 0, lng: 0 } // Dummy coordinates for now
    });
    
    if (i % 10 === 0) console.log(`Processed ${i}/${users.length} users...`);
    created++;
  }

  console.log(`\nDone! Created ${created} posts for ${users.length} users.`);
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
