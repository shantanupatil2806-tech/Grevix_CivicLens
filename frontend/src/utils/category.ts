// frontend/src/utils/category.ts
import type { Category } from '../types';

/**
 * Exact color palette requested for category icons and styling:
 * - Roads / Potholes: Orange (#F97316)
 * - Garbage / Waste: Green (#22C55E)
 * - Water Supply / Leakage: Blue (#0EA5E9)
 * - Streetlights / Electricity: Yellow (#EAB308)
 * - Other: Purple (#8B5CF6)
 */
export const CATEGORY_COLORS: Record<Category, string> = {
  Roads: '#F97316',
  Garbage: '#22C55E',
  Water: '#0EA5E9',
  Electricity: '#EAB308',
  Other: '#8B5CF6',
};

/**
 * Tailwind badge styling classes aligned with the exact category color palette
 */
export const CATEGORY_BADGE_CLASSES: Record<Category, string> = {
  Roads: 'bg-orange-50 text-orange-700 border-orange-200',
  Garbage: 'bg-green-50 text-green-700 border-green-200',
  Water: 'bg-sky-50 text-sky-700 border-sky-200',
  Electricity: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Other: 'bg-purple-50 text-purple-700 border-purple-200',
};

/**
 * Normalizes any category string (from backend or frontend) into a canonical Category.
 * Handles both short names ("Roads") and backend/legacy verbose names ("Roads/Potholes", "Garbage/Waste", etc.)
 */
export function normalizeCategory(cat?: string | null): Category {
  if (!cat) return 'Other';
  const trimmed = cat.trim();

  // Roads / Potholes
  if (
    trimmed === 'Roads' ||
    trimmed === 'Roads/Potholes' ||
    /^roads?/i.test(trimmed) ||
    /pothole/i.test(trimmed)
  ) {
    return 'Roads';
  }

  // Garbage / Waste
  if (
    trimmed === 'Garbage' ||
    trimmed === 'Garbage/Waste' ||
    /^garbage/i.test(trimmed) ||
    /waste/i.test(trimmed) ||
    /trash/i.test(trimmed)
  ) {
    return 'Garbage';
  }

  // Water Supply / Leakage
  if (
    trimmed === 'Water' ||
    trimmed === 'Water Supply/Leakage' ||
    trimmed === 'Drainage' ||
    /^water/i.test(trimmed) ||
    /leakage/i.test(trimmed) ||
    /drainage/i.test(trimmed)
  ) {
    return 'Water';
  }

  // Streetlights / Electricity
  if (
    trimmed === 'Electricity' ||
    trimmed === 'Streetlights/Electricity' ||
    /^electricity/i.test(trimmed) ||
    /streetlight/i.test(trimmed) ||
    /power/i.test(trimmed)
  ) {
    return 'Electricity';
  }

  return 'Other';
}

/**
 * Helper to get exact hex color code for any category input
 */
export function getCategoryColor(cat?: string | null): string {
  const norm = normalizeCategory(cat);
  return CATEGORY_COLORS[norm] || CATEGORY_COLORS.Other;
}
