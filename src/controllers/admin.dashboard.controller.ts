import { Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import logger from "../config/logger.js";
import * as analyticsService from "../services/analytics.service.js";

/**
 * Dashboard Controller
 * Handles admin dashboard analytics endpoints
 */

/**
 * @route   GET /api/admin/dashboard/users/overview
 * @desc    Get user overview metrics (total users, active users)
 * @access  Admin
 */
export const getUserOverview = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const data = await analyticsService.getUserOverviewMetrics();

    res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`getUserOverview error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user overview metrics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/dashboard/verification/stats
 * @desc    Get verification status metrics
 * @access  Admin
 */
export const getVerificationStats = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const data = await analyticsService.getVerificationMetrics();

    res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`getVerificationStats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch verification metrics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/dashboard/riding/stats
 * @desc    Get riding statistics
 * @access  Admin
 */
export const getRidingStats = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const data = await analyticsService.getRidingMetrics();

    res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`getRidingStats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch riding statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/dashboard/users/riding-levels
 * @desc    Get riding level distribution
 * @access  Admin
 */
export const getRidingLevels = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const data = await analyticsService.getRidingLevelDistribution();

    res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`getRidingLevels error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch riding level distribution",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/dashboard/users/geography
 * @desc    Get geographic distribution of users
 * @access  Admin
 */
export const getGeography = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const data = await analyticsService.getGeographyMetrics();

    res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`getGeography error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch geography metrics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/dashboard/bikes/stats
 * @desc    Get bike ownership statistics
 * @access  Admin
 */
export const getBikeStats = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const data = await analyticsService.getBikeMetrics();

    res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`getBikeStats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bike statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/dashboard/accounts/status
 * @desc    Get account status breakdown
 * @access  Admin
 */
export const getAccountStatus = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const data = await analyticsService.getAccountStatusMetrics();

    res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`getAccountStatus error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch account status metrics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/dashboard/marketplace/stats
 * @desc    Get marketplace statistics
 * @access  Admin
 */
export const getMarketplaceStats = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const data = await analyticsService.getMarketplaceMetrics();

    res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`getMarketplaceStats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch marketplace statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
