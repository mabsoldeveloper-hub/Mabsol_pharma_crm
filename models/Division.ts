// import mongoose, { Schema, models, model } from "mongoose";

// const DivisionSchema = new Schema(
//   {
//     companyId: {
//       type: Schema.Types.ObjectId,
//       ref: "Company",
//       required: true,
//     },

//     divisionCode: {
//       type: String,
//       required: true,
//       trim: true,
//       uppercase: true,
//     },

//     divisionName: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     shortName: {
//       type: String,
//       trim: true,
//       default: "",
//     },

//     description: {
//       type: String,
//       trim: true,
//       default: "",
//     },

//     status: {
//       type: String,
//       enum: ["Active", "Inactive"],
//       default: "Active",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Same company me duplicate division code allow nahi hoga
// DivisionSchema.index(
//   {
//     companyId: 1,
//     divisionCode: 1,
//   },
//   {
//     unique: true,
//   }
// );

// // Same company me duplicate division name bhi allow nahi hoga
// DivisionSchema.index(
//   {
//     companyId: 1,
//     divisionName: 1,
//   },
//   {
//     unique: true,
//   }
// );

// export default models.Division || model("Division", DivisionSchema);

import mongoose, { Schema, models, model } from "mongoose";

const DivisionSchema = new Schema(
  {
    companyCode: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    divisionCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    divisionName: {
      type: String,
      required: true,
      trim: true,
    },

    shortName: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

// Same Company me duplicate Division Code allow nahi
DivisionSchema.index(
  {
    companyCode: 1,
    divisionCode: 1,
  },
  {
    unique: true,
  }
);

export default models.Division || model("Division", DivisionSchema);