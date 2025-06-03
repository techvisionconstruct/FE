import { ContractCreateRequest } from "@/types/contracts/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function createContract(contract: ContractCreateRequest) {
  try {
    const TOKEN = Cookies.get("auth-token");
    const payload: Record<string, any> = {};

    if (contract.name) payload.name = contract.name;
    if (contract.description) payload.description = contract.description;
    if (contract.contractor_initials)
      payload.contractor_initials = contract.contractor_initials;
    if (contract.contractor_signature)
      payload.contractor_signature = contract.contractor_signature;
    if (contract.status) payload.status = contract.status;
    if (contract.terms) payload.terms = contract.terms;
    if (contract.proposal_id) payload.proposal_id = contract.proposal_id;
    if (contract.service_agreement_id)
      payload.service_agreement_id = contract.service_agreement_id;
    if (contract.service_agreement_content)
      payload.service_agreement_content = contract.service_agreement_content;

    const response = await fetch(`${API_URL}/v1/contracts/create/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create contract");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating contract:", error);
    throw error;
  }
}
