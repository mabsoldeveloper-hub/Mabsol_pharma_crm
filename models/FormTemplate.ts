import mongoose, { Schema, models, model } from "mongoose";

export interface IFormField {
  id: string;
  key: string;
  label: string;
  type:
    | "text"
    | "number"
    | "date"
    | "select"
    | "textarea"
    | "checkbox"
    | "radio"
    | "mappedTable";
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select or radio
  mappedTable?: string; // e.g. Customer, Product, User, MrDcr
  mappedField?: string; // e.g. partyName, productName
  defaultValue?: any;
  order: number;
  section?: string;
  stepId?: string; // For multi-step wizard
  helpText?: string;
}

export interface IFormCondition {
  id: string;
  sourceFieldKey: string;
  operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan" | "isFilled";
  compareValue: string;
  targetFieldKey: string;
  action: "show" | "hide" | "require";
}

export interface IFormStep {
  id: string;
  title: string;
  description?: string;
  order: number;
}

const FormFieldSchema = new Schema({
  id: { type: String, required: true },
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: [
      "text",
      "number",
      "date",
      "select",
      "textarea",
      "checkbox",
      "radio",
      "mappedTable",
    ],
    default: "text",
  },
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: "" },
  options: { type: [String], default: [] },
  mappedTable: { type: String, default: "" },
  mappedField: { type: String, default: "" },
  defaultValue: { type: Schema.Types.Mixed, default: "" },
  order: { type: Number, default: 0 },
  section: { type: String, default: "General Details" },
  stepId: { type: String, default: "step_1" },
  helpText: { type: String, default: "" },
});

const FormConditionSchema = new Schema({
  id: { type: String, required: true },
  sourceFieldKey: { type: String, required: true },
  operator: {
    type: String,
    enum: ["equals", "notEquals", "contains", "greaterThan", "lessThan", "isFilled"],
    default: "equals",
  },
  compareValue: { type: String, default: "" },
  targetFieldKey: { type: String, required: true },
  action: {
    type: String,
    enum: ["show", "hide", "require"],
    default: "show",
  },
});

const FormStepSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  order: { type: Number, default: 0 },
});

const FormTemplateSchema = new Schema(
  {
    tenantId: { type: String, default: "TENANT001" },
    companyId: { type: Schema.Types.ObjectId, ref: "Company" },
    formId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, default: "General", trim: true },
    status: {
      type: String,
      enum: ["Active", "Draft", "Archived"],
      default: "Active",
    },
    icon: { type: String, default: "FaClipboardList" },

    // Fields & Steps
    fields: [FormFieldSchema],
    isMultiStep: { type: Boolean, default: false },
    steps: { type: [FormStepSchema], default: [] },

    // Conditional IF/THEN Rules
    conditions: { type: [FormConditionSchema], default: [] },

    // Access & Security
    accessMode: {
      type: String,
      enum: ["Internal", "Public", "PasswordProtected"],
      default: "Internal",
    },
    accessPin: { type: String, default: "" },

    // Manager Approval Workflow
    approvalWorkflow: {
      enabled: { type: Boolean, default: false },
      approverRole: { type: String, default: "Admin" }, // Admin, RSM, ZSM
    },

    // Auto Database Record Sync Engine
    autoMasterSync: {
      enabled: { type: Boolean, default: false },
      targetModel: { type: String, default: "" }, // e.g. Customer, MrCallLog
    },

    // Custom Theme & Styling
    theme: {
      accentColor: { type: String, default: "#4f46e5" }, // Indigo default
      logoUrl: { type: String, default: "" },
      headerBanner: { type: String, default: "" },
    },

    createdBy: {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      userName: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

export default models.FormTemplate || model("FormTemplate", FormTemplateSchema);
