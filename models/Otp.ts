import mongoose, { Schema, models, model } from "mongoose";

export interface IOtp {
    email: string;
    otp: string; // hashed OTP
    attempts: number;
    expiresAt: Date;
    createdAt: Date;
}

const OtpSchema = new Schema<IOtp>({
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    otp: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
});

// TTL index — MongoDB will auto-delete the document once expiresAt has passed
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = models.Otp || model<IOtp>("Otp", OtpSchema);

export default Otp;