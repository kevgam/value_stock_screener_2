"use server";

import { getUndervaluedStocks } from "@/services/stockService";

export async function refreshStocks() {
  try {
    const stocks = await getUndervaluedStocks();
    return { success: true, stocks };
  } catch (error) {
    console.error("Error refreshing stocks:", error);
    return { success: false, error: String(error) };
  }
}
