"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Input,
  Label,
  Textarea,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
} from "@/components/shared";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/shared/file-upload/file-upload";
import { Calendar } from "@/components/shared/calendar/calendar";
import { CalendarIcon, Upload, ImageIcon, X, CircleAlert } from "lucide-react";
import Image from "next/image";

declare global {
  interface Window {
    google: any;
  }
}

interface ProposalDetailsTabProps {
  data: {
    name: string;
    description: string;
    image: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    client_address: string;
    valid_until: string;
    location: string;
  };
  updateData: (data: any) => void;
  errors?: Record<string, string>;
}

const ProposalDetailsTab: React.FC<ProposalDetailsTabProps> = ({
  data,
  updateData,
  errors = {},
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(
    data.image || null
  );
  const [date, setDate] = useState<Date | undefined>(
    data.valid_until ? new Date(data.valid_until) : undefined
  );
  const autocompleteInput = useRef<HTMLInputElement>(null);
  const clientAddressInput = useRef<HTMLTextAreaElement>(null);

  const handleChange = (field: string, value: string) => {
    if (field === "name") {
      const wordCount = value.trim().split(/\s+/).length;
      const charCount = value.trim().length;

      if (charCount > 200 || wordCount > 30) {
        return;
      }
    }

    updateData({
      ...data,
      [field]: value,
    });
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      handleChange("valid_until", newDate.toISOString());
    }
  };

  // Helper function to format dates without relying directly on date-fns
  const formatDate = (date: Date | undefined): string => {
    if (!date) return "Select a date";

    // Format as "Month Day, Year" (e.g., "May 15, 2023")
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Helper function for ISO date format (yyyy-MM-dd)
  const formatISODate = (date: Date | undefined): string => {
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    // Load Google Maps script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initAutocomplete;
    document.head.appendChild(script);

    return () => {
      // Cleanup script when component unmounts
      document.head.removeChild(script);
    };
  }, [data]);

  // Update the initAutocomplete function to preserve other fields:
  const initAutocomplete = () => {
    // Project location autocomplete
    if (autocompleteInput.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        autocompleteInput.current,
        {
          types: ["address"],
          componentRestrictions: { country: "us" },
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          // Only update the location field
          updateData({
            ...data,
            location: place.formatted_address,
          });
        }
      });
    }

    // Client address autocomplete
    if (clientAddressInput.current) {
      const clientAutocomplete = new window.google.maps.places.Autocomplete(
        clientAddressInput.current,
        {
          types: ["address"],
          componentRestrictions: { country: "us" },
        }
      );

      clientAutocomplete.addListener("place_changed", () => {
        const place = clientAutocomplete.getPlace();
        if (place.formatted_address) {
          // Only update the client_address field
          updateData({
            ...data,
            client_address: place.formatted_address,
          });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Proposal Details</h2>
        <p className="text-muted-foreground mb-6">
          Provide the essential details for your proposal, including client
          information and project scope.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Proposal Details */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Proposal Information</h3>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Proposal Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative flex items-center gap-1">
                <Input
                  id="name"
                  placeholder="Enter proposal name"
                  value={data.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={
                    errors.name
                      ? "pr-10 border-red-500 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }
                />
                {errors.name && (
                  <span className="absolute right-3">
                    <CircleAlert className="text-red-500 w-4 h-4" />
                  </span>
                )}
              </div>
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                Proposal Description
                <span className="text-gray-400">&#40;Optional&#41;</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the project scope, goals, and any other relevant information"
                className="min-h-[120px]"
                value={data.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">
                Project Location
                <span className="text-gray-400">&#40;Optional&#41;</span>
              </Label>
              <Input
                ref={autocompleteInput}
                id="location"
                placeholder="Start typing to search for an address"
                value={data.location}
                onChange={(e) => handleChange("location", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valid_until">
                Valid Until{" "}
                <span className="text-gray-400">&#40;Optional&#41;</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    id="valid_until"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(date)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Right Column - Client Details */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Client Information</h3>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="client_name">
                Client Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative flex items-center gap-1">
                <Input
                  id="client_name"
                  placeholder="Enter client name"
                  value={data.client_name}
                  onChange={(e) => handleChange("client_name", e.target.value)}
                  className={
                    errors.client_name
                      ? "pr-10 border-red-500 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }
                />
                {errors.client_name && (
                  <span className="absolute right-3">
                    <CircleAlert className="text-red-500 w-4 h-4" />
                  </span>
                )}
              </div>
              {errors.client_name && (
                <p className="text-red-500 text-sm">{errors.client_name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client_email">
                Client Email<span className="text-red-500">*</span>
              </Label>
              <div className="relative flex items-center gap-1">
                <Input
                  id="client_email"
                  type="email"
                  placeholder="Enter client email"
                  value={data.client_email}
                  onChange={(e) => handleChange("client_email", e.target.value)}
                  className={
                    errors.client_email
                      ? "pr-10 border-red-500 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }
                />
                {errors.client_email && (
                  <span className="absolute right-3">
                    <CircleAlert className="text-red-500 w-4 h-4" />
                  </span>
                )}
              </div>
              {errors.client_email && (
                <p className="text-red-500 text-sm">{errors.client_email}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client_phone">
                Client Phone<span className="text-red-500">*</span>
              </Label>
              <div className="relative flex items-center gap-1">
                <Input
                  id="client_phone"
                  placeholder="Enter client phone number"
                  value={data.client_phone}
                  onChange={(e) => handleChange("client_phone", e.target.value)}
                  className={
                    errors.client_phone
                      ? "pr-10 border-red-500 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }
                />
                {errors.client_phone && (
                  <span className="absolute right-3">
                    <CircleAlert className="text-red-500 w-4 h-4" />
                  </span>
                )}
              </div>
              {errors.client_phone && (
                <p className="text-red-500 text-sm">{errors.client_phone}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="client_address">
                Client Address<span className="text-red-500">*</span>
              </Label>
              <div className="relative flex items-center gap-1">
                <Textarea
                  ref={clientAddressInput}
                  id="client_address"
                  placeholder="Start typing to search for an address"
                  value={data.client_address}
                  onChange={(e) =>
                    handleChange("client_address", e.target.value)
                  }
                  className={
                    errors.client_address
                      ? "pr-10 border-red-500 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }
                />
                {errors.client_address && (
                  <span className="absolute right-3">
                    <CircleAlert className="text-red-500 w-4 h-4" />
                  </span>
                )}
              </div>
              {errors.client_address && (
                <p className="text-red-500 text-sm">{errors.client_address}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalDetailsTab;
