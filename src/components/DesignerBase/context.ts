import { createContext, useContext } from "react";
import type { DesignerContextValue } from "./types";

export const DesignerContext = createContext<DesignerContextValue | null>(null);

export function useDesignerContext(): DesignerContextValue {
  const ctx = useContext(DesignerContext);
  if (!ctx) throw new Error("useDesignerContext must be used within DesignerProvider");
  return ctx;
}
