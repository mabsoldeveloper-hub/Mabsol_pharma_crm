import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";

// export async function GET() {
//   try {
//     await connectDB();

//     const company = await Company.findOne()
//       .sort({ createdAt: -1 });

//     return NextResponse.json(company);

//   } catch (error: any) {
//     console.log(error);

//     return NextResponse.json(
//       {
//         error: error.message,
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }
export async function GET() {
  try {
    await connectDB();

    const companies = await Company.find().sort({
      createdAt: -1,
    });

    return NextResponse.json(companies);

  } catch (error: any) {
    console.log(error);

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

// export async function GET() {
//   try {
//     await connectDB();

//     const companies = await Company.find()
//       .sort({ createdAt: -1 });

//     return NextResponse.json(companies);

//   } catch (error: any) {

//     console.log(error);

//     return NextResponse.json(
//       {
//         error: error.message,
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }


export async function POST(req: Request) {
  try {

    await connectDB();

    const data = await req.json();

    const company = await Company.create({
      tenantId: "TENANT001",

      companyCode: data.companyCode,
      companyName: data.companyName,

      ownerName: data.ownerName,
      email: data.email,
      mobile: data.mobile,

      website: data.website || "",

      gstNo: data.gstNo,
      panNo: data.panNo,
      drugLicenseNo: data.drugLicenseNo || "",

      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,

      invoicePrefix:
        data.invoicePrefix || "INV-001",

      purchasePrefix:
        data.purchasePrefix || "PUR-001",

      currency:
        data.currency || "INR",

      logo:
        data.logo || "",

      status:
        data.status || "Active",
    });

    return NextResponse.json({
      success: true,
      company,
    });

  } catch (error: any) {

    console.log("Company Create Error =>", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}