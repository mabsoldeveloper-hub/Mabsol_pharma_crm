import { NextRequest,NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import RolePermission from "@/models/RolePermission";

export async function POST(req:NextRequest){

await connectDB();

const body=await req.json();

await RolePermission.deleteMany({
roleId:body.roleId
});

await RolePermission.insertMany(
body.permissions
);

return NextResponse.json({
success:true
});

}