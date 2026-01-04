

// import { Schema, Document, Model } from "mongoose";
// import mongoose from "mongoose";

// export interface IBike extends Omit<Document, 'model'> {
//   userId: string;
//   brand: string;
//   model: string;
//   year: number;
//   cc?: number;
//   color?: string;
//   registrationNumber?: string;
//   primary: boolean;
//   mileage?: number;
//   imageUrl?: string;
//   notes?: string;
//   status: "active" | "archived";
//   createdAt: Date;
//   updatedAt: Date;
//   fullName: string;
// }

// const bikeSchema = new Schema<IBike>(
//   {
//     userId: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     brand: {
//       type: String,
//       required: true,
//       trim: true,
//       uppercase: true,
//     },
//     model: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     year: {
//       type: Number,
//       required: true,
//       min: 1970,
//       max: new Date().getFullYear() + 1,
//     },
//     cc: {
//       type: Number,
//       default: 0,
//     },
//     color: {
//       type: String,
//       default: "Black",
//     },
//     // ✅ FIX #3: Make registration number unique PER USER + add validation
//     registrationNumber: {
//       type: String,
//       sparse: true,
//       uppercase: true,
//       trim: true,
//       minlength: 4,
//       maxlength: 20,
//       match: /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/,
//       validate: {
//         async validator(this: IBike) {
//           if (!this.registrationNumber) return true;
    
//           const existingBike = await mongoose.model("Bike").findOne({
//             registrationNumber: this.registrationNumber,
//             userId: this.userId,
//             status: "active",
//             _id: { $ne: this._id },
//           });
    
//           return !existingBike;
//         },
//         message: "Registration number already exists for this user",
//       },
//     },
    
//     primary: {
//       type: Boolean,
//       default: false,
//       index: true,
//     },
//     mileage: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },
//     imageUrl: {
//       type: String,
//       default: null,
//     },
//     notes: {
//       type: String,
//       default: "",
//       maxlength: 500,
//     },
//     status: {
//       type: String,
//       enum: ["active", "archived"],
//       default: "active",
//       index: true,
//     },
//   },
//   {
//     timestamps: true,
//     collection: "bikes",
//   }
// );

// // Compound unique index: userId + registrationNumber (only for active bikes)
// bikeSchema.index(
//   { userId: 1, registrationNumber: 1, status: 1 },
//   { 
//     unique: true, 
//     sparse: true,
//     name: "unique_registration_per_user"
//   }
// );

// // Indexes for fast queries
// bikeSchema.index({ userId: 1, primary: -1 });
// bikeSchema.index({ userId: 1, createdAt: -1 });
// bikeSchema.index({ brand: 1, model: 1 });

// // Virtual: Full bike name
// bikeSchema.virtual("fullName").get(function () {
//   const doc = this as any as IBike;
//   return `${doc.brand} ${doc.model}`;
// });

// // Methods
// bikeSchema.methods.toJSON = function () {
//   const obj = this.toObject();
//   obj.fullName = `${this.brand} ${this.model}`;
//   return obj;
// };

// const Bike = mongoose.model<IBike>("Bike", bikeSchema);
// export default Bike;




import { Schema, Document, Model } from "mongoose";
import mongoose from "mongoose";

export interface IBike extends Omit<Document, 'model'> {
  userId: string;
  brand: string;
  model: string;
  year: number;
  cc?: number;
  color?: string;
  registrationNumber?: string;
  primary: boolean;
  mileage?: number;
  imageUrl?: string;
  notes?: string;
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
}

const bikeSchema = new Schema<IBike>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: "User",
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1970,
      max: new Date().getFullYear() + 1,
    },
    cc: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: "Black",
    },
    registrationNumber: {
      type: String,
      sparse: true,
      uppercase: true,
      trim: true,
      minlength: 4,
      maxlength: 20,
      match: /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/,
      validate: {
        async validator(this: IBike) {
          if (!this.registrationNumber) return true;
    
          const existingBike = await mongoose.model("Bike").findOne({
            registrationNumber: this.registrationNumber,
            userId: this.userId,
            status: "active",
            _id: { $ne: this._id },
          });
    
          return !existingBike;
        },
        message: "Registration number already exists for this user",
      },
    },
    
    primary: {
      type: Boolean,
      default: false,
      index: true,
    },
    mileage: {
      type: Number,
      default: 0,
      min: 0,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: "",
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "bikes",
  }
);

// Compound unique index: userId + registrationNumber (only for active bikes)
bikeSchema.index(
  { userId: 1, registrationNumber: 1, status: 1 },
  { 
    unique: true, 
    sparse: true,
    name: "unique_registration_per_user"
  }
);

// Indexes for fast queries
bikeSchema.index({ userId: 1, primary: -1 });
bikeSchema.index({ userId: 1, createdAt: -1 });
bikeSchema.index({ brand: 1, model: 1 });

// Virtual: Full bike name
bikeSchema.virtual("fullName").get(function () {
  const doc = this as any as IBike;
  return `${doc.brand} ${doc.model}`;
});

// Methods
bikeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.fullName = `${this.brand} ${this.model}`;
  return obj;
};

const Bike = mongoose.model<IBike>("Bike", bikeSchema);
export default Bike;
