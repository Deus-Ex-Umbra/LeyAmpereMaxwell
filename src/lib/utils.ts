import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function combinarClases(..._clases: ClassValue[]): string {
  return twMerge(clsx(_clases));
}
