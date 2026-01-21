import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types/auth.types.js";
import User from "../models/user.model.js";
import Bike, { IBike } from "../models/bike.model.js";
import logger from "../config/logger.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";

/**
 * POST /api/v1/bikes
 * Add a new bike
 */
export const addBike = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.userId!;
    const {
      brand,
      model,
      year,
      cc,
      color,
      registrationNumber,
      primary,
      notes,
      imageUrl,
    } = req.body;

    const parsedYear = typeof year === "string" ? parseInt(year, 10) : year;

    if (!brand || !model || !parsedYear) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Brand, model, and year are required",
      });
      return;
    }

    if (parsedYear < 1970 || parsedYear > new Date().getFullYear() + 1) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Invalid bike year",
      });
      return;
    }

    const bikeCount = await Bike.countDocuments(
      { userId, status: "active" },
      { session },
    );

    if (bikeCount >= 5) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Maximum 5 bikes allowed",
      });
      return;
    }

    // Handle image upload if file is provided
    let uploadedImageUrl: string | null = null;
    if (req.file) {
      logger.info(`Uploading bike image to Cloudinary`);
      try {
        uploadedImageUrl = await uploadOnCloudinary(
          req.file.buffer,
          "bike-images",
        );
        logger.info(`✅ Bike image uploaded successfully: ${uploadedImageUrl}`);
      } catch (uploadError: any) {
        logger.error(`❌ Cloudinary upload failed: ${uploadError.message}`);
        await session.abortTransaction();
        res.status(500).json({
          success: false,
          message: "Failed to upload bike image",
          error: uploadError.message,
        });
        return;
      }
    }

    const newBike = new Bike({
      userId,
      brand: brand.toUpperCase(),
      model,
      year: parsedYear,
      cc: cc || 0,
      color: color || "Black",
      registrationNumber,
      primary: primary || false,
      notes,
      imageUrl: uploadedImageUrl || imageUrl || undefined,
    });

    if (bikeCount === 0 || primary === true) {
      newBike.primary = true;
      await Bike.updateMany(
        { userId, _id: { $ne: newBike._id } },
        { primary: false },
        { session },
      );
    }

    await newBike.save({ session });

    await User.findByIdAndUpdate(
      userId,
      { $push: { bikes: newBike._id } },
      { session },
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Bike added successfully",
      data: newBike.toJSON(),
    });
  } catch (error: any) {
    await session.abortTransaction();
    logger.error(error.message);
    res.status(500).json({
      success: false,
      message: "Failed to add bike",
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Get all bikes for user
 * GET /api/v1/bikes
 */
export const getBikes = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    logger.info(`Fetching bikes for user ${userId}`);

    const bikes = await Bike.find({
      userId,
      status: "active",
    }).sort({ primary: -1, createdAt: -1 });

    res.json({
      success: true,
      count: bikes.length,
      data: bikes.map((bike) => bike.toJSON()),
    });
  } catch (error: any) {
    logger.error(`❌ Error fetching bikes: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bikes",
      error: error.message,
    });
  }
};

/**
 * Get single bike by ID
 * GET /api/v1/bikes/:id
 */
export const getBikeById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    logger.info(`Fetching bike ${id} for user ${userId}`);

    const bike = await Bike.findOne({ _id: id, userId });

    if (!bike) {
      res.status(404).json({
        success: false,
        message: "Bike not found",
      });
      return;
    }

    res.json({
      success: true,
      data: bike.toJSON(),
    });
  } catch (error: any) {
    logger.error(`❌ Error fetching bike: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bike",
      error: error.message,
    });
  }
};

/**
 * Update bike details
 * PATCH /api/v1/bikes/:id
 * Supports image upload via multipart/form-data
 */
export const updateBike = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const {
      brand,
      model,
      year,
      cc,
      color,
      registrationNumber,
      primary,
      mileage,
      notes,
    } = req.body;

    logger.info(`Updating bike ${id} for user ${userId}`);

    // Check ownership
    const bike = await Bike.findOne({ _id: id, userId });
    if (!bike) {
      res.status(404).json({
        success: false,
        message: "Bike not found or not authorized",
      });
      return;
    }

    // Build update object
    const updates: Partial<IBike> = {};
    if (brand) updates.brand = brand.toUpperCase();
    if (model) updates.model = model;
    if (year) updates.year = parseInt(year);
    if (cc) updates.cc = cc;
    if (color) updates.color = color;
    if (registrationNumber) updates.registrationNumber = registrationNumber;
    if (mileage !== undefined) updates.mileage = mileage;
    if (notes !== undefined) updates.notes = notes;

    // Handle image upload if file is provided
    if (req.file) {
      logger.info(`Uploading bike image to Cloudinary for bike ${id}`);
      try {
        const imageUrl = await uploadOnCloudinary(
          req.file.buffer,
          "bike-images",
        );
        updates.imageUrl = imageUrl;
        logger.info(`✅ Bike image uploaded successfully: ${imageUrl}`);
      } catch (uploadError: any) {
        logger.error(`❌ Cloudinary upload failed: ${uploadError.message}`);
        res.status(500).json({
          success: false,
          message: "Failed to upload bike image",
          error: uploadError.message,
        });
        return;
      }
    }

    // If setting as primary, unset others
    if (primary === true) {
      await Bike.updateMany({ userId, _id: { $ne: id } }, { primary: false });
      updates.primary = true;
    }

    const updatedBike = await Bike.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    logger.info(`✅ Bike updated: ${id}`);

    res.json({
      success: true,
      message: "Bike updated successfully",
      data: updatedBike?.toJSON(),
    });
  } catch (error: any) {
    logger.error(`❌ Error updating bike: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to update bike",
      error: error.message,
    });
  }
};

/**
 * Set bike as primary
 * PATCH /api/v1/bikes/:id/set-primary
 */
export const setPrimaryBike = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    logger.info(`Setting bike ${id} as primary for user ${userId}`);

    // Check ownership
    const bike = await Bike.findOne({ _id: id, userId });
    if (!bike) {
      res.status(404).json({
        success: false,
        message: "Bike not found or not authorized",
      });
      return;
    }

    // Unset primary on all other bikes
    await Bike.updateMany({ userId, _id: { $ne: id } }, { primary: false });

    // Set this as primary
    const updatedBike = await Bike.findByIdAndUpdate(
      id,
      { primary: true },
      { new: true },
    );

    logger.info(`✅ Primary bike set: ${id}`);

    res.json({
      success: true,
      message: "Primary bike updated",
      data: updatedBike?.toJSON(),
    });
  } catch (error: any) {
    logger.error(`❌ Error setting primary bike: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to set primary bike",
      error: error.message,
    });
  }
};

