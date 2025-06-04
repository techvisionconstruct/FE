

import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;


export const deleteTemplate = async (id: string) => {
  const TOKEN = Cookies.get('auth-token');
  
  try {
    const res = await fetch(`${API_URL}/v1/templates/delete/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete template (Status: ${res.status})`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting template:", error);
    throw error;
  }
}
