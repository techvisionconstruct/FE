import React, { useState, useMemo, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { createContract } from "@/api-calls/contracts/create-contract";
import { updateContract } from "@/api-calls/contracts/update-contract";
import { updateProposal } from "@/api-calls/proposals/update-proposal";
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
  Textarea,
} from "@/components/shared";
import { Alert } from "@/components/shared/alert/alert";
import { AlertTitle } from "@/components/shared/alert/alert-title";
import { AlertDescription } from "@/components/shared/alert/alert-description";
import { toast } from "sonner";
import { ProposalResponse } from "@/types/proposals/dto";
import { TradeResponse } from "@/types/trades/dto";
import { VariableResponse } from "@/types/variables/dto";
import {
  AlertTriangle,
  Save,
  RefreshCcw,
  Edit,
  CheckCircle,
  Pencil,
  Plus,
  Trash2,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { ContractCreateRequest } from "@/types/contracts/dto";

interface TermSection {
  id: number;
  title: string;
  description: string;
  isNew?: boolean;
}

interface Signature {
  type: "text" | "image";
  value: string;
  file: File | null;
}

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  textareaHeight?: string;
  placeholder?: string;
  label?: string;
  tooltip?: string;
}

interface EditableClientFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  placeholder?: string;
}

// Editable Field Component
const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onChange,
  onSave,
  textareaHeight = "min-h-[100px]",
  placeholder = "Enter text here",
  label,
  tooltip,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const skipNextOutsideClick = useRef(false);

  // Update temp value when prop value changes
  useEffect(() => {
    setTempValue(value);
  }, [value]);  // Handle clicks outside the textarea to save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skipNextOutsideClick.current) {
        skipNextOutsideClick.current = false;
        return;
      }

      if (
        isEditing &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !(
          event.target instanceof Element &&
          event.target.closest("button")
        )
      ) {
        handleSave();
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isEditing, tempValue]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };
  const handleSave = async () => {
    if (tempValue !== value) {
      setIsSaving(true);
      onChange(tempValue);
      if (onSave) await onSave();
      setIsSaving(false);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    skipNextOutsideClick.current = true;
    setTempValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="relative">
        {label && <Label className="mb-1 block">{label}</Label>}
        <Textarea
          ref={inputRef}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`w-full p-3 focus:ring-2 focus:ring-primary/50 ${textareaHeight}`}
          placeholder={placeholder}
          autoFocus
        />
        <div className="flex justify-end mt-2 space-x-2 items-center">
          <div className="flex items-center gap-1">
            {isSaving ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleSave}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 w-full">
      {label && <Label className="mb-1 block">{label}</Label>}
      <div
        className="p-3 rounded-md hover:bg-muted/20 cursor-pointer relative group transition-all"
        onClick={() => setIsEditing(true)}
        title={tooltip || "Click to edit"}
      >
        <div className="whitespace-pre-line">{value || placeholder}</div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Service Agreement Title Field Component - Follows same pattern as other editable components
const ServiceAgreementTitleField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}> = ({ value, onChange, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextOutsideClick = useRef(false);

  // Update temp value when prop value changes
  useEffect(() => {
    setTempValue(value);
  }, [value]);

  // Handle clicks outside to save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skipNextOutsideClick.current) {
        skipNextOutsideClick.current = false;
        return;
      }

      if (
        isEditing &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !(
          event.target instanceof Element &&
          event.target.closest("button")
        )
      ) {
        handleSave();
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isEditing, tempValue]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const handleSave = async () => {
    if (tempValue !== value) {
      setIsSaving(true);
      onChange(tempValue);
      if (onSave) {
        await onSave();
      }
      setIsSaving(false);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    skipNextOutsideClick.current = true;
    setTempValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="relative">
        <Input
          ref={inputRef}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-3xl font-bold text-center uppercase mb-2"
          autoFocus
          placeholder="Enter agreement title"
        />
        <div className="flex justify-center space-x-2">
          {isSaving ? (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleSave}
              >
                <Check className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <h1
      className="text-3xl font-bold mt-2 mb-8 uppercase text-center group relative cursor-pointer hover:text-primary transition-colors"
      onClick={() => setIsEditing(true)}
    >
      {value}
      <Edit className="h-4 w-4 absolute -right-6 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
    </h1>
  );
};

// Editable Client Field Component
const EditableClientField: React.FC<EditableClientFieldProps> = ({
  label,
  value,
  onChange,
  onSave,
  placeholder = "Enter information",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextOutsideClick = useRef(false);

  // Update temp value when prop value changes
  useEffect(() => {
    setTempValue(value);
  }, [value]);  // Handle clicks outside to save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skipNextOutsideClick.current) {
        skipNextOutsideClick.current = false;
        return;
      }

      if (
        isEditing &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !(
          event.target instanceof Element &&
          event.target.closest("button")
        )
      ) {
        handleSave();
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isEditing, tempValue]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };
  const handleSave = async () => {
    if (tempValue !== value) {
      setIsSaving(true);
      onChange(tempValue);
      if (onSave) await onSave();
      setIsSaving(false);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    skipNextOutsideClick.current = true;
    setTempValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2 relative">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="font-medium"
            placeholder={placeholder}
            autoFocus
          />
          <div className="flex items-center gap-1">
            {isSaving ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleSave}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className="font-medium cursor-pointer flex items-center justify-between group transition-colors hover:text-primary rounded px-2 py-1 -mx-2 hover:bg-muted/20"
        onClick={() => setIsEditing(true)}
      >
        <span>{value || placeholder}</span>
        <Edit className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
      </p>
    </div>
  );
};

export function ContractDetails({ proposal }: { proposal: ProposalResponse }) {
  const [isSending, setIsSending] = useState(false);
  // Add local contract state
  const [localContract, setLocalContract] = useState(proposal.contract);
  // Use localContract if available, otherwise fallback to proposal.contract
  const contract = localContract || proposal.contract;

  // Add isEditing state that was missing
  const [isEditing, setIsEditing] = useState(true);

  // State for editable fields
  const [isEditingServiceAgreementTitle, setIsEditingServiceAgreementTitle] =
    useState(false);
  const [isEditingServiceAgreementBody, setIsEditingServiceAgreementBody] =
    useState(false);
  const [editingTermSectionId, setEditingTermSectionId] = useState<
    number | null
  >(null);

  // Client information states with detailed saving status
  const [clientName, setClientName] = useState(proposal.client_name || "");
  const [clientEmail, setClientEmail] = useState(proposal.client_email || "");
  const [clientPhone, setClientPhone] = useState(proposal.client_phone || "");
  const [clientAddress, setClientAddress] = useState(
    proposal.client_address || ""
  );
  const [isClientInfoSaving, setIsClientInfoSaving] = useState(false);

  // Add state for editable contract name and description
  const [contractName, setContractName] = useState(proposal.name || "");
  const [contractDescription, setContractDescription] = useState(
    proposal.description || ""
  );

  // Default service agreement content with title as first line
  const defaultServiceAgreement = `SERVICE AGREEMENT

This Service Agreement is entered into as of the date of signing, by and between:

Service Provider: Simple ProjeX, with its principal place of business at Irvine, California, and
Client: ${proposal.client_name || "[CLIENT_NAME]"}, with a primary address at ${
    proposal.client_address || "[CLIENT_ADDRESS]"
  }.

1. SCOPE OF SERVICES:
The Service Provider agrees to perform the services as outlined in the attached Proposal.

2. PAYMENT TERMS:
Payment is due within 30 days of invoice receipt. Late payments are subject to a 1.5% monthly interest charge.

3. TERM AND TERMINATION:
This Agreement shall commence on the date of signing and shall continue until the services are completed, unless terminated earlier.

4. CHANGES AND MODIFICATIONS:
Any changes to the scope of work must be agreed upon in writing by both parties.`;

  // Split the content into title and body
  const initialAgreementContent =
    proposal.contract?.service_agreement_content ||
    proposal.contract?.service_agreement?.content ||
    defaultServiceAgreement;

  const splitContent = (content: string) => {
    const lines = content.split("\n");
    let title = "";
    let restLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() !== "") {
        title = lines[i].trim();
        restLines = lines.slice(i + 1);
        break;
      }
    }
    return { title, body: restLines.join("\n").replace(/^\n+/, "") };
  };

  const [serviceAgreementTitle, setServiceAgreementTitle] = useState(
    splitContent(initialAgreementContent).title
  );
  const [serviceAgreementBody, setServiceAgreementBody] = useState(
    splitContent(initialAgreementContent).body
  );

  const serviceAgreementContent = `${serviceAgreementTitle}\n${serviceAgreementBody}`;

  // Parse terms and conditions
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

  // Handle signatures
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

  // Handle input changes for signatures
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

  const handleSignatureImageUpload = async (
    party: "client" | "contractor",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64String = await fileToBase64(file);
        setSignatures((prev) => ({
          ...prev,
          [party]: {
            ...prev[party],
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

  // Terms section management
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

    // Start editing the new section
    setEditingTermSectionId(newId);
  };

  // Remove a terms section
  const removeTermsSection = (id: number) => {
    setTermsSections((prev) => prev.filter((section) => section.id !== id));
    if (editingTermSectionId === id) {
      setEditingTermSectionId(null);
    }
  };

  // Update a term section
  const updateTermSection = (
    id: number,
    field: "title" | "description",
    value: string
  ) => {
    setTermsSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, [field]: value } : section
      )
    );
  };

  // State for terms and conditions - parse from termsAndConditions string if available
  const [termsSections, setTermsSections] = useState<TermSection[]>(() => {
    if (contract?.terms) {
      if (typeof contract.terms === "string") {
        return parseTermsAndConditions(contract.terms);
      } else {
        return contract.terms as TermSection[];
      }
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
      contract?.client_initials !== undefined ||
      contract?.client_signature !== undefined ||
      contract?.contractor_initials !== undefined ||
      contract?.contractor_signature !== undefined
    ) {
      return {
        client: getSignatureData(
          contract.client_initials ?? null,
          contract.client_signature ?? null
        ),
        contractor: getSignatureData(
          contract.contractor_initials ?? null,
          contract.contractor_signature ?? null
        ),
      };
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
    contract?.client_signature ||
    (contract?.client_initials && contract?.client_initials.trim() !== "")
  );

  // Check if contractor signature is already signed
  const isContractorSigned = !!(
    contract?.contractor_signature ||
    (contract?.contractor_initials && contract?.contractor_initials.trim() !== "")
  );

  // Create contract mutation
  const createContractMutation = useMutation({
    mutationFn: (contractData: ContractCreateRequest) =>
      createContract(contractData),
    onSuccess: (data) => {
      toast.success("Contract created successfully!");
      setLocalContract(data); // Update local contract state
    },
    onError: (error: any) => {
      toast.error(
        `Failed to create contract: ${error.message || "Unknown error"}`
      );
    },
  });

  // Update contract mutation
  const updateContractMutation = useMutation({
    mutationFn: ({
      id,
      contract,
    }: {
      id: string;
      contract: Partial<ContractCreateRequest>;
    }) => updateContract(id, contract),
    onSuccess: (data) => {
      toast.success("Contract updated successfully!");
    },
    onError: (error: any) => {
      toast.error(
        `Failed to update contract: ${error.message || "Unknown error"}`
      );
    },
  });

  // Update proposal mutation with enhanced feedback and better error handling
  const updateProposalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateProposal(id, data),
    onSuccess: () => {
      toast.success("Client information updated successfully!", {
        id: "client-info-update",
      });
    },
    onError: (error: any) => {
      // Improve error message handling
      let errorMessage = "Failed to update client information";

      if (error instanceof Error) {
        try {
          // Check if it's a JSON string (from our API)
          const parsedError = JSON.parse(error.message);
          if (typeof parsedError === "object") {
            // Format nested validation errors if present
            if (parsedError.detail && typeof parsedError.detail === "object") {
              errorMessage = Object.entries(parsedError.detail)
                .map(([field, errors]) => `${field}: ${errors}`)
                .join(", ");
            } else {
              errorMessage = error.message;
            }
          } else {
            errorMessage = error.message;
          }
        } catch (e) {
          // If it's not JSON, just use the error message directly
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage, {
        id: "client-info-update-error",
      });
    },
  });

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Use a debounced effect for auto-saving the service agreement
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (
        proposal.client_name !== clientName ||
        proposal.client_email !== clientEmail ||
        proposal.client_phone !== clientPhone ||
        proposal.client_address !== clientAddress
      ) {
        saveClientInfoChanges();
      }
    }, 1500); // 1.5 second debounce to prevent too many saves

    return () => clearTimeout(debounceTimer);
  }, [clientName, clientEmail, clientPhone, clientAddress]);

  // Auto-save when client info changes with better error handling
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (!proposal.id) {
        return;
      }

      if (
        proposal.client_name !== clientName ||
        proposal.client_email !== clientEmail ||
        proposal.client_phone !== clientPhone ||
        proposal.client_address !== clientAddress
      ) {
        setIsClientInfoSaving(true);

        const updatedFields: Record<string, string> = {
          // Always include name which is a required field
          name: proposal.name || "",
        };

        // Only include fields that have actually changed and have valid values
        if (proposal.client_name !== clientName && clientName !== undefined) {
          updatedFields.client_name = clientName;
        }

        if (
          proposal.client_email !== clientEmail &&
          clientEmail !== undefined
        ) {
          updatedFields.client_email = clientEmail;
        }

        if (
          proposal.client_phone !== clientPhone &&
          clientPhone !== undefined
        ) {
          updatedFields.client_phone = clientPhone;
        }

        if (
          proposal.client_address !== clientAddress &&
          clientAddress !== undefined
        ) {
          updatedFields.client_address = clientAddress;
        }

        updateProposalMutation.mutate({
          id: proposal.id,
          data: updatedFields,
        });
      } else {
        setIsClientInfoSaving(false);
      }
    }, 1500); // 1.5 second debounce to prevent too many saves

    return () => clearTimeout(debounceTimer);
  }, [clientName, clientEmail, clientPhone, clientAddress]);

  // Enhanced save client information with better error handling
  const saveClientInfoChanges = async () => {
    if (!proposal.id) return;

    setIsClientInfoSaving(true);

    try {
      // Create a properly typed object with client information
      const clientData: Record<string, string> = {
        // Always include name which is a required field on the backend
        name: proposal.name || "",
      };

      if (clientName) clientData.client_name = clientName;
      if (clientEmail) clientData.client_email = clientEmail;
      if (clientPhone) clientData.client_phone = clientPhone || ""; // Send empty string instead of undefined if blank
      if (clientAddress) clientData.client_address = clientAddress || ""; // Send empty string instead of undefined if blank

      await updateProposalMutation.mutateAsync({
        id: proposal.id,
        data: clientData,
      });
    } catch (error) {
      console.error("Error in saveClientInfoChanges:", error);
    } finally {
      setIsClientInfoSaving(false);
    }
  };

  // Save service agreement changes
  const saveServiceAgreement = async () => {
    if (!contract || !contract.id) {
      toast.info(
        "Create a contract first before saving service agreement changes."
      );
      return;
    }

    // The auto-save effect will handle the contract update
    // This function now just returns without explicitly calling update
    return;
  };

  // Save terms section
  const saveTerms = async () => {
    if (!contract || !contract.id) {
      toast.info("Create a contract first before saving terms changes.");
      return;
    }

    // The auto-save effect will handle the contract update
    return;
  };

  // Enhanced Term Section Editor
  const EditableTermSection: React.FC<{
    section: TermSection;
    index: number;
    onRemove: () => void;
    onSave: () => void;
  }> = ({ section, index, onRemove, onSave }) => {
    const [isEditing, setIsEditing] = useState(
      editingTermSectionId === section.id
    );
    const [title, setTitle] = useState(section.title);
    const [description, setDescription] = useState(section.description);
    const [isSaving, setIsSaving] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const skipNextOutsideClick = useRef(false);

    useEffect(() => {
      setIsEditing(editingTermSectionId === section.id);
    }, [editingTermSectionId, section.id]);

    // Handle clicks outside to save - improved to avoid saving when editing text
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (skipNextOutsideClick.current) {
          skipNextOutsideClick.current = false;
          return;
        }

        if (
          isEditing &&
          titleRef.current &&
          descriptionRef.current &&
          !titleRef.current.contains(event.target as Node) &&
          !descriptionRef.current.contains(event.target as Node) &&
          !(
            event.target instanceof Element &&
            event.target.closest(".term-section-buttons")
          ) &&
          !(
            event.target instanceof Element &&
            event.target.closest(".term-section-actions")
          )
        ) {
          handleSave();
        }
      };

      if (isEditing) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isEditing, title, description]);

    const handleSave = async () => {
      setIsSaving(true);
      updateTermSection(section.id, "title", title);
      updateTermSection(section.id, "description", description);
      setEditingTermSectionId(null);
      await onSave();
      setIsSaving(false);
    };

    const handleCancel = () => {
      skipNextOutsideClick.current = true;

      if (section.isNew) {
        onRemove();
      } else {
        setTitle(section.title);
        setDescription(section.description);
        setEditingTermSectionId(null);
      }
    };

    if (isEditing) {
      return (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold">Section {index + 1}</p>
            <div className="flex gap-2 term-section-buttons">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter section title"
              className="font-medium"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Section Content</Label>
            <Textarea
              ref={descriptionRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter section content"
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-2 term-section-actions">
            {isSaving ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleSave}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        className="cursor-pointer"
        onClick={() => setEditingTermSectionId(section.id)}
      >
        <div className="flex items-baseline justify-between mb-2 group">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full border border-primary/30 flex items-center justify-center flex-shrink-0 text-primary bg-primary/5">
              <span className="text-xs font-bold">{index + 1}</span>
            </div>
            <h5 className="text-base font-bold uppercase tracking-wide text-slate-700">
              {section.title}
            </h5>
          </div>
          <Edit className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
        </div>
        <div className="ml-10 text-sm text-slate-600 leading-relaxed">
          {section.description}
        </div>
      </div>
    );
  };

  // Handle contract submit - readd the missing function
  const handleSubmit = () => {
    const termsString = termsSections
      .map((section) => `${section.title}: ${section.description}`)
      .join("\n");

    const payload: ContractCreateRequest = {
      name: proposal?.name || "",
      description: proposal?.description || "",
      status: proposal?.contract?.status || undefined,
      contractor_initials:
        signatures.contractor?.type === "text"
          ? signatures.contractor.value
          : undefined,
      contractor_signature:
        signatures.contractor?.type === "image"
          ? signatures.contractor.value
          : undefined,
      terms: termsString,
      service_agreement_content: `${serviceAgreementTitle}\n${serviceAgreementBody}`,
      proposal_id: proposal?.id || undefined,
    };

    if (proposal.contract && proposal.contract.id) {
      updateContractMutation.mutate({
        id: proposal.contract.id,
        contract: payload,
      });
    } else {
      createContractMutation.mutate(payload);
    }
  };

  // Re-add the sendProposalToClient function
  const sendProposalToClient = async () => {
    if (!proposal.id) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    setIsSending(true);
    try {
      const response = await fetch(`${API_URL}/v1/proposals/send/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposal_id: proposal.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send proposal");
      }

      // Show success message
      toast.success("Proposal has been sent to the client successfully.");
    } catch (error) {
      console.error("Error sending proposal:", error);
      // Show error message
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred while sending the proposal."
      );
    } finally {
      setIsSending(false);
    }
  };

  // Check if contract is already signed by client and disable editing if it is
  React.useEffect(() => {
    if (isContractSigned) {
      setIsEditing(false);
    }
  }, [isContractSigned]);

  // Add auto-save functionality to update contract after changes
  useEffect(() => {
    // Only run auto-save if contract already exists and has an ID
    if (contract && contract.id) {
      const autoSaveTimer = setTimeout(() => {
        // Don't auto-save if we're creating a new contract or if there's an ongoing update
        if (
          !updateContractMutation.isPending &&
          !createContractMutation.isPending
        ) {
          handleSubmit();
        }
      }, 500);

      return () => clearTimeout(autoSaveTimer);
    }
  }, [
    // Dependencies - changes to any of these will trigger auto-save
    serviceAgreementTitle,
    serviceAgreementBody,
    termsSections,
    signatures,
  ]);

  // Add auto-save for contract name and description
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (
        proposal.name !== contractName ||
        proposal.description !== contractDescription
      ) {
        saveContractInfoChanges();
      }
    }, 1500); // 1.5 second debounce

    return () => clearTimeout(debounceTimer);
  }, [contractName, contractDescription]);

  // Enhanced save contract info changes function
  const saveContractInfoChanges = async () => {
    if (!proposal.id) return;

    try {
      // Update proposal name and description
      await updateProposalMutation.mutateAsync({
        id: proposal.id,
        data: {
          name: contractName,
          description: contractDescription,
        },
      });

      // If we have a contract, also update it
      if (contract && contract.id) {
        await updateContractMutation.mutateAsync({
          id: contract.id,
          contract: {
            name: contractName,
            description: contractDescription,
          },
        });
      }
    } catch (error) {
      console.error("Error in saveContractInfoChanges:", error);
    }
  };

  return (
    <div className="w-full mx-auto">
      {contract == null && (
        <Alert className="mb-4 border-yellow-300 bg-yellow-50 text-yellow-900 flex items-center gap-3">
          <AlertTriangle
            color="#f0b000"
            className="h-5 w-5 mt-1.5 mr-2 flex-shrink-0"
          />
          <div className="mt-2">
            <AlertTitle>Draft Mode</AlertTitle>
            <AlertDescription>
              Contract is not yet created. This is just a draft.
            </AlertDescription>
          </div>
        </Alert>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="p-6 rounded-lg border bg-muted/30 w-full">
            <div className="mb-12 max-w-4xl mx-auto">              {/* Service Agreement Title - Using consistent editable pattern */}
              <div className="text-center mb-8">
                <ServiceAgreementTitleField
                  value={serviceAgreementTitle}
                  onChange={setServiceAgreementTitle}
                  onSave={saveServiceAgreement}
                />
              </div>

              {/* Service Agreement Content - Enhanced Editable Field */}
              <EditableField
                value={serviceAgreementBody}
                onChange={setServiceAgreementBody}
                onSave={saveServiceAgreement}
                textareaHeight="min-h-[300px]"
                placeholder="Enter service agreement content"
                tooltip="Click to edit agreement content"
              />
            </div>

            <h2 className="text-2xl font-bold mb-4 text-primary uppercase tracking-wider text-center">
              Contract Details
            </h2>

            {proposal ? (
              <div className="space-y-8 w-full">
                {/* Contract Header - Make name and description editable */}
                <div className="space-y-4">
                  <div className="group relative">
                    <EditableClientField
                      label="Project Name"
                      value={contractName}
                      onChange={setContractName}
                      onSave={saveContractInfoChanges}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Project Description
                    </p>
                    <EditableField
                      value={contractDescription}
                      onChange={setContractDescription}
                      onSave={saveContractInfoChanges}
                      textareaHeight="min-h-[100px]"
                      placeholder="Enter project description"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {proposal.template?.trades?.map((trade: TradeResponse) => (
                      <Badge
                        key={trade.id}
                        variant="outline"
                        className="font-semibold uppercase text-xs"
                      >
                        {trade.name || "Trade Name"}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Client and Contractor Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Client Information - Enhanced Editable Fields */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex justify-between items-center">
                        Client Information
                        {isClientInfoSaving && (
                          <Loader2 className="h-4 w-4 animate-spin ml-2 text-muted-foreground" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <EditableClientField
                        label="Client Name"
                        value={clientName}
                        onChange={setClientName}
                        onSave={saveClientInfoChanges}
                        placeholder="Enter client name"
                      />
                      <EditableClientField
                        label="Email"
                        value={clientEmail}
                        onChange={setClientEmail}
                        onSave={saveClientInfoChanges}
                        placeholder="Enter email address"
                      />
                      <EditableClientField
                        label="Phone"
                        value={clientPhone}
                        onChange={setClientPhone}
                        onSave={saveClientInfoChanges}
                        placeholder="Enter phone number"
                      />
                      <EditableClientField
                        label="Address"
                        value={clientAddress}
                        onChange={setClientAddress}
                        onSave={saveClientInfoChanges}
                        placeholder="Enter address"
                      />
                    </CardContent>
                  </Card>

                  {/* Contract Summary - Same as before */}
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

                {/* Project Variables - Same as before */}
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
                        proposal.template.variables.forEach((variable) => {
                          const typeName =
                            variable.variable_type?.name || "Other";
                          if (!groupedVariables[typeName]) {
                            groupedVariables[typeName] = [];
                          }
                          groupedVariables[typeName].push(variable);
                        });

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

                {/* Project Elements - Same as before */}
                {proposal.template?.trades &&
                  proposal.template?.trades.length > 0 && (
                    <div className="space-y-6 mt-4">
                      <h3 className="text-lg font-semibold">Project Details</h3>
                      <div className="grid grid-cols-1 gap-6">
                        {proposal.template?.trades.map(
                          (trade: TradeResponse) => (
                            <div
                              key={trade.id}
                              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                            >
                              {" "}
                              <div className="flex items-center gap-3 mb-4">
                                {" "}
                                {trade.image && (
                                  <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img
                                      src={trade.image}
                                      alt={trade.name || "Trade"}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="h-6 w-1 bg-primary rounded-full"></div>
                                <h4 className="font-medium">
                                  {trade.name || "Trade Name"}
                                </h4>
                              </div>
                              {trade.elements && trade.elements.length > 0 && (
                                <div className="space-y-2">
                                  {trade.elements.map((element: any) => (
                                    <div
                                      key={element.id}
                                      className="bg-gray-50 rounded-md p-3 border border-gray-100 hover:border-primary/20 transition-colors"
                                    >
                                      {" "}
                                      <div className="flex items-start gap-3 mb-1">
                                        {" "}
                                        {element.image && (
                                          <div className="h-11 w-11 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                            <img
                                              src={element.image}
                                              alt={element.name || "Element"}
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                        )}
                                        <div className="flex-1">
                                          <div className="flex justify-between items-center">
                                            <h5 className="font-medium text-sm">
                                              {element.name || "Element Name"}
                                            </h5>
                                            <span className="font-medium text-sm bg-white px-3 py-1 rounded text-primary border border-gray-100">
                                              {new Intl.NumberFormat("en-US", {
                                                style: "currency",
                                                currency: "USD",
                                              }).format(
                                                (parseFloat(
                                                  element.material_cost || 0
                                                ) +
                                                  parseFloat(
                                                    element.labor_cost || 0
                                                  )) 
                                                  
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-xs text-gray-600 line-clamp-2">
                                        {element.description ||
                                          "No description available"}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className="inline-flex items-center text-xs bg-white px-2 py-1 rounded text-gray-600 border border-gray-200">
                                          Material: $
                                          {Number(
                                            element.material_cost || 0
                                          ).toFixed(2)}
                                        </span>
                                        <span className="inline-flex items-center text-xs bg-white px-2 py-1 rounded text-gray-600 border border-gray-200">
                                          Labor: $
                                          {Number(
                                            element.labor_cost || 0
                                          ).toFixed(2)}
                                        </span>
                                        <span className="inline-flex items-center text-xs bg-white px-2 py-1 rounded text-gray-600 border border-gray-200">
                                          Markup: {element.markup || 0}%
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Terms and Conditions - Enhanced with better UX */}
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Terms and Conditions
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addTermsSection}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" /> Add Section
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {termsSections.map((section, index) => (
                      <div
                        key={section.id}
                        className="bg-white p-4 rounded-lg border border-gray-100 hover:border-primary/20 transition-colors"
                      >
                        <EditableTermSection
                          section={section}
                          index={index}
                          onRemove={() => removeTermsSection(section.id)}
                          onSave={saveTerms}
                        />
                      </div>
                    ))}

                    {termsSections.length === 0 && (
                      <div className="text-center py-8 border border-dashed rounded-lg">
                        <p className="text-muted-foreground">
                          No terms and conditions added yet
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addTermsSection}
                          className="mt-2"
                        >
                          Add Your First Section
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signatures - Existing code with minor improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Client Signature</h3>

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

                    <p className="text-sm text-muted-foreground">
                      Date:{" "}
                      {proposal?.contract?.client_signed_at
                        ? formatDate(proposal.contract.client_signed_at)
                        : "N/A"}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      Contractor Signature
                    </h3>
                    {isEditing && !isContractorSigned ? (
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
                              onChange={(e) => {
                                // Prevent spaces in initials
                                const value = e.target.value.replace(/\s/g, '');
                                setSignatures((prev) => ({
                                  ...prev,
                                  contractor: {
                                    ...prev.contractor,
                                    value: value,
                                  },
                                }));
                              }}
                              placeholder="Type your initials (no spaces)"
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
                            {isContractorSigned ? "Signed" : "Signature required"}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Date:{" "}
                      {proposal?.contract?.contractor_signed_at
                        ? formatDate(proposal.contract.contractor_signed_at)
                        : "N/A"}
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
                className="w-full flex items-center justify-center gap-2 mt-2"
                disabled={
                  isSending || !proposal.client_email || isContractSigned
                }
                onClick={async () => {
                  // 1. Update the contract before sending
                  if (contract && contract.id) {
                    await updateContractMutation.mutateAsync({
                      id: contract.id,
                      contract: {
                        name: contractName,
                        description: contractDescription,
                        service_agreement_content: `${serviceAgreementTitle}\n${serviceAgreementBody}`,
                        terms: termsSections
                          .map(
                            (section) =>
                              `${section.title}: ${section.description}`
                          )
                          .join("\n"),
                        contractor_initials:
                          signatures.contractor?.type === "text"
                            ? signatures.contractor.value
                            : undefined,
                        contractor_signature:
                          signatures.contractor?.type === "image"
                            ? signatures.contractor.value
                            : undefined,
                      },
                    });
                  } else if (!contract) {
                    // If contract doesn't exist, create it first
                    await handleSubmit();
                  }

                  // 2. Confirm with the user before sending
                  if (typeof window !== "undefined") {
                    // Custom modal for confirmation
                    const modal = document.createElement("div");
                    modal.style.position = "fixed";
                    modal.style.top = "0";
                    modal.style.left = "0";
                    modal.style.width = "100vw";
                    modal.style.height = "100vh";
                    modal.style.background = "rgba(0,0,0,0.35)";
                    modal.style.display = "flex";
                    modal.style.alignItems = "center";
                    modal.style.justifyContent = "center";
                    modal.style.zIndex = "9999";
                    modal.innerHTML = `
                      <div style="background: white; border-radius: 1rem; box-shadow: 0 8px 32px 0 rgba(31,38,135,0.15); padding: 2.5rem 2rem; max-width: 95vw; width: 400px; text-align: center;">
                        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: #e11d48;">Send Contract to Client?</h2>
                        <p style="margin-bottom: 2rem; color: #444;">Are you sure you want to send this contract to the client? They will receive an email with the contract details.</p>
                        <div style="display: flex; gap: 1rem; justify-content: center;">
                          <button id="modal-cancel-btn" style="padding: 0.5rem 1.5rem; border-radius: 0.5rem; border: none; background: #f3f4f6; color: #222; font-weight: 500; cursor: pointer;">Cancel</button>
                          <button id="modal-confirm-btn" style="padding: 0.5rem 1.5rem; border-radius: 0.5rem; border: none; background: #e11d48; color: #fff; font-weight: 600; cursor: pointer;">Send</button>
                        </div>
                      </div>
                    `;
                    document.body.appendChild(modal);
                    await new Promise<void>((resolve) => {
                      modal
                        .querySelector("#modal-cancel-btn")
                        ?.addEventListener("click", () => {
                          document.body.removeChild(modal);
                          resolve();
                        });
                      modal
                        .querySelector("#modal-confirm-btn")
                        ?.addEventListener("click", async () => {
                          document.body.removeChild(modal);
                          await sendProposalToClient();
                          resolve();
                        });
                    });
                  }
                }}
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
                  className="lucide lucide-send"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>                Send to Client
              </Button>

              {!contract && (
                <Button
                  variant="default"
                  className="w-full mt-2 flex items-center justify-center gap-2"
                  onClick={handleSubmit}
                  disabled={createContractMutation.isPending}
                >
                  {createContractMutation.isPending ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Contract
                    </>
                  )}
                </Button>
              )}
              {/* Removed Update Contract button since we have auto-save now */}

              <Card className="mt-4">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm">Contract Stats</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Variables:</span>
                      <span>{proposal?.template?.variables?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trades:</span>
                      <span>{proposal?.template?.trades?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Terms:</span>
                      <span>{termsSections.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span
                        className={
                          isContractSigned
                            ? "text-green-600"
                            : "text-yellow-600"
                        }
                      >
                        {isContractSigned ? "Signed" : "Draft"}
                      </span>
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
