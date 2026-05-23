import { createContext, useContext } from "react";

export type Tier = "free" | "regular" | "premium";

export const TierContext = createContext<Tier>("free");

export function useTier(): Tier {
  return useContext(TierContext);
}
