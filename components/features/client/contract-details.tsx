import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { clientSignContract } from "@/api-calls/contracts/client-sign-contract";
import { toast } from "sonner";
import { VariableResponse } from "@/types/variables/dto";
import { TradeResponse } from "@/types/trades/dto";
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

interface ClientContractViewProps {
  proposal: any;
}

export function ContractDetails({ proposal }: ClientContractViewProps) {
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };
  // Get the React Query client
  const queryClient = useQueryClient();

  // React Query mutation for contract signing
  const signContractMutation = useMutation({
    mutationFn: (data: any) => {
      // Check if contract exists and has an ID
      console.log("Signing contract with data:", data, proposal);
      if (proposal?.contract) {
        // Try to find the contract ID - check different possible properties
        const contractId =
          proposal.contract.id ||
          proposal.contract.contract_id ||
          proposal.contract.uuid;

        if (!contractId) {
          console.error("No contract ID found in the proposal object");
          throw new Error("Contract ID is missing");
        }
        return clientSignContract(contractId, data);
      } else {
        throw new Error("No contract found to sign");
      }
    },
    onSuccess: (data) => {
      // Update the signature locally
      setSignatures((prev) => ({
        ...prev,
        client: {
          ...prev.client,
          type: prev.client.type,
          value: prev.client.value,
        },
      }));
      
      // Invalidate the proposal query to refetch the data
      if (proposal?.id) {
        queryClient.invalidateQueries({ queryKey: ["proposal", proposal.id.toString()] });
      }
      
      toast.success("Contract signed successfully!", {
        position: "top-center",
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error("Error signing contract:", error);
      toast.error(`Failed to sign contract: ${error.message}`, {
        position: "top-center",
        duration: 5000,
      });
    },
  });
  const handleSignContract = () => {
    if (!signatures.client.value) {
      toast.error("Please provide your signature before signing the contract", {
        position: "top-center",
        duration: 3000,
      });
      return;
    }

    const contractData = {
      client_initials:
        signatures.client.type === "text" ? signatures.client.value : null,
      client_signature:
        signatures.client.type === "image" ? signatures.client.value : null,
    };

    // Update local state to show contract is signed
    // This will temporarily update the UI while the API call is in progress
    if (proposal?.contract) {
      const updatedContract = { 
        ...proposal.contract,
        client_initials: signatures.client.type === "text" ? signatures.client.value : null,
        client_signature: signatures.client.type === "image" ? signatures.client.value : null,
        client_signed_at: new Date().toISOString()
      };
    }

    signContractMutation.mutate(contractData);
  };

  // Enhanced service agreement retrieval with better fallbacks
  const defaultServiceAgreement = `SERVICE AGREEMENT
  
This Service Agreement is entered into as of the date of signing, by and between:

Service Provider: Simple ProjeX, with its principal place of business at Irvine, California, and
Client: ${
    proposal?.client_name || "[CLIENT NAME]"
  }, with a primary address at ${
    proposal?.client_address || "[CLIENT ADDRESS]"
  }.

1. SCOPE OF SERVICES:
The Service Provider agrees to perform the services as outlined in the attached Proposal.

2. PAYMENT TERMS:
Payment is due within 30 days of invoice receipt. Late payments are subject to a 1.5% monthly interest charge.

3. TERM AND TERMINATION:
This Agreement shall commence on the date of signing and shall continue until the services are completed.`;

  const serviceAgreementContent =
    proposal?.contract?.service_agreement_content ||
    proposal?.contract?.service_agreement?.content ||
    defaultServiceAgreement;

  // Extract title and content from serviceAgreementContent
  const { title, content } = useMemo(() => {
    const lines = serviceAgreementContent.split("\n");
    let extractedTitle = lines[0].trim();
    // If first line is empty, use second line
    if (!extractedTitle && lines.length > 1) {
      extractedTitle = lines[1].trim();
    }
    // Default title if none found
    if (!extractedTitle) extractedTitle = "SERVICE AGREEMENT";

    // Content is everything after the first non-empty line
    const extractedContent = lines.slice(1).join("\n").trim();

    return {
      title: extractedTitle,
      content: extractedContent,
    };
  }, [serviceAgreementContent]);

  // Parse terms and conditions - adding the same parser from main contract-details
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

  // Update termsSections state to use the same initialization logic as the main component
  const [termsSections] = useState<TermSection[]>(() => {
    if (proposal?.contract?.terms) {
      if (typeof proposal.contract.terms === "string") {
        return parseTermsAndConditions(proposal.contract.terms);
      } else if (Array.isArray(proposal.contract.terms)) {
        return proposal.contract.terms;
      }
    }

    // Default terms if none provided
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
  });

  // State for signatures - use contract signature data if available
  const [signatures, setSignatures] = useState<{
    client: Signature;
    contractor: Signature;
  }>(() => {
    if (
      proposal?.contract?.client_initials !== undefined ||
      proposal?.contract?.client_signature !== undefined ||
      proposal?.contract?.contractor_initials !== undefined ||
      proposal?.contract?.contractor_signature !== undefined
    ) {
      return {
        client: getSignatureData(
          proposal.contract.client_initials,
          proposal.contract.client_signature
        ),
        contractor: getSignatureData(
          proposal.contract.contractor_initials,
          proposal.contract.contractor_signature
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
  // Check if contract is already signed by client
  const isContractSigned = !!(
    proposal?.contract?.client_signature ||
    (proposal?.contract?.client_initials &&
      proposal?.contract?.client_initials.trim() !== "") ||
    signContractMutation.isSuccess
  );

  // Handle input changes for signature
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Check if this is a signature field
    if (name === "client_initials") {
      // Prevent spaces in initials
      const cleanValue = value.replace(/\s/g, '');
      setSignatures((prev) => ({
        ...prev,
        client: {
          ...prev.client,
          type: "text",
          value: cleanValue,
        },
      }));
    }
  };

  const handleSignatureTypeChange = (type: "text" | "image") => {
    setSignatures((prev) => ({
      ...prev,
      client: {
        ...prev.client,
        type: type,
        // Reset value when switching types
        value: type === "text" ? prev.client.value : "",
        file: type === "image" ? prev.client.file : null,
      },
    }));
  };

  const handleSignatureImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64String = await fileToBase64(file);
        setSignatures((prev) => ({
          ...prev,
          client: {
            ...prev.client,
            type: "image",
            value: base64String, // Store base64 string instead of blob URL
            file: file, // Keep the original file if needed
          },
        }));
      } catch (error) {
        console.error("Error converting file to base64:", error);
      }
    }
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
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
      {!proposal.contract ? (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-8 text-center my-6 max-w-3xl mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-600 mx-auto mb-4"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h2 className="text-2xl font-semibold text-amber-800 mb-3">
            No Contract Available
          </h2>
          <p className="text-amber-700 text-lg mb-4">
            This proposal doesn't have a contract attached to it yet.
          </p>
          <p className="text-amber-600">
            Please contact your contractor to set up a contract for this
            proposal.
          </p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <div className="p-6 md:p-10 rounded-lg border bg-muted/30 w-full">
            <div className="mb-12 max-w-6xl mx-auto text-center">
              {/* Display extracted title */}
              <h1 className="text-3xl font-bold mt-2 mb-8 uppercase text-center">
                {title}
              </h1>

              {/* Display content */}
              <div className="space-y-4 text-muted-foreground whitespace-pre-line max-w-3xl mx-auto text-left">
                {content}
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-8 text-primary uppercase tracking-wider text-center">
              Contract Details
            </h2>

            {/* Rest of the component with centered elements */}
            {proposal ? (
              <div className="space-y-8 w-full max-w-5xl mx-auto">
                {/* Contract Header */}
                <div className="space-y-4 text-center">
                  <h3 className="text-xl font-semibold">
                    {proposal.name || "Unnamed Project"}
                  </h3>
                  <p className="text-muted-foreground whitespace-pre-line max-w-3xl mx-auto">
                    {proposal.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center">
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

                <Separator className="my-8" />

                <div className="grid grid-cols-1 gap-8">
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

                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{proposal.client_phone}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">{proposal.client_address}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contract Summary */}
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
                          {proposal.total_cost || "N/A"}
                        </span>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Created</span>
                          <span>
                            {proposal.created_at
                              ? new Date(
                                  proposal.created_at
                                ).toLocaleDateString("en-US", {
                                  month: "2-digit",
                                  day: "2-digit",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Last Updated</span>
                          <span>
                            {proposal.updated_at
                              ? new Date(
                                  proposal.updated_at
                                ).toLocaleDateString("en-US", {
                                  month: "2-digit",
                                  day: "2-digit",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span>Created By</span>
                          <span>
                            {proposal.created_by?.first_name ||
                              "Contractor First Name"}{" "}
                            {proposal.created_by?.last_name ||
                              "Contractor Last Name"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {proposal.template?.variables &&
                  proposal.template?.variables.length > 0 && (
                    <div className="space-y-4 mt-4">
                      <h3 className="text-lg font-semibold">
                        Project Variables
                      </h3>
                      {(() => {
                        // Group variables by variable_type name
                        const groupedVariables: Record<
                          string,
                          VariableResponse[]
                        > = {};
                        proposal.template.variables.forEach(
                          (variable: VariableResponse) => {
                            const typeName =
                              variable.variable_type?.name || "Other";
                            if (!groupedVariables[typeName]) {
                              groupedVariables[typeName] = [];
                            }
                            groupedVariables[typeName].push(variable);
                          }
                        );

                        return (
                          <div className="grid grid-cols-2 gap-6">
                            {Object.entries(groupedVariables).map(
                              ([typeName, variables]) => (
                                <div
                                  key={typeName}
                                  className="space-y-2 bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                                >
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-6 w-1 bg-primary rounded-full"></div>
                                    <h4 className="font-medium text-sm">
                                      {typeName}
                                    </h4>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    {variables.map((variable) => (
                                      <div
                                        key={variable.id}
                                        className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-md flex justify-between items-center text-sm hover:border-primary/30 transition-colors"
                                      >
                                        <span className="text-gray-600">
                                          {variable.name || "Variable Name"}
                                        </span>
                                        <span className="font-medium bg-white px-2 py-1 rounded text-primary border border-gray-100">
                                          {variable.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        );
                      })()}
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
                            <div className="rounded-lg border p-4 overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
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
                                    .map((element: any) => (
                                      <TableRow key={element.id}>
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

                {proposal.template?.trades &&
                  proposal.template?.trades.length > 0 && (
                    <div className="space-y-6 mt-4">
                      <h3 className="text-lg font-semibold">Project Details</h3>
                      <div className="grid grid-cols-1 gap-6">
                        {proposal.template?.trades.map(
                          (trade: TradeResponse) => (                            <div
                              key={trade.id}
                              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                            >
                              <div className="flex items-center gap-3 mb-4">
                                {/* Trade image */}
                                {trade.image ? (
                                  <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0">
                                    <Image 
                                      src={trade.image}
                                      alt={trade.name || "Trade"}
                                      fill
                                      className="object-cover"
                                      onError={(e) => {
                                        // Fallback to placeholder on error
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-md bg-muted/30 flex items-center justify-center shrink-0">
                                    <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                                  </div>
                                )}
                                <div className="h-6 w-1 bg-primary rounded-full"></div>
                                <h4 className="font-medium">
                                  {trade.name || "Trade Name"}
                                </h4>
                              </div>

                              {trade.elements && trade.elements.length > 0 && (
                                <div className="space-y-2">
                                  {trade.elements.map((element: any) => {
                                    // Calculate total without showing the breakdown
                                    const totalCost =
                                      Number(element.material_cost || 0) +
                                      Number(element.labor_cost || 0);

                                    return (                                      <div
                                        key={element.id}
                                        className="bg-gray-50 rounded-md p-3 border border-gray-100 hover:border-primary/20 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          {/* Element image */}
                                          {element.image ? (
                                            <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0">
                                              <Image 
                                                src={element.image}
                                                alt={element.name || "Element"}
                                                fill
                                                className="object-cover"
                                                onError={(e) => {
                                                  // Fallback to placeholder on error
                                                  e.currentTarget.style.display = 'none';
                                                }}
                                              />
                                            </div>
                                          ) : (
                                            <div className="w-8 h-8 rounded-md bg-muted/30 flex items-center justify-center shrink-0">
                                              <ImageIcon className="h-3 w-3 text-muted-foreground/50" />
                                            </div>
                                          )}

                                          <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                              <h5 className="font-medium text-sm">
                                                {element.name || "Element Name"}
                                              </h5>
                                              <span className="font-medium text-sm bg-white px-3 py-1 rounded text-primary border border-gray-100 ml-3">
                                                ${totalCost}
                                              </span>
                                            </div>

                                            <p className="text-xs text-gray-600 line-clamp-2">
                                              {element.description ||
                                                "No description available"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
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
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  {/* Client Signature - Always an input field unless already signed */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Your Signature</h3>
                    {isContractSigned ? (
                      <div>
                        <div className="h-24 border rounded-lg flex items-center justify-center bg-green-50 border-green-200">
                          {signatures.client.type === "text" ? (
                            <p className="font-medium text-xl text-green-800">
                              {signatures.client.value}
                            </p>
                          ) : (
                            <img
                              src={signatures.client.value}
                              alt="Client signature"
                              className="max-h-full object-contain"
                            />
                          )}
                        </div>
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-center">
                          <p className="text-sm text-green-800 font-medium">
                            ✓ Contract Signed Successfully
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-lg p-4 bg-muted/10">
                        <div className="flex gap-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="clientInitialsOption"
                              name="clientSignatureType"
                              className="w-4 h-4"
                              checked={signatures.client.type === "text"}
                              onChange={() => handleSignatureTypeChange("text")}
                            />
                            <Label htmlFor="clientInitialsOption">
                              Type Initials
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
                                handleSignatureTypeChange("image")
                              }
                            />
                            <Label htmlFor="clientImageOption">
                              Upload Signature
                            </Label>
                          </div>
                        </div>

                        {signatures.client.type === "text" ? (
                          <div className="space-y-2">
                            <Label htmlFor="client_initials">
                              Enter your initials
                            </Label>
                            <Input
                              id="client_initials"
                              name="client_initials"
                              value={signatures.client.value}
                              onChange={handleInputChange}
                              placeholder="Type your initials (no spaces)"
                              className="font-medium"
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
                              onChange={handleSignatureImageUpload}
                              className="text-sm"
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
                    )}
                    <p className="text-sm text-muted-foreground">
                      Date:{" "}
                      {proposal?.contract?.client_signed_at
                        ? formatDate(proposal.contract.client_signed_at)
                        : isContractSigned
                        ? new Date().toLocaleDateString("en-US", {
                            month: "2-digit",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : "N/A"}
                    </p>
                  </div>

                  {/* Contractor Signature - Read-only view */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      Contractor Signature
                    </h3>
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
                          Pending contractor signature
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Date:{" "}
                      {proposal?.contract?.contractor_signed_at
                        ? formatDate(proposal.contract.contractor_signed_at)
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Add Sign Contract Button */}
                {!isContractSigned && (
                  <div className="mt-8 text-center">
                    <Button
                      variant="default"
                      className="px-8 py-2 text-base"
                      onClick={handleSignContract}
                      disabled={
                        signContractMutation.isPending ||
                        !signatures.client.value
                      }
                    >
                      {signContractMutation.isPending ? (
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
                          Signing...
                        </>
                      ) : (
                        "Sign Contract"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-base text-muted-foreground text-center">
                No contract details available.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
