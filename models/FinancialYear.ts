import mongoose from "mongoose";

const FinancialYearSchema =
new mongoose.Schema({

  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
  },

  yearName: String,

  startDate: Date,

  endDate: Date,

  isCurrent: {
    type: Boolean,
    default: false,
  },

});

export default
mongoose.models.FinancialYear ||
mongoose.model(
  "FinancialYear",
  FinancialYearSchema
);