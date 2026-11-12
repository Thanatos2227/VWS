
import { TankType } from '../types/database';

export const CUBIC_FEET_TO_LITRES = 28.317;

export interface TankDimensions {
  length: number;
  breadth: number;
  height: number;
}

export function calculateTankCapacityLitres(dimensions: TankDimensions): number {
  const { length, breadth, height } = dimensions;
  
  if (length <= 0 || breadth <= 0 || height <= 0) {
    return 0;
  }
  
  const cubicFeet = length * breadth * height;
  const litres = cubicFeet * CUBIC_FEET_TO_LITRES;
  
  return Math.round(litres);
}

export function formatTankDetail(tankType: TankType, dimensions: TankDimensions): string {
  const litres = calculateTankCapacityLitres(dimensions);
  const formattedLitres = new Intl.NumberFormat('en-IN').format(litres);
  return `${tankType}: ${dimensions.length} x ${dimensions.breadth} x ${dimensions.height} ft (${formattedLitres} L)`;
}

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

