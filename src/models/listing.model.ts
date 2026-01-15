import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================
// INTERFACES
// ============================================

export interface IListing {
  _id: string;
  sellerId: string;
  title: string;
  description?: string;
  price: number;
  category: "gear" | "bike";
  subCategory?: string;
  location?: string;
  media: string[];
  status: "active" | "sold" | "deleted";
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IListingDocument extends Omit<IListing, "_id">, Document {}

interface IListingMethods {
  toJSON(): Partial<IListing>;
}

type IListingModel = Model<IListingDocument, {}, IListingMethods>;

// ============================================
// SCHEMA
// ============================================

const listingSchema = new Schema<
  IListingDocument,
  IListingModel,
  IListingMethods
>(
  {
    sellerId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: [true, "Seller ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["gear", "bike"],
        message: "Category must be either gear or bike",
      },
      index: true,
    },
    subCategory: {
      type: String,
      trim: true,
      maxlength: [50, "Sub-category cannot exceed 50 characters"],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location cannot exceed 100 characters"],
    },
    media: {
      type: [String],
      default: [],
      validate: {
        validator: function (this: IListingDocument, arr: string[]) {
          return arr.length <= 5;
        },
        message: "Cannot upload more than 5 images",
      },
    } as any,
    status: {
      type: String,
      enum: {
        values: ["active", "sold", "deleted"],
        message: "Status must be active, sold, or deleted",
      },
      default: "active",
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
      comment: "For admin/AI verification (post-MVP)",
    },
  },
  {
    timestamps: true,
    collection: "listings",
  }
);

// ============================================
// INDEXES
// ============================================

// Text search index for title, description, location
listingSchema.index(
  { title: "text", description: "text", location: "text" },
  {
    name: "listing_text_search",
    weights: { title: 3, description: 1, location: 2 },
  }
);

// Compound index for efficient filtering
listingSchema.index(
  { category: 1, status: 1, createdAt: -1 },
  { name: "category_status_date" }
);

// Price range queries
listingSchema.index({ price: 1 }, { name: "price_index" });

// Seller's listings
listingSchema.index(
  { sellerId: 1, status: 1, createdAt: -1 },
  { name: "seller_listings" }
);

// Location-based queries
listingSchema.index({ location: 1, status: 1 }, { name: "location_status" });

// ============================================
// METHODS
// ============================================

listingSchema.methods.toJSON = function (): Partial<IListing> {
  const obj = this.toObject();
  return {
    ...obj,
    _id: obj._id.toString(),
  } as Partial<IListing>;
};

// ============================================
// MODEL
// ============================================

const Listing = mongoose.model<IListingDocument, IListingModel>(
  "Listing",
  listingSchema
);

export default Listing;
