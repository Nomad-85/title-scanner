// VIN validation based on ISO 3779 standard
export function validateVIN(vin: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic format check
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    errors.push('VIN must be exactly 17 characters long and contain only valid characters (A-H, J-N, P, R-Z, 0-9)');
    return { isValid: false, errors };
  }

  // Check for illegal characters (I, O, Q)
  if (/[IOQ]/.test(vin)) {
    errors.push('VIN cannot contain I, O, or Q');
  }

  // Validate check digit (9th position)
  const weights = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
  const transliterationTable: { [key: string]: number } = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
    'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '0': 0
  };

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += transliterationTable[vin[i]] * weights[i];
  }
  
  const checkDigit = sum % 11;
  const expectedCheckDigit = vin[8] === 'X' ? 10 : parseInt(vin[8]);
  
  if (checkDigit !== expectedCheckDigit) {
    errors.push('Invalid check digit');
  }

  return { isValid: errors.length === 0, errors };
} 