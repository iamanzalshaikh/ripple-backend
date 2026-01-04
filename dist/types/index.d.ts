export declare enum UserRole {
    RIDER = "rider",
    CREATOR = "creator",
    BRAND_PARTNER = "brand_partner",
    ADMIN = "admin",
    SUPER_ADMIN = "super_admin",
    MODERATOR = "moderator"
}
export declare enum RidePrivacy {
    PRIVATE = "private",
    FRIENDS = "friends",
    PUBLIC = "public"
}
export declare enum ProfileVisibility {
    PUBLIC = "public",
    FRIENDS = "friends",
    PRIVATE = "private"
}
export declare enum RidingLevel {
    BEGINNER = "Beginner",
    INTERMEDIATE = "Intermediate",
    ADVANCED = "Advanced",
    EXPERT = "Expert"
}
export declare enum RidingStyle {
    TRACK = "Track",
    TOURING = "Touring",
    STREET = "Street",
    COMMUTE = "Commute",
    RACING = "Racing"
}
export declare enum EventStatus {
    DRAFT = "draft",
    APPROVED = "approved",
    LIVE = "live",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export interface IPrivacySettings {
    profileVisibility: ProfileVisibility;
    rideVisibility: RidePrivacy;
    showLocation: boolean;
    allowMessages: boolean;
    allowFollowing: boolean;
    allowAIFeatures: boolean;
}
export interface IUser {
    _id: string;
    phone: string;
    email?: string;
    handle?: string;
    name?: string;
    password?: string;
    avatarUrl?: string;
    bio?: string;
    country: string;
    state?: string;
    city?: string;
    verified: boolean;
    verificationPhotos: any;
    emergencyContacts: any[];
    bikes: string[];
    ridingStyle: RidingStyle[];
    ridingLevel: RidingLevel;
    ridingHours: number;
    yearsOfExperience: number;
    followers: string[];
    following: string[];
    followerCount: number;
    followingCount: number;
    totalBadges: number;
    badges: string[];
    totalDistance: number;
    totalRides: number;
    totalDuration: number;
    totalElevation: number;
    privacySettings: IPrivacySettings;
    role: UserRole;
    isCreator: boolean;
    creatorVerifiedAt?: Date;
    permissions: string[];
    accountStatus: string;
    isSuspended: boolean;
    suspensionReason?: string;
    suspendedAt?: Date;
    suspendedUntil?: Date;
    onboardingCompleted: boolean;
    onboardingStep: number;
    lastLoginAt?: Date;
    lastLoginIP?: string;
    pushTokens: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface IBike {
    _id: string;
    userId: string;
    brand: string;
    model: string;
    year?: number;
    color?: string;
    registrationNumber?: string;
    bikePhoto?: string;
    primary: boolean;
    mileage: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface IRide {
    _id: string;
    userId: string;
    bikeId?: string;
    polyline: Array<{
        lat: number;
        lng: number;
    }>;
    simplifiedPolyline: Array<{
        lat: number;
        lng: number;
    }>;
    distance: number;
    duration: number;
    avgSpeed: number;
    maxSpeed: number;
    elevationGain?: number;
    startedAt: Date;
    endedAt?: Date;
    privacy: RidePrivacy;
    liveShareEnabled: boolean;
    liveShareToken?: string;
    liveViewers: Array<{
        userId: string;
        joinedAt: Date;
    }>;
    emergencySosTriggered: boolean;
    sosLogId?: string;
    aiScore?: number;
    aiFeedback?: string[];
    postId?: string;
    status: "active" | "paused" | "completed";
    createdAt: Date;
    updatedAt: Date;
}
export interface IPost {
    _id: string;
    userId: string;
    media: Array<{
        url: string;
        type: string;
    }>;
    caption?: string;
    rideId?: string;
    location?: {
        lat: number;
        lng: number;
    };
    likes: string[];
    comments: Array<{
        userId: string;
        text: string;
        createdAt: Date;
    }>;
    privacy: RidePrivacy;
    createdAt: Date;
    updatedAt: Date;
}
export interface IEvent {
    _id: string;
    title: string;
    description?: string;
    location: string;
    geo?: {
        lat: number;
        lng: number;
    };
    startAt: Date;
    endAt?: Date;
    hostId: string;
    capacity?: number;
    bookedSeats: number;
    attendees: string[];
    price: number;
    rules?: string[];
    banner?: string;
    status: EventStatus;
    verified: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface IGroup {
    _id: string;
    name: string;
    description?: string;
    logoUrl?: string;
    memberCount: number;
    members: string[];
    admins: string[];
    private: boolean;
    verified: boolean;
    city?: string;
    activityLevel?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ISOSLog {
    _id: string;
    userId: string;
    rideId?: string;
    triggerType: "manual" | "crash_detection" | "auto_ride_end";
    triggeredAt: Date;
    location: {
        lat: number;
        lng: number;
    };
    resolvedAt?: Date;
    status: "active" | "resolved" | "false_positive";
    alerts: Array<{
        contactId: string;
        channel: "push" | "sms" | "email";
        sentAt: Date;
        delivered: boolean;
        acknowledged: boolean;
    }>;
    liveShareToken: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IListing {
    _id: string;
    userId: string;
    title: string;
    description: string;
    price: number;
    category: "bike" | "gear" | "accessory";
    media: string[];
    location: string;
    postedAt: Date;
    sold: boolean;
    views: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface IBadge {
    _id: string;
    code: string;
    name: string;
    description?: string;
    iconUrl: string;
    rule: {
        type: string;
        min?: number;
        max?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface IAward {
    _id: string;
    userId: string;
    badgeId: string;
    awardedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface IChallenge {
    _id: string;
    userId?: string;
    title: string;
    description: string;
    type: "personal" | "global" | "city";
    target: number;
    currentProgress: number;
    badgeId?: string;
    expiresAt: Date;
    recommended: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ICreator {
    _id: string;
    userId: string;
    socialLinks: {
        instagram?: string;
        youtube?: string;
        tiktok?: string;
        twitter?: string;
    };
    categories: string[];
    status: "pending" | "approved" | "rejected";
    mediaKit?: string;
    followerCount: number;
    totalContent: number;
    engagementRate: number;
    verifiedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface ISponsorship {
    _id: string;
    brandId: string;
    creatorId: string;
    title: string;
    description: string;
    budget: number;
    deliverables: string[];
    timeline: {
        start: Date;
        end: Date;
    };
    status: "pending" | "approved" | "rejected" | "active" | "completed";
    deliveryProof?: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface IApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}
export interface IPaginatedResponse<T = any> {
    success: boolean;
    message: string;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
//# sourceMappingURL=index.d.ts.map