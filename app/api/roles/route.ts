import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Role from "@/models/Role";

export async function GET() {

  try {

    await connectDB();

    const roles =
      await Role.find()
      .sort({
        roleName:1
      });

    return NextResponse.json(roles);

  } catch {

    return NextResponse.json(
      {
        error:"Failed"
      },
      {
        status:500
      }
    );

  }

}

export async function POST(
  req:NextRequest
){

  try{

    await connectDB();

    const body =
      await req.json();

    const role =
      await Role.create(body);

    return NextResponse.json(role);

  }
  catch(error:any){

    return NextResponse.json(
      {
        error:error.message
      },
      {
        status:500
      }
    );

  }

}