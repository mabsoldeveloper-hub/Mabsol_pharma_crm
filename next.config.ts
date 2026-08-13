import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    "mongoose",
    "mongodb",
    "pdfkit",
    "bcryptjs",
    "nodemailer",
    "exceljs",
    "jszip",
  ],
  typescript: {
    // Type checking is done separately; don't block the production build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
