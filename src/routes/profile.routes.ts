import express from "express";
import isAuth from "../middlewares/auth.middleware";
import { addEmergencyContact, deleteEmergencyContact, getEmergencyContacts, getMyProfile, reorderEmergencyContacts, updateAvatar, updateEmergencyContact, updateMyProfile, updatePrivacySettings } from "../controllers/profile.controller";
import upload from "../middlewares/upload.middleware";

const router: express.Router = express.Router();

router.get("/me", isAuth, getMyProfile);
router.patch("/me", isAuth, updateMyProfile);
router.patch("/avatar", isAuth, upload.single("avatar"), updateAvatar);
// router.post("/emergency-contacts", isAuth, addEmergencyContact);
router.patch("/privacy", isAuth, updatePrivacySettings);

// Emergency contacts routes
router.get('/emergency-contacts', isAuth, getEmergencyContacts);
router.post("/emergency-contacts", isAuth, addEmergencyContact);
router.patch('/emergency-contacts/:id', isAuth, updateEmergencyContact);
router.delete('/emergency-contacts/:id', isAuth, deleteEmergencyContact);
router.patch('/emergency-contacts-reorder', isAuth, reorderEmergencyContacts);

export default router;
