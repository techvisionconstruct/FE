import { ElementCreateRequest } from "@/types/elements/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function createElement(element: ElementCreateRequest) {
  try {
    const TOKEN = Cookies.get('auth-token');
    const payload: Record<string, any> = {};
    if (element.name) payload.name = element.name;
    if (element.description) payload.description = element.description;
    if (element.image !== undefined) payload.image = element.image;
    if (element.material_cost_formula)
      payload.material_cost_formula = element.material_cost_formula;
    if (element.labor_cost_formula)
      payload.labor_cost_formula = element.labor_cost_formula;
    if (element.markup !== undefined) payload.markup = element.markup;

    console.log("Creating element with payload:", payload);

    const response = await fetch(`${API_URL}/v1/elements/create/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create element");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating element:", error);
    throw error;
  }
}
