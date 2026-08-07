"use client";

import React from "react";
import FormBuilder from "@/components/custom-forms/FormBuilder";

export default function CreateCustomFormPage() {
  return (
    <div className="p-6">
      <FormBuilder isEditMode={false} />
    </div>
  );
}
