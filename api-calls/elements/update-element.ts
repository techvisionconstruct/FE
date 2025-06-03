import {
  ElementCreateRequest,
  ElementUpdateRequest,
} from "@/types/elements/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function updateElement(
  elementId: string,
  element: ElementUpdateRequest
) {
  try {
    const TOKEN = Cookies.get("auth-token");
    const payload: Record<string, any> = {};
    payload.name = element.name ?? "";
    payload.description = element.description ?? "";
    if (element.image !== undefined) payload.image = element.image;
    payload.material_cost_formula = element.material_cost_formula ?? "";
    payload.labor_cost_formula = element.labor_cost_formula ?? "";
    if (element.markup !== undefined) payload.markup = element.markup;

    console.log("Sending element update payload:", payload);

    const response = await fetch(
      `${API_URL}/v1/elements/update/${elementId}/`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update element");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating element:", error);
    throw error;
  }
}
