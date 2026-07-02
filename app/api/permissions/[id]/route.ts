import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Permission from "@/models/Permission";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params;

    const permission = await Permission.findById(id);

    if (!permission) {
      return NextResponse.json(
        { error: "Permission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(permission);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
// export async function GET(
//   req: NextRequest,
//   { params }: Params
// ) {
//   try {
//     await connectDB();

//     const permission = await Permission.findById(params.id);

//     return NextResponse.json(permission);
//   } catch {
//     return NextResponse.json(
//       {
//         error: "Permission not found",
//       },
//       {
//         status: 404,
//       }
//     );
//   }
// }

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
  ) {
  
      await connectDB();
  
      const { id } = await context.params;
  
      const body = await req.json();
  
      const permission =
        await Permission.findByIdAndUpdate(
          id,
          body,
          { new: true }
        );
  
      return NextResponse.json(permission);
  }

  export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
  ) {
  
      await connectDB();
  
      const { id } = await context.params;
  
      await Permission.findByIdAndDelete(id);
  
      return NextResponse.json({
          success:true
      });
  
  }