/**
 * Delete bike (soft delete)
 * DELETE /api/v1/bikes/:id
 */
// export const deleteBike = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const userId = req.userId;
//     const { id } = req.params;

//     logger.info(`Deleting bike ${id} for user ${userId}`);

//     // Check ownership
//     const bike = await Bike.findOne({ _id: id, userId });
//     if (!bike) {
//       res.status(404).json({
//         success: false,
//         message: "Bike not found or not authorized",
//       });
//       return;
//     }

//     // Soft delete
//     const deletedBike = await Bike.findByIdAndUpdate(
//       id,
//       { status: "archived" },
//       { new: true }
//     );

//     // Remove from user's bikes array
//     await User.findByIdAndUpdate(userId, { $pull: { bikes: id } });

//     // If this was primary, set another as primary
//     const primaryBike = await Bike.findOne({
//       userId,
//       primary: true,
//       status: "active",
//     });

//     if (!primaryBike) {
//       const nextBike = await Bike.findOne({
//         userId,
//         status: "active",
//       }).sort({ createdAt: -1 });

//       if (nextBike) {
//         nextBike.primary = true;
//         await nextBike.save();
//       }
//     }

//     logger.info(`✅ Bike deleted: ${id}`);

//     res.json({
//       success: true,
//       message: "Bike deleted successfully",
//       data: deletedBike?.toJSON(),
//     });
//   } catch (error: any) {
//     logger.error(`❌ Error deleting bike: ${error.message}`);
//     res.status(500).json({
//       success: false,
//       message: "Failed to delete bike",
//       error: error.message,
//     });
//   }
// };

export const deleteBike = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.userId;
    const { id } = req.params;

    logger.info(`Deleting bike ${id} for user ${userId}`);

    // Check ownership
    const bike = await Bike.findOne({ _id: id, userId }, null, { session });
    if (!bike) {
      await session.abortTransaction();
      res.status(404).json({
        success: false,
        message: "Bike not found or not authorized",
      });
      return;
    }

    // Soft delete WITH SESSION
    const deletedBike = await Bike.findByIdAndUpdate(
      id,
      { status: "archived" },
      { new: true, session },
    );

    // Remove from user's bikes array WITH SESSION
    await User.findByIdAndUpdate(userId, { $pull: { bikes: id } }, { session });

    // If this was primary, set another as primary WITH SESSION
    const primaryBike = await Bike.findOne(
      { userId, primary: true, status: "active" },
      null,
      { session },
    );

    if (!primaryBike) {
      const nextBike = await Bike.findOne({ userId, status: "active" }, null, {
        session,
      }).sort({ createdAt: -1 });

      if (nextBike) {
        nextBike.primary = true;
        await nextBike.save({ session });
      }
    }

    // Commit
    await session.commitTransaction();

    logger.info(`✅ Bike deleted: ${id}`);

    res.json({
      success: true,
      message: "Bike deleted successfully",
      data: deletedBike?.toJSON(),
    });
  } catch (error: any) {
    await session.abortTransaction();

    logger.error(`❌ Error deleting bike: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to delete bike",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Get primary bike
 * GET /api/v1/bikes/primary
 */
export const getPrimaryBike = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    logger.info(`Fetching primary bike for user ${userId}`);

    const primaryBike = await Bike.findOne({
      userId,
      primary: true,
      status: "active",
    });

    if (!primaryBike) {
      res.status(404).json({
        success: false,
        message: "No primary bike set. Please add a bike first.",
      });
      return;
    }

    res.json({
      success: true,
      data: primaryBike.toJSON(),
    });
  } catch (error: any) {
    logger.error(`❌ Error fetching primary bike: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch primary bike",
      error: error.message,
    });
  }
};

/**
 * Get bike count for user
 * GET /api/v1/bikes/count
 */
export const getBikeCount = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    const count = await Bike.countDocuments({
      userId,
      status: "active",
    });

    res.json({
      success: true,
      count,
    });
  } catch (error: any) {
    logger.error(`❌ Error getting bike count: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to get bike count",
      error: error.message,
    });
  }
};
