import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Indian-style grouping: ₹12,34,567.89 */
export function formatInr(amount: number) {
  const [intPart, frac] = Math.abs(amount).toFixed(2).split(".");
  const lastThree = intPart.slice(-3);
  const other = intPart.slice(0, -3);
  const withCommas = other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + (other ? "," : "") + lastThree;
  const sign = amount < 0 ? "-" : "";
  /* return `₹${sign}${withCommas}.${frac}`; */
  return `${sign}${withCommas}.${frac}`;
}
