import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import FormTemplate from "@/models/FormTemplate";

interface Props {
  params: Promise<{ formId: string }>;
}

export async function GET(
  req: NextRequest,
  { params }: Props
) {
  try {
    await connectToDatabase();
    const { formId } = await params;

    const template = await FormTemplate.findOne({ formId }).lean();

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Form not found or link has expired." },
        { status: 404 }
      );
    }

    if (template.status !== "Active") {
      return NextResponse.json(
        { success: false, error: "This form is currently inactive." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      template: {
        formId: template.formId,
        title: template.title,
        description: template.description,
        category: template.category,
        fields: template.fields,
        isMultiStep: template.isMultiStep,
        steps: template.steps,
        conditions: template.conditions,
        accessMode: template.accessMode,
        theme: template.theme,
      },
    });
  } catch (error: any) {
    console.error("Error fetching public form:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
