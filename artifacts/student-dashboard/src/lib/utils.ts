import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "No date";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(date);
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case "high":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "medium":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "low":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
}
