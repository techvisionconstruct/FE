import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
  Input,
  Button,
  Label,
} from "@/components/shared";
import { createContract } from "@/api-calls/contracts/create-contract";
import { updateContract } from "@/api-calls/server/contracts";
import { toast } from "sonner";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

interface TermSection {
  id: number;
  title: string;
  description: string;
}

interface Signature {
  type: "text" | "image";
  value: string;
  file: File | null;
}

interface ContractDetailsProps {
  proposal: any;
}

export function ClientContractDetails({ proposal }: ContractDetailsProps) {
  const parseTermsAndConditions = (termsString: string): TermSection[] => {
    if (!termsString) return [];

    const lines = termsString.split(/\r?\n/);
    const sections: TermSection[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      if (trimmedLine === "") return;

      const colonIndex = line.indexOf(":");

      if (colonIndex > 0 && colonIndex < line.length - 1) {
        const title = line.substring(0, colonIndex).trim();
        const description = line.substring(colonIndex + 1).trim();

        sections.push({
          id: sections.length + 1,
          title,
          description,
        });
      } else {
        sections.push({
          id: sections.length + 1,
          title: `Section ${sections.length + 1}`,
          description: trimmedLine,
        });
      }
    });

    return sections;
  };

  const getSignatureData = (
    initials: string | null,
    image: string | null
  ): Signature => {
    if (image) {
      return {
        type: "image",
        value: image,
        file: null,
      };
    } else {
      return {
        type: "text",
        value: initials || "",
        file: null,
      };
    }
  };

  // State for client details
  const [clientDetails, setClientDetails] = useState({
    name: proposal?.contract?.clientName || proposal?.client_name || "",
    email: proposal?.contract?.clientEmail || proposal?.client_email || "",
    phone:
      proposal?.contract?.clientPhoneNumber || proposal?.phone_number || "",
    address: proposal?.contract?.clientAddress || proposal?.address || "",
  });

  // React Query mutation for contract creation/update
  const contractMutation = useMutation({
    mutationFn: (data: any) => {
      // Check if contract exists and has an ID
      if (proposal?.contract) {
        // Try to find the contract ID - check different possible properties
        const contractId =
          proposal.contract.id ||
          proposal.contract.contract_id ||
          proposal.contract.uuid;

        if (!contractId) {
          console.error("No contract ID found in the proposal object");        throw new Error("Contract ID is missing");
        }
        return updateContract(contractId, data);
      } else {
        return createContract(data);
      }
    },
    onSuccess: (data) => {
      const isUpdate = !!proposal?.contract;
      toast.success(
        isUpdate ? "Contract updated successfully" : "Contract created successfully", 
        {
          position: "top-center",
          duration: 3000,
        }
      );
    },
    onError: (error) => {
      console.error("Error with contract operation:", error);
      toast.error(`Failed to ${proposal?.contract ? "update" : "create"} contract: ${error.message}`, {
        position: "top-center",
        duration: 5000,
      });
    },
  });

  const handleCreateContract = () => {
    const contractData = {
      proposal_id: proposal.id,
      title: agreementTitle,
      client: clientDetails,
      terms: termsSections,
      signatures: signatures,
    };

    contractMutation.mutate(contractData);
  };

  const [agreementTitle, setAgreementTitle] = useState(
    proposal?.contract?.contractName || "SERVICE AGREEMENT"
  );

  // State for terms and conditions - parse from termsAndConditions string if available
  const [termsSections, setTermsSections] = useState<TermSection[]>(() => {
    if (proposal?.contract?.termsAndConditions) {
      return parseTermsAndConditions(proposal.contract.termsAndConditions);
    } else if (proposal?.contract?.terms) {
      return proposal.contract.terms;
    } else {
      return [
        {
          id: 1,
          title: "Payment Procedures",
          description:
            "The payment is due within 30 days of invoice receipt. Late payments are subject to a 1.5% monthly interest charge.",
        },
        {
          id: 2,
          title: "Agreement",
          description:
            "By signing this document, both parties agree to the terms and conditions outlined in this contract.",
        },
      ];
    }
  });

  // State for signatures - use contract signature data if available
  const [signatures, setSignatures] = useState<{
    client: Signature;
    contractor: Signature;
  }>(() => {
    if (
      proposal?.contract?.clientInitials !== undefined ||
      proposal?.contract?.clientImage !== undefined ||
      proposal?.contract?.contractorInitials !== undefined ||
      proposal?.contract?.contractorImage !== undefined
    ) {
      return {
        client: getSignatureData(
          proposal.contract.clientInitials,
          proposal.contract.clientImage
        ),
        contractor: getSignatureData(
          proposal.contract.contractorInitials,
          proposal.contract.contractorImage
        ),
      };
    } else if (proposal?.contract?.signatures) {
      return proposal.contract.signatures;
    } else {
      return {
        client: {
          type: "text",
          value: "",
          file: null,
        },
        contractor: {
          type: "text",
          value: "",
          file: null,
        },
      };
    }
  });

  // State to track if editing mode is active
  const [isEditing, setIsEditing] = useState(false);

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    sectionId?: number
  ) => {
    const { name, value } = e.target;

    // Check if this is a terms field
    if (name === "termsTitle" || name === "termsDescription") {
      if (sectionId) {
        setTermsSections((prev) =>
          prev.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  [name === "termsTitle" ? "title" : "description"]: value,
                }
              : section
          )
        );
      }
    }
    // Check if this is a signature field
    else if (name === "clientInitials" || name === "contractorInitials") {
      const party = name === "clientInitials" ? "client" : "contractor";
      setSignatures((prev) => ({
        ...prev,
        [party]: {
          ...prev[party as keyof typeof prev],
          type: "text",
          value: value,
        },
      }));
    } else {
      setClientDetails((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSignatureTypeChange = (
    party: "client" | "contractor",
    type: "text" | "image"
  ) => {
    setSignatures((prev) => ({
      ...prev,
      [party]: {
        ...prev[party],
        type: type,
        // Reset value when switching types
        value: type === "text" ? prev[party].value : "",
        file: type === "image" ? prev[party].file : null,
      },
    }));
  };

  const handleSignatureImageUpload = (
    party: "client" | "contractor",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSignatures((prev) => ({
        ...prev,
        [party]: {
          ...prev[party],
          type: "image",
          value: imageUrl,
          file: file,
        },
      }));
    }
  };

  const addTermsSection = () => {
    const newId =
      termsSections.length > 0
        ? Math.max(...termsSections.map((s) => s.id)) + 1
        : 1;

    setTermsSections((prev) => [
      ...prev,
      {
        id: newId,
        title: "New Section",
        description: "Enter section content here.",
      },
    ]);
  };

  // Remove a terms section
  const removeTermsSection = (id: number) => {
    setTermsSections((prev) => prev.filter((section) => section.id !== id));
  };

  // Save client details
  const saveClientDetails = () => {
    setIsEditing(false);
    // Here you would typically save to backend
    // For now we're just updating the local state
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateTotalCost = () => {
    if (!proposal.project_elements || proposal.project_elements.length === 0) {
      return "N/A";
    }

    let total = 0;
    proposal.project_elements.forEach((element: any) => {
      const materialCost = parseFloat(element.material_cost || 0);
      const laborCost = parseFloat(element.labor_cost || 0);
      const markup = parseFloat(element.markup || 0) / 100;

      total += (materialCost + laborCost) * (1 + markup);
    });

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(total);
  };

  return (
    <div className="w-full mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="p-6 rounded-lg border bg-muted/30 w-full">
            <div className="mb-8">
              {isEditing ? (
                <div className="mb-4">
                  <Input
                    name="agreementTitle"
                    value={agreementTitle}
                    onChange={(e) => setAgreementTitle(e.target.value)}
                    className="text-3xl font-bold text-center uppercase border-blue-500 shadow-sm ring-2 ring-blue-300 bg-blue-50/50 focus:border-blue-600 focus:ring-2 focus:ring-blue-400 transition-all"
                  />
                </div>
              ) : (
                <h1 className="text-3xl font-bold mt-2 mb-4 uppercase text-center">
                  {agreementTitle}
                </h1>
              )}
              <div className="space-y-0 text-muted-foreground text-center">
                <p className="text-md">
                  This Service Agreement is entered into as of April 25, 2025,
                  by and between:
                </p>
                <p className="text-md">
                  Service Provider: Simple ProjeX, with its principal place of
                  business at Irvine, California, and
                </p>
                <p className="text-md">
                  Client:{" "}
                  {clientDetails.name || proposal?.client_name || "test"}, with
                  a primary address at{" "}
                  {clientDetails.address ||
                    proposal?.address ||
                    "[Client Address]"}{" "}
                  .
                </p>
              </div>
            </div>

            {/* Rest of the contract content */}
            <h2 className="text-2xl font-bold mb-4 text-primary uppercase tracking-wider">
              Contract Details
            </h2>

            {proposal ? (
              <div className="space-y-8 w-full">
                {/* Contract Header */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">
                    {proposal.name || "Unnamed Project"}
                  </h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {proposal.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {proposal.project_modules?.map((module: any) => (
                      <Badge
                        key={module.id}
                        variant="outline"
                        className="font-semibold uppercase text-xs"
                      >
                        {module.module?.name || "Module"}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Client and Contractor Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Client Information */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        Client Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Client Name
                        </p>
                        <p className="font-medium">
                          {proposal.client_name || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">
                          {proposal.client_email || "N/A"}
                        </p>
                      </div>
                      {proposal.phone_number && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{proposal.phone_number}</p>
                        </div>
                      )}
                      {proposal.address && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Address
                          </p>
                          <p className="font-medium">{proposal.address}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Contractor Information */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        Contract Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Project Cost</span>
                        <span className="font-bold text-xl">
                          {calculateTotalCost()}
                        </span>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Created</span>
                          <span>
                            {proposal.created_at
                              ? formatDate(proposal.created_at)
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Last Updated</span>
                          <span>
                            {proposal.updated_at
                              ? formatDate(proposal.updated_at)
                              : "N/A"}
                          </span>
                        </div>
                        {proposal.user && (
                          <div className="flex justify-between text-sm">
                            <span>Created By</span>
                            <span>{proposal.user.username || "N/A"}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Project Parameters */}
                {proposal.project_parameters &&
                  proposal.project_parameters.length > 0 && (
                    <div className="space-y-4 mt-4">
                      <h3 className="text-lg font-semibold">
                        Project Parameters
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {proposal.project_parameters.map((param: any) => (
                          <div
                            key={param.id}
                            className="p-3 bg-muted/50 rounded-xl flex justify-between items-center"
                          >
                            <span className="font-medium">
                              {param.parameter?.name || "Parameter"}
                            </span>
                            <div className="flex items-center gap-2">
                              <span>{param.value}</span>
                              <span className="text-muted-foreground text-sm">
                                {param.parameter?.type || ""}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Project Elements */}
                {proposal.project_modules &&
                  proposal.project_modules.length > 0 && (
                    <div className="space-y-4 mt-4">
                      <h3 className="text-lg font-semibold">Project Details</h3>
                      {proposal.project_modules.map((moduleItem: any) => (
                        <div key={moduleItem.id} className="space-y-4">
                          <h4 className="text-base font-semibold">
                            {moduleItem.module?.name || "Module"}
                          </h4>
                          {proposal.project_elements && (
                            <div className="rounded-lg border p-4 overflow-x-auto">                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[60px]">Image</TableHead>
                                    <TableHead>Element</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">
                                      Cost
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {proposal.project_elements
                                    .filter(
                                      (element: any) =>
                                        element.project_module?.module?.id ===
                                        moduleItem.module?.id
                                    )
                                    .map((element: any) => (                                      <TableRow key={element.id}>
                                        {/* Element image */}
                                        <TableCell>
                                          {element.element?.image ? (
                                            <div className="relative w-10 h-10 rounded-md overflow-hidden">
                                              <Image 
                                                src={element.element.image}
                                                alt={element.element?.name || "Element"}
                                                fill
                                                className="object-cover"
                                                onError={(e) => {
                                                  // Fallback to placeholder on error
                                                  e.currentTarget.style.display = 'none';
                                                }}
                                              />
                                            </div>
                                          ) : (
                                            <div className="w-10 h-10 rounded-md bg-muted/30 flex items-center justify-center">
                                              <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                                            </div>
                                          )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          {element.element?.name || "Element"}
                                        </TableCell>
                                        <TableCell>
                                          {element.element?.description ||
                                            "No description available"}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                          {new Intl.NumberFormat("en-US", {
                                            style: "currency",
                                            currency: "USD",
                                          }).format(
                                            (parseFloat(
                                              element.material_cost || 0
                                            ) +
                                              parseFloat(
                                                element.labor_cost || 0
                                              )) *
                                              (1 +
                                                parseFloat(
                                                  element.markup || 0
                                                ) /
                                                  100)
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                {/* Terms and Conditions */}
                <div className="space-y-4 mt-4">
                  <h3 className="text-lg font-semibold">
                    Terms and Conditions
                  </h3>

                  <div className="overflow-hidden">
                    <div>
                      <div className="p-2 relative">
                        {isEditing ? (
                          <div className="space-y-2">
                            {termsSections.map((section, index) => (
                              <div
                                key={section.id}
                                className="space-y-3 pb-5 border-b border-dashed last:border-0"
                              >
                                <div className="flex justify-between items-center">
                                  <p className="text-sm font-semibold">
                                    Section {index + 1}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-destructive"
                                    onClick={() =>
                                      removeTermsSection(section.id)
                                    }
                                  >
                                    Remove
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`termsTitle-${section.id}`}>
                                    Section Title
                                  </Label>
                                  <Input
                                    id={`termsTitle-${section.id}`}
                                    name="termsTitle"
                                    value={section.title}
                                    onChange={(e) =>
                                      handleInputChange(e, section.id)
                                    }
                                    placeholder="Enter section title"
                                    className="font-medium border-blue-500 shadow-sm ring-2 ring-blue-300 bg-blue-50/50 focus:border-blue-600 focus:ring-2 focus:ring-blue-400 transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label
                                    htmlFor={`termsDescription-${section.id}`}
                                  >
                                    Section Content
                                  </Label>
                                  <textarea
                                    id={`termsDescription-${section.id}`}
                                    name="termsDescription"
                                    value={section.description}
                                    onChange={(e) =>
                                      handleInputChange(e, section.id)
                                    }
                                    placeholder="Enter section content"
                                    className="w-full min-h-[100px] p-2 border rounded-md resize-y border-blue-500 shadow-sm ring-2 ring-blue-300 bg-blue-50/50 focus:border-blue-600 focus:ring-2 focus:ring-blue-400 transition-all"
                                  />
                                </div>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              className="w-full flex items-center gap-1"
                              onClick={addTermsSection}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-plus"
                              >
                                <path d="M5 12h14" />
                                <path d="M12 5v14" />
                              </svg>
                              Add Section
                            </Button>
                          </div>
                        ) : (
                          <div className="text-slate-800">
                            <div className="space-y-6 leading-relaxed">
                              {termsSections.map((section, index) => (
                                <div key={section.id} className="mb-6">
                                  <div className="flex items-baseline gap-3 mb-2">
                                    <div className="w-7 h-7 rounded-full border border-primary/30 flex items-center justify-center flex-shrink-0 text-primary bg-primary/5">
                                      <span className="text-xs font-bold">
                                        {index + 1}
                                      </span>
                                    </div>
                                    <h5 className="text-base font-bold uppercase tracking-wide text-slate-700">
                                      {section.title}
                                    </h5>
                                  </div>
                                  <div className="ml-10 text-sm text-slate-600 leading-relaxed">
                                    {section.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Client Signature</h3>
                    {isEditing ? (
                      <div className="border rounded-lg p-4 bg-muted/10">
                        <div className="flex gap-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="clientInitialsOption"
                              name="clientSignatureType"
                              className="w-4 h-4"
                              checked={signatures.client.type === "text"}
                              onChange={() =>
                                handleSignatureTypeChange("client", "text")
                              }
                            />
                            <Label htmlFor="clientInitialsOption">
                              Initials
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="clientImageOption"
                              name="clientSignatureType"
                              className="w-4 h-4"
                              checked={signatures.client.type === "image"}
                              onChange={() =>
                                handleSignatureTypeChange("client", "image")
                              }
                            />
                            <Label htmlFor="clientImageOption">Image</Label>
                          </div>
                        </div>

                        {signatures.client.type === "text" ? (
                          <div className="space-y-2">
                            <Label htmlFor="clientInitials">
                              Enter your initials
                            </Label>
                            <Input
                              id="clientInitials"
                              name="clientInitials"
                              value={signatures.client.value}
                              onChange={handleInputChange}
                              placeholder="Type your initials"
                              className="font-medium border-blue-500 shadow-sm ring-2 ring-blue-300 bg-blue-50/50 focus:border-blue-600 focus:ring-2 focus:ring-blue-400 transition-all"
                            />
                            {signatures.client.value && (
                              <div className="h-20 border rounded-lg flex items-center justify-center mt-2 bg-white">
                                <p className="font-medium text-xl">
                                  {signatures.client.value}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="clientSignatureImage">
                              Upload your signature
                            </Label>
                            <Input
                              id="clientSignatureImage"
                              name="clientSignatureImage"
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleSignatureImageUpload("client", e)
                              }
                              className="text-sm bg-blue-50/50 border-blue-500 hover:bg-blue-100/70 transition-all focus:border-blue-600 file:bg-blue-500 file:text-white file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 cursor-pointer shadow-sm ring-2 ring-blue-300"
                            />
                            {signatures.client.value && (
                              <div className="h-20 border rounded-lg flex items-center justify-center mt-2 bg-white overflow-hidden">
                                <img
                                  src={signatures.client.value}
                                  alt="Client signature"
                                  className="max-h-full object-contain"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-24 border rounded-lg flex items-center justify-center bg-muted/20">
                        {signatures.client.value ? (
                          signatures.client.type === "text" ? (
                            <p className="font-medium text-xl">
                              {signatures.client.value}
                            </p>
                          ) : (
                            <img
                              src={signatures.client.value}
                              alt="Client signature"
                              className="max-h-full object-contain"
                            />
                          )
                        ) : (
                          <p className="text-muted-foreground">
                            Signature required
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Date:{" "}
                      {new Date().toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      Contractor Signature
                    </h3>
                    {isEditing ? (
                      <div className="border rounded-lg p-4 bg-muted/10">
                        <div className="flex gap-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="contractorInitialsOption"
                              name="contractorSignatureType"
                              className="w-4 h-4"
                              checked={signatures.contractor.type === "text"}
                              onChange={() =>
                                handleSignatureTypeChange("contractor", "text")
                              }
                            />
                            <Label htmlFor="contractorInitialsOption">
                              Initials
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="contractorImageOption"
                              name="contractorSignatureType"
                              className="w-4 h-4"
                              checked={signatures.contractor.type === "image"}
                              onChange={() =>
                                handleSignatureTypeChange("contractor", "image")
                              }
                            />
                            <Label htmlFor="contractorImageOption">Image</Label>
                          </div>
                        </div>

                        {signatures.contractor.type === "text" ? (
                          <div className="space-y-2">
                            <Label htmlFor="contractorInitials">
                              Enter your initials
                            </Label>
                            <Input
                              id="contractorInitials"
                              name="contractorInitials"
                              value={signatures.contractor.value}
                              onChange={handleInputChange}
                              placeholder="Type your initials"
                              className="font-medium border-blue-500 shadow-sm ring-2 ring-blue-300 bg-blue-50/50 focus:border-blue-600 focus:ring-2 focus:ring-blue-400 transition-all"
                            />
                            {signatures.contractor.value && (
                              <div className="h-20 border rounded-lg flex items-center justify-center mt-2 bg-white">
                                <p className="font-medium text-xl">
                                  {signatures.contractor.value}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="contractorSignatureImage">
                              Upload your signature
                            </Label>
                            <Input
                              id="contractorSignatureImage"
                              name="contractorSignatureImage"
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleSignatureImageUpload("contractor", e)
                              }
                              className="text-sm bg-blue-50/50 border-blue-500 hover:bg-blue-100/70 transition-all focus:border-blue-600 file:bg-blue-500 file:text-white file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 cursor-pointer shadow-sm ring-2 ring-blue-300"
                            />
                            {signatures.contractor.value && (
                              <div className="h-20 border rounded-lg flex items-center justify-center mt-2 bg-white overflow-hidden">
                                <img
                                  src={signatures.contractor.value}
                                  alt="Contractor signature"
                                  className="max-h-full object-contain"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-24 border rounded-lg flex items-center justify-center bg-muted/20">
                        {signatures.contractor.value ? (
                          signatures.contractor.type === "text" ? (
                            <p className="font-medium text-xl">
                              {signatures.contractor.value}
                            </p>
                          ) : (
                            <img
                              src={signatures.contractor.value}
                              alt="Contractor signature"
                              className="max-h-full object-contain"
                            />
                          )
                        ) : (
                          <p className="text-muted-foreground">
                            Signature required
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Date:{" "}
                      {new Date().toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-base text-muted-foreground">
                No contract details available.
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions - Right Side (Narrower) */}
        <div className="lg:col-span-1">
          <div className="p-4 rounded-lg border bg-muted/10 sticky top-4">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button
                variant="default"
                className="w-full flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-mail"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Email to Client
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleCreateContract}
                disabled={contractMutation.isPending}
              >
                {contractMutation.isPending ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {proposal?.contract ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-file-text"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" x2="8" y1="13" y2="13" />
                      <line x1="16" x2="8" y1="17" y2="17" />
                      <line x1="10" x2="8" y1="9" y2="9" />
                    </svg>
                    {proposal?.contract ? "Update Contract" : "Create Contract"}
                  </>                )}
              </Button>
              <Separator className="my-2" />{" "}
              <div className="rounded-md border p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Edit Mode</span>
                  <div
                    className="w-10 h-5 bg-muted relative rounded-full cursor-pointer"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <div
                      className={`absolute w-4 h-4 rounded-full top-0.5 transition-all ${
                        isEditing
                          ? "bg-primary right-0.5"
                          : "bg-muted-foreground left-0.5"
                      }`}
                    />
                  </div>
                </div>
              </div>
              <Card className="mt-4">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm">Contract Stats</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Total Cost:</span>
                      <span className="font-semibold text-foreground">
                        {calculateTotalCost()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Parameters:</span>
                      <span>{proposal?.project_parameters?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Modules:</span>
                      <span>{proposal?.project_modules?.length || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
