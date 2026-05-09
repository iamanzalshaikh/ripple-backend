export enum UserRole {
  RIDER = "rider",
  CREATOR = "creator",
  BRAND_PARTNER = "brand_partner",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
  MODERATOR = "moderator",
}

export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
