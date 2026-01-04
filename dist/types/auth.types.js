// ============================================
// AUTH ENUMS
// ============================================
export var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["UNVERIFIED"] = "unverified";
    VerificationStatus["PENDING"] = "pending";
    VerificationStatus["APPROVED"] = "approved";
    VerificationStatus["REJECTED"] = "rejected";
})(VerificationStatus || (VerificationStatus = {}));
export var AccountStatus;
(function (AccountStatus) {
    AccountStatus["ACTIVE"] = "active";
    AccountStatus["SUSPENDED"] = "suspended";
    AccountStatus["DEACTIVATED"] = "deactivated";
    AccountStatus["BANNED"] = "banned";
})(AccountStatus || (AccountStatus = {}));
export var SuspensionReason;
(function (SuspensionReason) {
    SuspensionReason["INAPPROPRIATE_BEHAVIOR"] = "inappropriate_behavior";
    SuspensionReason["VIOLATION_OF_WOMEN_ONLY"] = "violation_of_women_only";
    SuspensionReason["FAKE_VERIFICATION"] = "fake_verification";
    SuspensionReason["HARASSMENT"] = "harassment";
    SuspensionReason["FRAUD"] = "fraud";
    SuspensionReason["SPAM"] = "spam";
    SuspensionReason["OTHER"] = "other";
})(SuspensionReason || (SuspensionReason = {}));
//# sourceMappingURL=auth.types.js.map