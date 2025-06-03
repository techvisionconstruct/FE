import { TradeCreateRequest } from "@/types/trades/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function createTrade(trade: TradeCreateRequest) {
  try {
    const TOKEN = Cookies.get("auth-token");
    const payload: Record<string, any> = {};

    if (trade.name) payload.name = trade.name;
    if (trade.description) payload.description = trade.description;
    if (trade.image !== undefined) payload.image = trade.image;
    if (trade.elements && trade.elements.length > 0)
      payload.elements = trade.elements;

    console.log("Creating trade with payload:", payload);

    const response = await fetch(`${API_URL}/v1/trades/create/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create trade");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating trade:", error);
    throw error;
  }
}
