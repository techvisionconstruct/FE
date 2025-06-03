import { ElementUpdateRequest } from "@/types/elements/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function patchElement(
  elementId: string,
  element: Partial<ElementUpdateRequest>
) {
  try {
    const TOKEN = Cookies.get('auth-token');
    // Only include fields that are provided (not undefined)
    const payload = Object.fromEntries(
      Object.entries(element).filter(([_, value]) => value !== undefined)
    );

    console.log("Sending element patch payload:", payload);

    const response = await fetch(
      `${API_URL}/v1/elements/patch/${elementId}/`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to patch element");
    }

    return await response.json();
  } catch (error) {
    console.error("Error patching element:", error);
    throw error;
  }
}