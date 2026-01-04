// ============================================
// File: types/index.ts
// Core Type Definitions
// ============================================
// ============================================
// ROLE ENUM
// ============================================
export var UserRole;
(function (UserRole) {
    UserRole["RIDER"] = "rider";
    UserRole["CREATOR"] = "creator";
    UserRole["BRAND_PARTNER"] = "brand_partner";
    UserRole["ADMIN"] = "admin";
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["MODERATOR"] = "moderator";
})(UserRole || (UserRole = {}));
// ============================================
// PRIVACY & VISIBILITY ENUMS
// ============================================
export var RidePrivacy;
(function (RidePrivacy) {
    RidePrivacy["PRIVATE"] = "private";
    RidePrivacy["FRIENDS"] = "friends";
    RidePrivacy["PUBLIC"] = "public";
})(RidePrivacy || (RidePrivacy = {}));
export var ProfileVisibility;
(function (ProfileVisibility) {
    ProfileVisibility["PUBLIC"] = "public";
    ProfileVisibility["FRIENDS"] = "friends";
    ProfileVisibility["PRIVATE"] = "private";
})(ProfileVisibility || (ProfileVisibility = {}));
// ============================================
// RIDING PROFILE ENUMS
// ============================================
export var RidingLevel;
(function (RidingLevel) {
    RidingLevel["BEGINNER"] = "Beginner";
    RidingLevel["INTERMEDIATE"] = "Intermediate";
    RidingLevel["ADVANCED"] = "Advanced";
    RidingLevel["EXPERT"] = "Expert";
})(RidingLevel || (RidingLevel = {}));
export var RidingStyle;
(function (RidingStyle) {
    RidingStyle["TRACK"] = "Track";
    RidingStyle["TOURING"] = "Touring";
    RidingStyle["STREET"] = "Street";
    RidingStyle["COMMUTE"] = "Commute";
    RidingStyle["RACING"] = "Racing";
})(RidingStyle || (RidingStyle = {}));
// ============================================
// EVENT ENUMS
// ============================================
export var EventStatus;
(function (EventStatus) {
    EventStatus["DRAFT"] = "draft";
    EventStatus["APPROVED"] = "approved";
    EventStatus["LIVE"] = "live";
    EventStatus["COMPLETED"] = "completed";
    EventStatus["CANCELLED"] = "cancelled";
})(EventStatus || (EventStatus = {}));
//# sourceMappingURL=index.js.map