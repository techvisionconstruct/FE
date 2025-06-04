

import { VariableCreateRequest } from "@/types/variables/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function createVariable(variable: VariableCreateRequest) {
  try {
    const TOKEN = Cookies.get('auth-token');
    const payload: Record<string, any> = {};
    
    if (variable.name) payload.name = variable.name;
    if (variable.description) payload.description = variable.description;
    if (variable.value !== undefined) payload.value = variable.value; 
    if (variable.is_global !== undefined) payload.is_global = variable.is_global;
    if (variable.variable_type) payload.variable_type = variable.variable_type;
    
    const response = await fetch(`${API_URL}/v1/variables/create/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to create variable')
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating template:', error)
    throw error
  }
}