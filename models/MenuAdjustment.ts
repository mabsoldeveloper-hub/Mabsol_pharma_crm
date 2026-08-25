import mongoose from "mongoose";

export interface ISubMenuItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  permission?: string;
  isVisible: boolean;
  order: number;
}

export interface IMenuItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  href?: string;
  isGroup: boolean;
  permission?: string;
  isVisible: boolean;
  order: number;
  subItems?: ISubMenuItem[];
}

const SubMenuItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    href: { type: String, required: true },
    icon: { type: String, default: "FaListUl" },
    permission: { type: String, default: "" },
    isVisible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const MenuItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    icon: { type: String, default: "FaLayerGroup" },
    color: { type: String, default: "indigo" },
    href: { type: String, default: "" },
    isGroup: { type: Boolean, default: false },
    permission: { type: String, default: "" },
    isVisible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    subItems: [SubMenuItemSchema],
  },
  { _id: false }
);

const MenuAdjustmentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      default: "TENANT001",
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    financialYearId: {
      type: String,
      default: "ALL",
      index: true,
    },
    isCustomized: {
      type: Boolean,
      default: true,
    },
    items: [MenuItemSchema],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookups per company and FY
MenuAdjustmentSchema.index({ companyId: 1, financialYearId: 1 }, { unique: true });

export default mongoose.models.MenuAdjustment ||
  mongoose.model("MenuAdjustment", MenuAdjustmentSchema);
