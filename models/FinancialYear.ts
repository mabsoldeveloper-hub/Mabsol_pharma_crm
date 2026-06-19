import mongoose from "mongoose";

const FinancialYearSchema =
new mongoose.Schema(
{
  tenantId: {
    type: String,
    default: "TENANT001",
  },


  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company"
  },

  fyName: {
    type: String,
    required: true,
  },

  startDate: {
    type: Date,
    required: true,
  },

  endDate: {
    type: Date,
    required: true,
  },

  isCurrent: {
    type: Boolean,
    default: false,
  },

  status: {
    type: String,
    default: "Active",
  },

},
{
  timestamps: true,
}
);

export default
mongoose.models.FinancialYear ||
mongoose.model(
  "FinancialYear",
  FinancialYearSchema
);