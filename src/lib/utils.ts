/**
 * clsxとtailwind-mergeを使用したクラス名結合ユーティリティ
 */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}