import express from "express";
import isAuth from "../middlewares/auth.middleware.js";
import {
  addEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContacts,
  getMyProfile,
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

router.get("/me", isAuth, getMyProfile);
router.patch("/me", isAuth, updateMyProfile);
router.get("/:userId", isAuth, getUserProfile);
router.patch("/avatar", isAuth, upload.single("avatar"), updateAvatar);
// router.post("/emergency-contacts", isAuth, addEmergencyContact);
router.patch("/privacy", isAuth, updatePrivacySettings);

// Push notification token
router.patch("/push-token", isAuth, updatePushToken);

// Emergency contacts routes
router.get("/emergency-contacts", isAuth, getEmergencyContacts);
router.post("/emergency-contacts", isAuth, addEmergencyContact);
router.patch("/emergency-contacts/:id", isAuth, updateEmergencyContact);
router.delete("/emergency-contacts/:id", isAuth, deleteEmergencyContact);
router.patch("/emergency-contacts-reorder", isAuth, reorderEmergencyContacts);

export default router;
