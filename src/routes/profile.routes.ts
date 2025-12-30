import express from "express";
import isAuth from "../middlewares/auth.middleware";
import { addEmergencyContact, getMyProfile, updateAvatar, updateMyProfile, updatePrivacySettings } from "../controllers/profile.controller";
import upload from "../middlewares/upload.middleware";


const router = express.Router();

router.get("/me", isAuth, getMyProfile);
router.patch("/me", isAuth, updateMyProfile);
router.patch("/avatar", isAuth, upload.single("avatar"), updateAvatar);
router.post("/emergency-contacts", isAuth, addEmergencyContact);
router.patch("/privacy", isAuth, updatePrivacySettings);

export default router;
