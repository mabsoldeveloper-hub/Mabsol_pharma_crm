import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Permission from "@/models/Permission";

export async function GET() {

  try {

    await connectDB();

    const permissions =
      await Permission.find()

      .sort({

        moduleName: 1,

        permissionName: 1,

      });

    return NextResponse.json(
      permissions
    );

  } catch {

    return NextResponse.json(

      {
        error:
        "Failed to load permissions",
      },

      {
        status:500,
      }

    );

  }

}

export async function POST(
req:NextRequest
){

try{

await connectDB();

const{

moduleName,

permissionName,

permissionKey,

status,

}=await req.json();

// Duplicate Check

const exists=
await Permission.findOne({

permissionKey,

});

if(exists){

return NextResponse.json(

{

error:
"Permission Key already exists.",

},

{

status:400,

}

);

}

// Save

const permission=
await Permission.create({

moduleName,

permissionName,

permissionKey,

status,

});

return NextResponse.json({

success:true,

permission,

});

}catch(error:any){

return NextResponse.json(

{

success:false,

error:error.message,

},

{

status:500,

}

);

}

}