/**
 * src/utils/tank.ts
 * 
 * Tank volume calculation and dimension formatting for Vetri Water Solutions.
 * Implements DEC-08 (Feet & Litres) and DEC-25 (Strict OHT / UG Selection).
 */

import { TankType } from '../types/database';

/**
 * Standard conversion factor: 1 cubic foot = 28.316846592 Litres (rounded to 28.317).
 * Defined in VWS_BUSINESS_RULES.md (DOC-003 Section 5).
 */
export const CUBIC_FEET_TO_LITRES = 28.317;

export interface TankDimensions {
  length: number;  // feet
  breadth: number; // feet
  height: number;  // feet
}

/**
 * Computes tank capacity in Litres from length, breadth, and height in feet.
 * Formula: Volume (L) = round(L * B * H * 28.317)
 */
export function calculateTankCapacityLitres(dimensions: TankDimensions): number {
  const { length, breadth, height } = dimensions;
  
  if (length <= 0 || breadth <= 0 || height <= 0) {
    return 0;
  }
  
  const cubicFeet = length * breadth * height;
  const litres = cubicFeet * CUBIC_FEET_TO_LITRES;
  
  return Math.round(litres);
}

/**
 * Formats a tank detail into the canonical summary string for display and Excel export:
 * e.g. "OHT: 10 x 8 x 6 ft (13,592 L)"
 */
export function formatTankDetail(tankType: TankType, dimensions: TankDimensions): string {
  const litres = calculateTankCapacityLitres(dimensions);
  const formattedLitres = new Intl.NumberFormat('en-IN').format(litres);
  return `${tankType}: ${dimensions.length} x ${dimensions.breadth} x ${dimensions.height} ft (${formattedLitres} L)`;
}

/**
 * Validates tank dimensions. Dimensions must be positive finite numbers.
 */
export function validateTankDimensions(dimensions: TankDimensions): {
  isValid: boolean;
  errors: Record<keyof TankDimensions, string | null>;
} {
  const errors: Record<keyof TankDimensions, string | null> = {
    length: null,
    breadth: null,
    height: null,
  };

  if (!Number.isFinite(dimensions.length) || dimensions.length <= 0) {
    errors.length = 'Length must be a positive number of feet.';
  }
  if (!Number.isFinite(dimensions.breadth) || dimensions.breadth <= 0) {
    errors.breadth = 'Breadth must be a positive number of feet.';
  }
  if (!Number.isFinite(dimensions.height) || dimensions.height <= 0) {
    errors.height = 'Height must be a positive number of feet.';
  }

  const isValid = !errors.length && !errors.breadth && !errors.height;
  return { isValid, errors };
}

