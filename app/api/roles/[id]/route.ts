import {NextRequest, NextResponse,} from "next/server";
import connectDB from "@/lib/mongodb";
import Role from "@/models/Role";
  
  interface Props{
    params:{
      id:string;
    }
  }
  
  export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    await connectDB();
  
    const { id } = await params;
  
    const role = await Role.findById(id);
  
    return NextResponse.json(role);
  }
  // export async function GET(
  // req:NextRequest,
  // {params}:Props
  // ){
  
  //   try{
  
  //     await connectDB();
  
  //     const role =
  //       await Role.findById(
  //         params.id
  //       );
  
  //     return NextResponse.json(role);
  
  //   }catch{
  
  //     return NextResponse.json(
  //       {
  //         error:"Not Found"
  //       },
  //       {
  //         status:404
  //       }
  //     );
  
  //   }
  
  // }
  
  export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
  
    try {
  
      await connectDB();
  
      const { id } = await params;
  
      const body = await req.json();
  
      const role = await Role.findByIdAndUpdate(
        id,
        body,
        {
          new: true,
        }
      );
  
      return NextResponse.json(role);
  
    } catch (error: any) {
  
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
  
  export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
  
    try {
  
      await connectDB();
  
      const { id } = await params;
  
      await Role.findByIdAndDelete(id);
  
      return NextResponse.json({
        success: true,
      });
  
    } catch {
  
      return NextResponse.json(
        {
          error: "Delete Failed",
        },
        {
          status: 500,
        }
      );
  
    }
  
  }