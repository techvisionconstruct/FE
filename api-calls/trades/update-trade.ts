import { TradeUpdateRequest } from "@/types/trades/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function updateTrade(tradeId: string, trade: TradeUpdateRequest) {
  try {
    const TOKEN = Cookies.get("auth-token");
    const payload: Record<string, any> = {};

    if (trade.name !== undefined) payload.name = trade.name;
    if (trade.description !== undefined)
      payload.description = trade.description;
    if (trade.image !== undefined) payload.image = trade.image;
    if (trade.elements !== undefined) payload.elements = trade.elements;

    console.log("Updating trade with payload:", payload);

    const response = await fetch(`${API_URL}/v1/trades/update/${tradeId}/`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update trade");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating trade:", error);
    throw error;
  }
}
