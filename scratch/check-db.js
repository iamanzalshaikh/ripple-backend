import mongoose from 'mongoose';
import Listing from '../src/models/listing.model.js';
import User from '../src/models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/herridez');
        const listingCount = await Listing.countDocuments();
        const userCount = await User.countDocuments();
        console.log(`Listing Count: ${listingCount}`);
        console.log(`User Count: ${userCount}`);
        
        if (listingCount > 0) {
            const sample = await Listing.findOne().populate('sellerId', 'name');
            console.log('Sample Listing:', sample?.title, 'by', sample?.sellerId?.name);
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkData();
