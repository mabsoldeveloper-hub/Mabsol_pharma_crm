import mongoose from "mongoose";

const UserThemeSchema = new mongoose.Schema(
  {
    themeKey: {
      type: String,
      default: "mabsol_global_theme",
      unique: true,
    },
    selectedTheme: {
      type: String,
      default: "auto",
    },
    customColors: {
      bodyBg: { type: String, default: "#0b193c" },
      formCardBg: { type: String, default: "#0f172a" },
      syncCardBg: { type: String, default: "#1e293b" },
      buttonBg: { type: String, default: "#0284c7" },
      accent: { type: String, default: "#38bdf8" },
      badgeBg: { type: String, default: "#0f172a" },
      textColor: { type: String, default: "#ffffff" },
    },
  },
  { timestamps: true }
);

export default mongoose.models.UserTheme || mongoose.model("UserTheme", UserThemeSchema);
