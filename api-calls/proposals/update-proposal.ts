

import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;


export const updateProposal = async (id: string, data: any) => {
  try {
    const TOKEN = Cookies.get('auth-token');
    
    // Log what's being updated for debugging
    console.log(`Updating proposal ${id} with:`, data);
    
    const response = await fetch(`${API_URL}/v1/proposals/update/${id}/`, {
      method: 'PUT',  // Changed to PUT since server only allows PUT requests
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      // Better error handling
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const errorData = await response.json();
        
        // Handle detailed error messages or validation errors
        if (errorData.detail) {
          throw new Error(typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail));
        } else if (errorData.message) {
          throw new Error(typeof errorData.message === 'string' 
            ? errorData.message 
            : JSON.stringify(errorData.message));
        } else {
          // Format the whole error object as a string if no specific field
          throw new Error(JSON.stringify(errorData, null, 2));
        }
      } else {
        const text = await response.text();
        throw new Error(`Failed to update proposal: ${response.status} - ${text || 'Unknown error'}`);
      }
    }

    const result = await response.json();
    console.log('Proposal update success:', result);
    return result;
  } catch (error) {
    console.error('Error updating proposal:', error);
    throw error;
  }
};
