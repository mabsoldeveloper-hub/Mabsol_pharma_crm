import mongoose, { Schema, model, models } from "mongoose";

export interface ILoginOtp {

  email: string;

  mobile: string;

  otp: string;

  attempts: number;

  verified: boolean;

  expiresAt: Date;

  createdAt: Date;

}

const LoginOtpSchema = new Schema<ILoginOtp>(

  {

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },

    otp: {
      type: String,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

  },
  {
    timestamps: true,
  }

);

// Auto delete after expiry

LoginOtpSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

// One OTP per email

LoginOtpSchema.index(
  {
    email: 1,
  },
  {
    unique: true,
  }
);

export default models.LoginOtp ||
model<ILoginOtp>("LoginOtp", LoginOtpSchema);