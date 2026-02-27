import express from "express";
import isAuth from "../middlewares/auth.middleware.js";
import {
  addEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContacts,
  getMyProfile,
  getNearbyRiders,
  getUserProfile,
  reorderEmergencyContacts,
  updateAvatar,
  updateEmergencyContact,
  updateMyProfile,
  updatePrivacySettings,
  updatePushToken,
} from "../controllers/profile.controller.js";
import upload from "../middlewares/upload.middleware.js";

const router: express.Router = express.Router();

// Current user profile
router.get("/me", isAuth, getMyProfile);
router.patch("/me", isAuth, updateMyProfile);

// Avatar and privacy
router.patch("/avatar", isAuth, upload.single("avatar"), updateAvatar);
router.patch("/privacy", isAuth, updatePrivacySettings);

// Push notification token
router.patch("/push-token", isAuth, updatePushToken);

// Riders nearby (for Rider Radar map)
router.get("/nearby", getNearbyRiders);

// Emergency contacts routes (must be before the :userId route)
router.get("/emergency-contacts", isAuth, getEmergencyContacts);
router.post("/emergency-contacts", isAuth, addEmergencyContact);
router.patch("/emergency-contacts/:id", isAuth, updateEmergencyContact);
router.delete("/emergency-contacts/:id", isAuth, deleteEmergencyContact);
router.patch("/emergency-contacts-reorder", isAuth, reorderEmergencyContacts);

// Other users' profiles (keep last to avoid catching specific paths)
router.get("/:userId", isAuth, getUserProfile);

export default router;
