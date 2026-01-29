// ==========================================
// File: src/controllers/sponsorship.controller.ts
// Sponsorship Controller (Campaigns, Contracts, Deliverables)
// ==========================================
import { Response } from "express";
import { AuthRequest } from "../types/auth.types.js";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import User from "../models/user.model.js";
import CreatorApplication from "../models/creatorApplication.model.js";
import Brand from "../models/brand.model.js";
import Campaign from "../models/campaign.model.js";
import CreatorApplicationToCampaign from "../models/creatorApplicationToCampaign.model.js";
import Contract from "../models/contract.model.js";
import Deliverable from "../models/deliverable.model.js";
import Payment from "../models/payment.model.js";
import Notification from "../models/notification.model.js";
import logger from "../config/logger.js";

/**
 * GET /api/v1/sponsorship/campaigns/public
 * Public list of active campaigns for discovery feed
 */
export const listPublicCampaigns = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const limit = parseInt((req.query.limit as string) || "20", 10);

    const campaigns = await Campaign.find({
      status: "active",
      approvedByAdmin: true,
      applicationDeadline: { $gt: new Date() },
    })
      .populate("brandId", "name logo category")
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .lean();

    res.status(200).json({
      success: true,
      data: campaigns,
    });
  } catch (error: any) {
    logger.error(`Error in listPublicCampaigns: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * POST /api/v1/sponsorship/campaign
 * Create a new campaign (Admin/Brand only)
 */
export const createCampaign = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      brandId,
      title,
      description,
      targeting,
      budgetRange,
      deliverables,
      timeline,
      applicationDeadline,
      budgetMin,
      budgetMax,
      heroImage,
    } = req.body;

    // Validate required fields
    if (!brandId || !title || !description || (!budgetRange && (budgetMin == null || budgetMax == null)) || !deliverables || !timeline || !applicationDeadline) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      res.status(404).json({
        success: false,
        message: "Brand not found",
      });
      return;
    }

    // Normalise budget range (support both budgetRange.min/max and budgetMin/budgetMax payloads)
    const minValue =
      budgetRange && typeof budgetRange.min !== "undefined"
        ? Number(budgetRange.min)
        : Number(budgetMin);
    const maxValue =
      budgetRange && typeof budgetRange.max !== "undefined"
        ? Number(budgetRange.max)
        : Number(budgetMax);

    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      res.status(400).json({
        success: false,
        message: "Budget min and max must be valid numbers",
      });
      return;
    }

    // Create campaign
    const campaign = new Campaign({
      brandId,
      title,
      description,
      targeting: targeting || {},
      heroImage,
      budgetRange: {
        min: minValue,
        max: maxValue,
      },
      deliverables,
      timeline,
      applicationDeadline: new Date(applicationDeadline),
      status: "draft",
      approvedByAdmin: false,
    });

    await campaign.save();

    logger.info(`Campaign created: ${campaign._id} by admin ${req.adminId}`);

    res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      data: campaign,
    });
  } catch (error: any) {
    logger.error(`Error in createCampaign: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to create campaign",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * PATCH /api/v1/sponsorship/campaign/:id/approve
 * Admin approves campaign (Step 102)
 */
export const approveCampaign = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    campaign.approvedByAdmin = true;
    campaign.status = "active";
    campaign.approvedAt = new Date();
    campaign.approvedBy = req.adminId as any;

    await campaign.save();

    logger.info(`Campaign approved: ${id} by admin ${req.adminId}`);

    res.json({
      success: true,
      message: "Campaign approved and activated",
      data: campaign,
    });
  } catch (error: any) {
    logger.error(`Error in approveCampaign: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to approve campaign",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * GET /api/v1/sponsorship/campaigns/matching
 * Get matching campaigns for creator (Step 103)
 */
export const getMatchingCampaigns = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;

    // Check if user is approved creator
    const creator = await CreatorApplication.findOne({
      userId,
      status: "approved",
    });

    if (!creator) {
      res.status(403).json({
        success: false,
        message: "You are not an approved creator",
      });
      return;
    }

    // Get active campaigns with deadline not passed
    const campaigns = await Campaign.find({
      status: "active",
      approvedByAdmin: true,
      applicationDeadline: { $gt: new Date() },
    })
      .populate("brandId", "name logo category")
      .sort({ createdAt: -1 })
      .lean();

    // Optional: Filter by city/state/category match
    // This is simplified - you can enhance matching logic

    res.json({
      success: true,
      data: campaigns,
    });
  } catch (error: any) {
    logger.error(`Error in getMatchingCampaigns: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * GET /api/v1/sponsorship/campaigns/my-applications
 * Get campaigns that the creator has applied to
 */
export const getMyCampaignApplications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;

    // Check if user is approved creator
    const creator = await CreatorApplication.findOne({
      userId,
      status: "approved",
    });

    if (!creator) {
      res.status(403).json({
        success: false,
        message: "You are not an approved creator",
      });
      return;
    }

    // Get all applications by this creator
    const applications = await CreatorApplicationToCampaign.find({
      creatorId: userId,
    })
      .populate({
        path: "campaignId",
        populate: { path: "brandId", select: "name logo category" },
      })
      .sort({ submittedAt: -1 })
      .lean();

    // Extract campaigns from applications
    const campaigns = applications
      .map((app: any) => app.campaignId)
      .filter((campaign: any) => campaign !== null && campaign !== undefined);

    res.json({
      success: true,
      data: campaigns.map((campaign: any) => ({
        ...campaign,
        applicationStatus: applications.find(
          (app: any) => app.campaignId?._id?.toString() === campaign._id?.toString()
        )?.status,
      })),
    });
  } catch (error: any) {
    logger.error(`Error in getMyCampaignApplications: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your campaign applications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * POST /api/v1/sponsorship/campaign/:id/apply
 * Creator applies to campaign (Step 104)
 */
export const applyToCampaign = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: campaignId } = req.params;
    const { proposal, expectedPosts, priceQuote } = req.body;

    // Check if user is approved creator
    const creator = await CreatorApplication.findOne({
      userId,
      status: "approved",
    });

    if (!creator) {
      res.status(403).json({
        success: false,
        message: "You are not an approved creator",
      });
      return;
    }

    // Check if campaign exists and is active
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    if (campaign.status !== "active" || !campaign.approvedByAdmin) {
      res.status(400).json({
        success: false,
        message: "Campaign is not accepting applications",
      });
      return;
    }

    if (new Date() > campaign.applicationDeadline) {
      res.status(400).json({
        success: false,
        message: "Application deadline has passed",
      });
      return;
    }

    // Check if already applied
    const existing = await CreatorApplicationToCampaign.findOne({
      creatorId: userId,
      campaignId,
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: "You have already applied to this campaign",
        data: existing,
      });
      return;
    }

    // Provide safe defaults so creators can apply with 1-tap flows
    const safeProposal =
      proposal ||
      "Creator is interested in this campaign and agrees to discuss final deliverables and dates.";
    const safeExpectedPosts = expectedPosts || 1;

    // Create application
    const application = new CreatorApplicationToCampaign({
      creatorId: userId,
      campaignId,
      proposal: safeProposal,
      expectedPosts: safeExpectedPosts,
      priceQuote,
      status: "applied",
    });

    await application.save();

    logger.info(`Creator ${userId} applied to campaign ${campaignId}`);

    // TODO: Notify admin/brand (requires mapping between brand and admin users)

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: application,
    });
  } catch (error: any) {
    logger.error(`Error in applyToCampaign: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to submit application",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * PATCH /api/v1/sponsorship/campaign/:campaignId/application/:appId/shortlist
 * Admin shortlists creator application (Step 105)
 */
export const shortlistApplication = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { appId } = req.params;

    const application = await CreatorApplicationToCampaign.findById(appId);
    if (!application) {
      res.status(404).json({
        success: false,
        message: "Application not found",
      });
      return;
    }

    application.status = "shortlisted";
    application.reviewedAt = new Date();
    application.reviewedBy = req.adminId as any;

    await application.save();

    logger.info(`Application shortlisted: ${appId}`);

    // TODO: Notify creator

    res.json({
      success: true,
      message: "Application shortlisted",
      data: application,
    });
  } catch (error: any) {
    logger.error(`Error in shortlistApplication: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to shortlist application",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * PATCH /api/v1/sponsorship/campaign/:campaignId/application/:appId/reject
 * Admin rejects creator application
 */
export const rejectCampaignApplication = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { appId } = req.params;
    const { reason } = req.body as { reason?: string };

    const application = await CreatorApplicationToCampaign.findById(appId);
    if (!application) {
      res.status(404).json({
        success: false,
        message: "Application not found",
      });
      return;
    }

    if (application.status === "rejected") {
      res.status(400).json({
        success: false,
        message: "Application already rejected",
      });
      return;
    }

    application.status = "rejected";
    application.rejectionReason =
      reason || "Not a fit for this campaign at the moment.";
    application.reviewedAt = new Date();
    application.reviewedBy = req.adminId as any;

    await application.save();

    logger.info(`Application rejected: ${appId}`);

    // TODO: Notify creator about rejection

    res.json({
      success: true,
      message: "Application rejected",
      data: application,
    });
  } catch (error: any) {
    logger.error(`Error in rejectCampaignApplication: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to reject application",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * POST /api/v1/sponsorship/contract
 * Create contract after creator selection (Step 106)
 */
export const createContract = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      campaignId,
      creatorId,
      brandId,
      terms,
      deliverables,
      paymentTerms,
      escrowAmount,
      milestones,
    } = req.body;

    // Validate required fields
    if (!campaignId || !creatorId || !brandId || !terms || !deliverables || !paymentTerms || !escrowAmount) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    // Verify campaign and creator application
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    const application = await CreatorApplicationToCampaign.findOne({
      campaignId,
      creatorId,
      status: { $in: ["shortlisted", "selected"] },
    });

    if (!application) {
      res.status(400).json({
        success: false,
        message: "Creator application not found or not selected",
      });
      return;
    }

    // Create contract
    const contract = new Contract({
      campaignId,
      creatorId,
      brandId,
      terms,
      deliverables,
      paymentTerms,
      escrowAmount,
      milestones: milestones || [],
      // For now, we treat escrow as immediately held and contract as active (mock payment)
      escrowStatus: "held",
      status: "active",
    });

    await contract.save();

    // MOCK: Create an escrow payment record (no real Razorpay call)
    // In future, replace this with actual Razorpay order creation.
    await Payment.create({
      userId: creatorId,
      contractId: contract._id,
      amount: escrowAmount,
      status: "paid",
      provider: "mock",
      type: "escrow",
      escrowStatus: "held",
      metadata: {
        note: "Mock escrow payment created on contract creation",
      },
    });

    // Notify creator about new contract
    await Notification.create({
      userId: creatorId,
      type: "contract_created",
      contractId: contract._id,
      campaignId: campaign._id,
      message: `You have a new sponsorship contract for campaign "${campaign.title}".`,
      read: false,
    });

    // Update application status to selected
    application.status = "selected";
    await application.save();

    logger.info(`Contract created: ${contract._id} for creator ${creatorId}`);

    // TODO: Create Razorpay escrow order
    // TODO: Notify creator

    res.status(201).json({
      success: true,
      message: "Contract created successfully",
      data: contract,
    });
  } catch (error: any) {
    logger.error(`Error in createContract: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to create contract",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * POST /api/v1/sponsorship/deliverable
 * Creator submits deliverable (Step 108)
 */
export const submitDeliverable = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { contractId, description, postId, postUrl, draftUrl, insightsScreenshot } = req.body;

    if (!contractId || !description) {
      res.status(400).json({
        success: false,
        message: "Contract ID and description are required",
      });
      return;
    }

    // Verify contract belongs to creator
    const contract = await Contract.findById(contractId);
    if (!contract) {
      res.status(404).json({
        success: false,
        message: "Contract not found",
      });
      return;
    }

    if (contract.creatorId.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: "Unauthorized: This contract does not belong to you",
      });
      return;
    }

    if (contract.status !== "active") {
      res.status(400).json({
        success: false,
        message: "Contract is not active",
      });
      return;
    }

    // Create deliverable
    const deliverable = new Deliverable({
      contractId,
      creatorId: userId,
      description,
      postId,
      postUrl,
      draftUrl,
      insightsScreenshot,
      approved: false,
    });

    await deliverable.save();

    logger.info(`Deliverable submitted: ${deliverable._id} for contract ${contractId}`);

    // TODO: Notify admin/brand

    res.status(201).json({
      success: true,
      message: "Deliverable submitted successfully",
      data: deliverable,
    });
  } catch (error: any) {
    logger.error(`Error in submitDeliverable: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to submit deliverable",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * PATCH /api/v1/sponsorship/deliverable/:id/approve
 * Admin/Brand approves deliverable
 */
export const approveDeliverable = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { feedback } = (req.body || {}) as { feedback?: string };

    const deliverable = await Deliverable.findById(id).populate("contractId");
    if (!deliverable) {
      res.status(404).json({
        success: false,
        message: "Deliverable not found",
      });
      return;
    }

    deliverable.approved = true;
    deliverable.approvedAt = new Date();
    deliverable.approvedBy = req.adminId as any;
    if (feedback) deliverable.feedback = feedback;

    await deliverable.save();

    logger.info(`Deliverable approved: ${id} by admin ${req.adminId}`);

    // MOCK PAYMENT FLOW:
    // - Find the first pending milestone on the contract
    // - Mark it as paid
    // - Create a mock Payment record of type 'milestone'
    // - If all milestones are now paid, mark contract as completed and escrow as released

    const contract = deliverable.contractId as any;

    if (contract) {
      // Reload full contract document to ensure we have up-to-date milestones
      const fullContract = await Contract.findById(contract._id);

      if (fullContract && Array.isArray(fullContract.milestones) && fullContract.milestones.length > 0) {
        const pendingIndex = fullContract.milestones.findIndex(
          (m: any) => m.status === "pending" && !m.paid
        );

        if (pendingIndex !== -1) {
          const milestone = fullContract.milestones[pendingIndex] as any;

          // Mark milestone as paid in the contract
          milestone.status = "paid";
          milestone.paid = true;
          milestone.paidAt = new Date();

          // Create mock payment record for this milestone
          const payment = await Payment.create({
            userId: fullContract.creatorId,
            contractId: fullContract._id,
            milestoneId: String(pendingIndex),
            amount: milestone.amount,
            status: "paid",
            provider: "mock",
            type: "milestone",
            metadata: {
              note: "Mock milestone payment created on deliverable approval",
              deliverableId: deliverable._id,
            },
          });

          milestone.paymentId = payment._id;

          // Check if all milestones are now paid
          const allPaid = fullContract.milestones.every((m: any) => m.paid);
          if (allPaid) {
            fullContract.status = "completed";
            fullContract.escrowStatus = "released";
          }

          await fullContract.save();

          logger.info(
            `[Sponsorship] Milestone paid (mock) for contract ${fullContract._id}, milestone index ${pendingIndex}`
          );

          // Notify creator about milestone payment
          await Notification.create({
            userId: fullContract.creatorId,
            type: "milestone_paid",
            contractId: fullContract._id,
            message: "One of your sponsorship milestones has been marked as paid.",
            read: false,
          });

          // If contract completed, send final notification
          if (allPaid) {
            await Notification.create({
              userId: fullContract.creatorId,
              type: "contract_completed",
              contractId: fullContract._id,
              message:
                "Your sponsorship contract has been fully completed and all milestones are paid.",
              read: false,
            });
          }
        }
      }
    }

    // NOTE: Notification to creator can be wired via Notification model later.

    res.json({
      success: true,
      message: "Deliverable approved and mock payment processed (if applicable)",
      data: deliverable,
    });
  } catch (error: any) {
    logger.error(`Error in approveDeliverable: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to approve deliverable",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * PATCH /api/v1/sponsorship/deliverable/:id/reject
 * Admin/Brand rejects deliverable with feedback (no payment)
 */
export const rejectDeliverable = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { feedback } = (req.body || {}) as { feedback?: string };

    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      res.status(404).json({
        success: false,
        message: "Deliverable not found",
      });
      return;
    }

    if (deliverable.approved) {
      res.status(400).json({
        success: false,
        message: "Approved deliverables cannot be rejected",
      });
      return;
    }

    deliverable.approved = false;
    deliverable.feedback =
      feedback || "Please adjust the content as per the campaign brief.";
    deliverable.rejectedAt = new Date();

    await deliverable.save();

    logger.info(`Deliverable rejected: ${id} by admin ${req.adminId}`);

    res.json({
      success: true,
      message: "Deliverable rejected with feedback",
      data: deliverable,
    });
  } catch (error: any) {
    logger.error(`Error in rejectDeliverable: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to reject deliverable",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * GET /api/v1/sponsorship/deliverables
 * Admin: list deliverables with basic filters
 */
export const listDeliverables = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "20",
      status = "",
      contractId = "",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (status === "approved") {
      query.approved = true;
    } else if (status === "pending") {
      query.approved = false;
    }
    if (contractId) {
      query.contractId = contractId;
    }

    const [items, total] = await Promise.all([
      Deliverable.find(query)
        .populate("contractId", "campaignId brandId")
        .populate({
          path: "contractId",
          populate: [
            { path: "campaignId", select: "title" },
            { path: "brandId", select: "name logo" },
          ],
        })
        .populate("creatorId", "name email avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Deliverable.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        deliverables: items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error(`Error in listDeliverables: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deliverables",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * GET /api/v1/sponsorship/contracts/my
 * List contracts for the current creator (to show in app)
 */
export const listMyContracts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;

    const contracts = await Contract.find({ creatorId: userId })
      .populate("campaignId", "title timeline applicationDeadline")
      .populate("brandId", "name logo category")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: contracts,
    });
  } catch (error: any) {
    logger.error(`Error in listMyContracts: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contracts",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

