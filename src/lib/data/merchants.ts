import { loadMerchants } from "./loader";
import type { Merchant } from "./types";

export async function getMerchant(
  merchantName: string,
): Promise<Merchant | null> {
  const merchants = await loadMerchants();
  return merchants.find((merchant) => merchant.comercio === merchantName) ?? null;
}
