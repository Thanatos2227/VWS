
import { describe, it, expect } from 'vitest';
import { 
  calculateTankCapacityLitres, 
  formatTankDetail, 
  validateTankDimensions,
  CUBIC_FEET_TO_LITRES 
} from '../../src/utils/tank';

describe('Tank Volume & Dimension Calculations (DEC-08)', () => {
  it('exposes the standard conversion constant 28.317', () => {
    expect(CUBIC_FEET_TO_LITRES).toBe(28.317);
  });

  it('correctly calculates capacity using standard factor 28.317', () => {
    const dims = { length: 10, breadth: 8, height: 6 };
    const capacity = calculateTankCapacityLitres(dims);
    expect(capacity).toBe(13592);
  });

  it('handles small residential tank measurements accurately', () => {
    const dims = { length: 4, breadth: 3, height: 4 };
    const capacity = calculateTankCapacityLitres(dims);
    expect(capacity).toBe(1359);
  });

  it('returns 0 for zero or negative dimensions', () => {
    expect(calculateTankCapacityLitres({ length: 0, breadth: 5, height: 5 })).toBe(0);
    expect(calculateTankCapacityLitres({ length: 5, breadth: -2, height: 5 })).toBe(0);
    expect(calculateTankCapacityLitres({ length: 5, breadth: 5, height: 0 })).toBe(0);
  });

  it('formats tank details canonically for UI display and Excel export', () => {
    const ohtFormatted = formatTankDetail('OHT', { length: 10, breadth: 8, height: 6 });
    expect(ohtFormatted).toBe('OHT: 10 x 8 x 6 ft (13,592 L)');

    const ugFormatted = formatTankDetail('UG', { length: 12, breadth: 10, height: 8 });
    expect(ugFormatted).toBe('UG: 12 x 10 x 8 ft (27,184 L)');
  });

  it('validates dimensions correctly', () => {
    const valid = validateTankDimensions({ length: 10, breadth: 8, height: 6 });
    expect(valid.isValid).toBe(true);
    expect(valid.errors.length).toBeNull();

    const invalid = validateTankDimensions({ length: -1, breadth: 0, height: 5 });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.length).not.toBeNull();
    expect(invalid.errors.breadth).not.toBeNull();
    expect(invalid.errors.height).toBeNull();
  });
});
