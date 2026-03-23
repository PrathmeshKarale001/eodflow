import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date for display */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/** Format relative time (e.g., "2 hours ago") */
export function timeAgo(date: Date | string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  const intervals: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

/** Format file size */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Get initials from a name */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Task status display config */
export const STATUS_CONFIG = {
  BACKLOG: { label: "Backlog", color: "gray", bg: "#F1EFE8", text: "#5F5E5A" },
  TODO: { label: "To do", color: "purple", bg: "#EEEDFE", text: "#534AB7" },
  IN_PROGRESS: { label: "In progress", color: "blue", bg: "#E6F1FB", text: "#185FA5" },
  IN_REVIEW: { label: "In review", color: "amber", bg: "#FAEEDA", text: "#854F0B" },
  REVISION: { label: "Revision", color: "coral", bg: "#FAECE7", text: "#993C1D" },
  CLIENT_APPROVAL: { label: "Client approval", color: "pink", bg: "#FBEAF0", text: "#993556" },
  CLIENT_REVISION: { label: "Client revision", color: "red", bg: "#FCEBEB", text: "#A32D2D" },
  APPROVED: { label: "Approved", color: "green", bg: "#EAF3DE", text: "#3B6D11" },
  DONE: { label: "Done", color: "green", bg: "#D4F5E9", text: "#0F6E56" },
} as const;

/** Priority display config */
export const PRIORITY_CONFIG = {
  URGENT: { label: "Urgent", color: "#E24B4A", bg: "#FCEBEB" },
  HIGH: { label: "High", color: "#D85A30", bg: "#FAECE7" },
  MEDIUM: { label: "Medium", color: "#BA7517", bg: "#FAEEDA" },
  LOW: { label: "Low", color: "#888780", bg: "#F1EFE8" },
} as const;
