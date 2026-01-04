export declare const sendSignupOtpEmail: (to: string, otp: string | number, phone: string) => Promise<import("nodemailer/lib/smtp-transport/index.js").SentMessageInfo>;
export declare const sendLoginOtpEmail: (to: string, otp: string | number, phone: string) => Promise<import("nodemailer/lib/smtp-transport/index.js").SentMessageInfo>;
interface EmailAlertOptions {
    contactName: string;
    location: {
        lat: number;
        lng: number;
    };
    liveUrl: string;
    isLocationUpdate?: boolean;
    updateNumber?: number;
}
export declare const sendEmailAlert: (email: string, options: EmailAlertOptions) => Promise<boolean>;
export {};
//# sourceMappingURL=mail.d.ts.map