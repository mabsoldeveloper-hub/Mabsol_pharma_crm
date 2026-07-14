import mongoose, { Schema, models, model } from "mongoose";

export interface IOtp {

  email?: string;

  mobile?: string;

  type: "email" | "mobile";

  otp: string;

  verified: boolean;

  attempts: number;

  expiresAt: Date;

  createdAt: Date;

}

const otpSchema = new Schema<IOtp>(
  {

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    mobile: {
      type: String,
      trim: true,
    },

    type: {
      type: String,
      enum: ["email", "mobile"],
      required: true,
    },

    otp: {
      type: String,
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    attempts: {
      type: Number,
      default: 0,
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

// Automatically delete expired OTPs
otpSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

// Prevent duplicate OTP records
otpSchema.index(
  {
    email: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      email: {
        $exists: true,
      },
    },
  }
);

otpSchema.index(
  {
    mobile: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      mobile: {
        $exists: true,
      },
    },
  }
);

export default models.Otp || model<IOtp>("Otp", otpSchema);