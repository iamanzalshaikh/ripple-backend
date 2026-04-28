import connectDB from "../src/config/db.js";
import Post from "../src/models/post.model.js";

const run = async () => {
  await connectDB();
  
  const count = await Post.countDocuments({});
  console.log(`Found ${count} posts. Deleting all...`);
  
  const result = await Post.deleteMany({});
  console.log(`✅ Successfully deleted ${result.deletedCount} posts.`);
  
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
