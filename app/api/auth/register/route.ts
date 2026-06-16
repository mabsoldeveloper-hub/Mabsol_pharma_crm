// import { NextResponse } from "next/server";
// import bcrypt from "bcryptjs";

// import dbConnect from "@/lib/mongodb";
// import Tenant from "@/models/Tenant";
// import User from "@/models/User";

// import jwt from "jsonwebtoken";
// import Role from "@/models/Role";

// export async function POST(req: Request) {
//   try {
//     await dbConnect();

//     const {
//       companyName,
//       gstNo,
//       mobile,
//       email,
//       name,
//       password,
//     } = await req.json();

//     // check existing user
//     const existingUser = await User.findOne({ email });

//     if (existingUser) {
//       return NextResponse.json({
//         success: false,
//         message: "Email already exists",
//       });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const tenant = await Tenant.create({
//       companyName,
//       gstNo,
//       mobile,
//       email,
//     });

//     const user = await User.create({
//       tenantId: tenant._id,
//       name,
//       email,
//       password: hashedPassword,
//       role: "CompanyAdmin",
//     });

//     const userResponse = {
//       _id: user._id,
//       tenantId: user.tenantId,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       status: user.status,
//     };

    

//     const token = jwt.sign(
//       {
//         id: user._id,
//         tenantId: user.tenantId,
//         role: user.role,
//       },
//       process.env.JWT_SECRET!,
//       {
//         expiresIn: "7d",
//       }
//     );


//     await Role.insertMany([
//       {
//         tenantId: tenant._id,
//         roleName: "CompanyAdmin",
//         permissions: ["all"],
//       },
//       {
//         tenantId: tenant._id,
//         roleName: "Salesman",
//         permissions: [
//           "customer.view",
//           "customer.create",
//           "sale.create",
//         ],
//       },
//       {
//         tenantId: tenant._id,
//         roleName: "Accountant",
//         permissions: [
//           "purchase.view",
//           "sale.view",
//           "report.view",
//         ],
//       },
//     ]);
    
//     return NextResponse.json({
//       success: true,
//       message: "Company Registered Successfully",
//       token,
//       tenant,
//       user: userResponse,
//     });

    

//   } catch (error: any) {
//     return NextResponse.json({
//       success: false,
//       message: "Registration Failed",
//       error: error.message,
//     });
//   }
// }


import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const {
      name,
      email,
      password,
      role,
    } = await req.json();

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

      const user = await User.create({
        tenantId: "TENANT001",
        name,
        email,
        password: hashedPassword,
        role: role || "Employee",
        status: "Active",
      });
    // const user = await User.create({
    //   tenantId: "TENANT001",
    //   name,
    //   email,
    //   password: hashedPassword,
    //   role: role || "Employee",
    //   status: "Active",
    // });

    return NextResponse.json({
      success: true,
      message: "User Registered Successfully",
      user,
    });

  } catch (error) {
    console.log(error);

    return NextResponse.json({
      success: false,
      message: "Registration Failed",
    });
  }
}


