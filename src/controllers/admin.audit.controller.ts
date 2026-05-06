import { Request, Response } from "express";
import AuditLog from "../models/auditLog.model.js";
import logger from "../config/logger.js";

/**
 * Record an administrative action (Internal Helper)
 */
export const recordAuditAction = async (data: {
  adminId: string;
  action: string;
  targetType: "USER" | "POST" | "RIDE" | "LISTING" | "BRAND" | "EVENT";
  targetId: string;
  details: string;
  metadata?: any;
}) => {
  try {
    await AuditLog.create(data);
  } catch (error) {
    logger.error("❌ Failed to record audit log:", error);
  }
};

/**
 * @desc    Get all audit logs with filters
 * @route   GET /api/v1/admin/audit
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = {};
    
    if (req.query.adminId) query.adminId = req.query.adminId;
    if (req.query.targetType) query.targetType = req.query.targetType;
    if (req.query.action) query.action = { $regex: req.query.action, $options: "i" };

    const logs = await AuditLog.find(query)
      .populate("adminId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error(`getAuditLogs error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
};

/**
 * @desc    Get audit logs for a specific target
 * @route   GET /api/v1/admin/audit/target/:type/:id
 */
export const getTargetAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, id } = req.params;

    const logs = await AuditLog.find({ 
      targetType: type.toUpperCase(), 
      targetId: id 
    })
      .populate("adminId", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    logger.error(`getTargetAuditLogs error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch target audit logs" });
  }
};
