import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendOtpEmail } from "@/lib/sendEmail";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: Request) {
    try {
        await connectDB();

        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ success: false, message: "Email is required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal whether the email exists
            return NextResponse.json({ success: true, message: "If an account exists, a code has been sent" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);

        await Otp.deleteMany({ email: user.email });
        await Otp.create({
            email: user.email,
            type: "email",
            otp: hashedOtp,
            expiresAt: new Date(Date.now() + OTP_TTL_MS),
        });

        await sendOtpEmail(user.email, otp);

        return NextResponse.json({ success: true, message: "Verification code resent" });
    } catch (error: unknown) {
        console.error("RESEND OTP ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Couldn't resend code",
            },
            { status: 500 }
        );
    }
}  