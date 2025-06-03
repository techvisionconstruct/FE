

import { ContractSignRequest } from "@/types/contracts/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const clientSignContract = async (id: string, signatureData: ContractSignRequest) => {
  try {
 
    
    const payload: Record<string, any> = {};
    
    if (signatureData.client_signature) payload.client_signature = signatureData.client_signature;
    if (signatureData.client_initials) payload.client_initials = signatureData.client_initials;
    
    const response = await fetch(`${API_URL}/v1/contracts/sign/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to sign contract');
    }

    return await response.json();
  } catch (error) {
    console.error('Error signing contract:', error);
    throw error;
  }
};
