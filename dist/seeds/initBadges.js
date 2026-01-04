// src/seeds/initBadges.ts
import Badge from "../models/badge.model.js";
import { BADGES } from "./badges.seed";
export const initBadges = async () => {
    console.log("🏷️ Initializing badges...");
    for (const badge of BADGES) {
        const exists = await Badge.findOne({ code: badge.code });
        if (!exists) {
            await Badge.create(badge);
            console.log(`✅ Created badge: ${badge.code}`);
        }
    }
    console.log("🏁 Badge init done");
};
//# sourceMappingURL=initBadges.js.map