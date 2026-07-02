// import jwt from "jsonwebtoken";

// export const verifyToken = (token: string) => {
//   try {
//     console.log("JWT SECRET:", process.env.JWT_SECRET);

//     const decoded = jwt.verify(
//       token,
//       process.env.JWT_SECRET as string
//     );

//     return decoded;
//   } catch (error) {
//     console.log("VERIFY ERROR:", error);
//     return null;
//   }
// };
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import connectDB from "@/lib/mongodb";

import User from "@/models/User";

import "@/models/Role";
import "@/models/CompanyMaster";

export async function verifyToken() {

  const cookieStore =
    await cookies();

  const token =
    cookieStore
      .get("token")
      ?.value;

  if (!token)
    return null;

  try {

    return jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

  } catch {

    return null;

  }

}

export async function getCurrentUser() {

  await connectDB();

  const payload =
    await verifyToken();

  if (!payload)
    return null;

  const user =
    await User.findById(
      (payload as any).id
    )

      .populate(
        "companyId",
        "companyName logo"
      )

      .populate(
        "roleId",
        "roleName"
      );

  return user;

}