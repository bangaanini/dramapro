import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const UNOPTIMIZED_IMAGE_HOSTS = new Set(["awscover.netshort.com"]);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shouldBypassImageOptimization(imageUrl: string) {
  try {
    return UNOPTIMIZED_IMAGE_HOSTS.has(new URL(imageUrl).hostname);
  } catch {
    return false;
  }
}
