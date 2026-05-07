import { parse } from '@llamaindex/liteparse';
import { writeFileSync } from 'fs';

export interface LicensePlate {
  plateNumber: string;
  state?: string;
  country?: string;
  registrationExpiry?: string;
  vehicleInfo?: string;
  rawText: string;
}

/**
 * Parse a license plate / vehicle registration
 */
export async function parseLicensePlate(filePath: string): Promise<LicensePlate> {
  const result = await parse(filePath);
  
  const plate: LicensePlate = {
    plateNumber: '',
    rawText: result.text
  };
  
  const text = result.text;
  
  // License plate patterns (various formats)
  const platePatterns = [
    /([A-Z0-9]{2,8})/,  // Standard plate
    /([A-Z]{1,3})\s*([0-9]{1,4})/,  // ABC 1234 format
    /license\s*:?\s*([A-Z0-9-]+)/i,
    /plate\s*:?\s*([A-Z0-9-]+)/i,
  ];
  
  for (const pattern of platePatterns) {
    const match = text.match(pattern);
    if (match) {
      plate.plateNumber = match[1] || match[0];
      break;
    }
  }
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // State/country
  const statePattern = /(?:state|province.region)\s*:?\s*([A-Za-z]+)/i;
  const expiryPattern = /(?:expires|expiry|valid until)\s*:?\s*([\d\/]+)/i;
  
  for (const line of lines) {
    const stateMatch = line.match(statePattern);
    if (stateMatch && !plate.state) plate.state = stateMatch[1];
    
    const expiryMatch = line.match(expiryPattern);
    if (expiryMatch && !plate.registrationExpiry) plate.registrationExpiry = expiryMatch[1];
  }
  
  return plate;
}

export { parse };