import { parse } from '@llamaindex/liteparse';
import { writeFileSync } from 'fs';

export interface IdentityDocument {
  documentType?: string;
  issuingCountry?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  dateOfBirth?: string;
  nationality?: string;
  gender?: string;
  expiryDate?: string;
  documentNumber?: string;
  MRZ?: string;
  address?: Address;
  rawText: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ParseResult {
  text: string;
  markdown?: string;
  pages: Page[];
}

export interface Page {
  index: number;
  text: string;
  boundingBoxes?: BoundingBox[];
}

export interface BoundingBox {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

type DocumentType = 'passport' | 'drivers_license' | 'national_id' | 'identity_card' | 'other';

/**
 * Parse an identity document (passport, ID card, driver's license)
 */
export async function parseIdentity(filePath: string): Promise<IdentityDocument> {
  const result = await parse(filePath);
  
  const doc: IdentityDocument = {
    rawText: result.text
  };
  
  const text = result.text;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Detect document type
  doc.documentType = detectDocumentType(text);
  
  // Extract MRZ (Machine Readable Zone) for passports/IDs
  const mrzMatch = text.match(/([A-Z<]{30,})/);
  if (mrzMatch) {
    doc.MRZ = mrzMatch[1].replace(/\s+/g, '');
  }
  
  // Common patterns
  const patterns = {
    documentNumber: /(?:doc|no|number|id)\s*:?\s*([A-Z0-9]{6,15})/i,
    lastName: /(?:surname|last name|family name)\s*:?\s*([A-Za-z]+)/i,
    firstName: /(?:given name|first name|forename)\s*:?\s*([A-Za-z]+)/i,
    dateOfBirth: /(?:dob|date of birth|birth date|d\.?o\.?b\.?)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    expiryDate: /(?:expiry|expires|valid until|expiration)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    nationality: /(?:nationality|citizenship)\s*:?\s*([A-Za-z]+)/i,
    gender: /(?:sex|gender)\s*:?\s*(M|F|Male|Female)/i,
    country: /(?:country|issuing country)\s*:?\s*([A-Za-z]+)/i,
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        const value = (doc as any)[key];
        if (!value) {
          (doc as any)[key] = match[1];
        }
      }
    }
  }
  
  // Parse MRZ if available
  if (doc.MRZ) {
    parseMRZ(doc);
  }
  
  return doc;
}

/**
 * Detect the type of identity document
 */
function detectDocumentType(text: string): DocumentType {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('passport')) return 'passport';
  if (lowerText.includes('driver') || lowerText.includes('license')) return 'drivers_license';
  if (lowerText.includes('national id') || lowerText.includes('identity card')) return 'national_id';
  if (lowerText.includes('id')) return 'identity_card';
  
  return 'other';
}

/**
 * Parse MRZ (Machine Readable Zone) data
 */
function parseMRZ(doc: IdentityDocument): void {
  const mrz = doc.MRZ;
  if (!mrz) return;
  
  // TD1 format (ID cards): 3 lines of 30 characters
  // TD2 format (passports): 2 lines of 30 characters
  // MRP format (passports): 2 lines of 44 characters
  
  if (mrz.length === 90) { // TD1
    // Line 1: document type + country + document number + checksum
    // Line 2: surname + given names + nationality + DOB + sex + expiry + personal number
    // Line 3: personal number checksum
    
    const line2 = mrz.substring(30, 60);
    const fields = line2.split('<');
    
    if (fields.length >= 2) {
      if (!doc.lastName) doc.lastName = fields[0].replace(/</g, ' ').trim();
      if (!doc.firstName && fields[1]) {
        doc.firstName = fields[1].replace(/</g, ' ').trim();
      }
    }
  } else if (mrz.length >= 88) { // TD2 or MRP
    const line2 = mrz.substring(30, 60);
    
    // Extract names from MRZ
    const nameStart = line2.indexOf('<<');
    if (nameStart > 0) {
      if (!doc.lastName) {
        doc.lastName = line2.substring(0, nameStart).replace(/</g, ' ').trim();
      }
      if (!doc.firstName) {
        const names = line2.substring(nameStart + 2).replace(/</g, ' ').trim();
        doc.firstName = names.split(' ')[0];
      }
    }
  }
}

/**
 * Parse identity document and save as JSON
 */
export async function parseIdentityToJson(
  inputPath: string, 
  outputPath: string
): Promise<void> {
  const doc = await parseIdentity(inputPath);
  writeFileSync(outputPath, JSON.stringify(doc, null, 2));
}

/**
 * Parse identity document and extract text only
 */
export async function parseIdentityToText(
  inputPath: string, 
  outputPath?: string
): Promise<string> {
  const result = await parse(inputPath);
  
  if (outputPath) {
    writeFileSync(outputPath, result.text);
  }
  
  return result.text;
}

/**
 * Verify if document has required fields for identity
 */
export interface VerificationResult {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}

export function verifyIdentity(doc: IdentityDocument): VerificationResult {
  const result: VerificationResult = {
    isValid: false,
    missingFields: [],
    warnings: []
  };
  
  const required = ['firstName', 'lastName', 'documentNumber'];
  
  for (const field of required) {
    if (!(doc as any)[field]) {
      result.missingFields.push(field);
    }
  }
  
  // Check if expired
  if (doc.expiryDate) {
    const expiry = new Date(doc.expiryDate);
    if (expiry < new Date()) {
      result.warnings.push('Document has expired');
    }
  }
  
  result.isValid = result.missingFields.length === 0 && result.warnings.length === 0;
  
  return result;
}

export { parse };
export type { ParseResult, Page, BoundingBox };