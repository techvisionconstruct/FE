import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const deleteContract = async (id: string) => {
  try {
    const TOKEN = Cookies.get("auth-token");

    const response = await fetch(`${API_URL}/v1/contracts/delete/${id}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete contract");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting contract:", error);
    throw error;
  }
};
