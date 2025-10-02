import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format seconds to mm:ss format, rounding down to integer seconds
 * @param seconds - Time in seconds (can be decimal)
 * @returns Formatted time string like "2:05"
 */
export function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Processing helpers
export interface MeetingLikeData {
  status?: string;
  summary?: string | null;
  transcript?: unknown;
}

export function isMeetingProcessing(data: MeetingLikeData | undefined | null): boolean {
  if (!data) return false;
  return data.status === 'processing';
}

export function hasSummary(data: MeetingLikeData | undefined | null): boolean {
  if (!data) return false;
  const value = data.summary;
  return typeof value === 'string' && value.trim().length > 0;
}
