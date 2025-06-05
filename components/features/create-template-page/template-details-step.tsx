"use client";

import React, { useState, useEffect } from "react";
import { Input, Label, Textarea, ImageUpload } from "@/components/shared";
import { X, AlertCircle } from "lucide-react";

interface TemplateDetailsProps {
  data: {
    name: string;
    description: string;
    image?: string;
  };
  updateData: (data: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

const TemplateDetailsStep: React.FC<TemplateDetailsProps> = ({
  data,
  updateData,
  onValidationChange,
}) => {
  // Validation State
  const [errors, setErrors] = useState<{
    name?: string;
  }>({
    name: undefined,
  });
  const [touched, setTouched] = useState<{
    name: boolean;
  }>({
    name: false,
  });
  // Validation Form
  useEffect(() => {
    validateForm();
  }, [data.name]);

  const validateForm = () => {
    const newErrors: { name?: string } = {};

    if (!data.name.trim()) {
      newErrors.name = "Template name is required.";
    } else if (data.name.length > 100) {
      newErrors.name = "Template name must be less than 100 characters.";
    }

    setErrors(newErrors);

    const isValid = Object.keys(newErrors).length === 0;
    if (onValidationChange) {
      onValidationChange(isValid);
    }

    return isValid;
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched({ ...touched, [field]: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Template Details</h2>
        <p className="text-muted-foreground mb-6">
          Provide basic information about your template to help others find and
          use it.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="name"
                placeholder="Enter template name"
                value={data.name}
                onChange={(e) => updateData({ ...data, name: e.target.value })}
                onBlur={() => handleBlur("name")}
                className={
                  errors.name && touched.name ? "border-red-500 pr-10" : ""
                }
                aria-invalid={errors.name && touched.name ? "true" : "false"}
                aria-describedby={
                  errors.name && touched.name ? "name-error" : undefined
                }
              />
              {data.name && (
                <button
                  type="button"
                  onClick={() => updateData({ ...data, name: "" })}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 focus:outline-none"
                  tabIndex={-1}
                  aria-label="Clear template name"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-red-500" />
                </button>
              )}
              {errors.name && touched.name && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
              )}
            </div>
            {errors.name && touched.name && (
              <p id="name-error" className="text-sm text-red-500 mt-1">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">
              Description
              <span className="text-gray-500">&#40;Optional&#41;</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe what this template is for and how to use it"
              className="min-h-[220px]"
              value={data.description}
              onChange={(e) =>
                updateData({ ...data, description: e.target.value })
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="image">
              Template Image{" "}
              <span className="text-gray-500">&#40;Optional&#41;</span>
            </Label>
            <ImageUpload
              value={data.image || ""}
              onChange={(value) => updateData({ ...data, image: value })}
              placeholder="Click or drag to upload template image"
              aspect="rectangle"
              height={294}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetailsStep;
