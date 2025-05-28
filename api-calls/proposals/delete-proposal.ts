

import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const getAuthToken = () => Cookies.get('auth-token');

export const deleteProposal = async (id: string) => {
  const token = getAuthToken();
  
  try {
    const res = await fetch(`${API_URL}/v1/proposals/delete/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Failed to delete proposal (Status: ${res.status})`);
    }

    const data = await res.json();
    return { success: true, message: data.message };
  } catch (error) {
    console.error("Error deleting proposal:", error);
    throw error;
  }
}