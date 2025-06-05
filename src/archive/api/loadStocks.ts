"use server";

import { loadStocks as loadStocksService } from "@/services/stockService";

export async function loadStocks() {
  try {
    console.log("Starting stock database refresh...");
    const encoder = new TextEncoder();
    const writer = {
      write: async (data: string) => console.log(data),
      close: async () => {}
    };
    await loadStocksService(writer, encoder);
    return { success: true };
  } catch (error) {
    console.error("Error loading stocks:", error);
    return { success: false, error: String(error) };
  }
}
