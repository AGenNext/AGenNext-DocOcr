import { parse } from '@llamaindex/liteparse';
import { writeFileSync } from 'fs';

export interface Contract {
  title?: string;
  parties: Party[];
  effectiveDate?: string;
  expirationDate?: string;
  terms: string[];
  signatures: Signature[];
  rawText: string;
}

export interface Party {
  name: string;
  role?: string;
  address?: string;
  contact?: string;
}

export interface Signature {
  signedBy?: string;
  date?: string;
  role?: string;
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

/**
 * Parse a contract document and extract structured data
 */
export async function parseContract(filePath: string): Promise<Contract> {
  const result = await parse(filePath);
  
  const contract: Contract = {
    parties: [],
    terms: [],
    signatures: [],
    rawText: result.text
  };
  
  const lines = result.text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Contract patterns
  const titlePattern = /^(?:agreement|contract|amendment)\s*:?\s*([^\n]+)/i;
  const datePattern = /(?:effective date|date)\s*:?\s*([^\n]+)/i;
  const expiryPattern = /(?:expiration|end date|expires)\s*:?\s*([^\n]+)/i;
  const partyPattern = /(?:party|parties)\s*(?:\s*1)?\s*:?\s*([^\n]+)/i;
  const signPattern = /(?:signature|signed)\s*:?\s*([^\n]+)/i;
  
  for (const line of lines) {
    const titleMatch = line.match(titlePattern);
    if (titleMatch && !contract.title) {
      contract.title = titleMatch[1].trim();
    }
    
    const dateMatch = line.match(datePattern);
    if (dateMatch && !contract.effectiveDate) {
      contract.effectiveDate = dateMatch[1].trim();
    }
    
    const expiryMatch = line.match(expiryPattern);
    if (expiryMatch && !contract.expirationDate) {
      contract.expirationDate = expiryMatch[1].trim();
    }
    
    // Detect parties
    const partyMatch = line.match(partyPattern);
    if (partyMatch) {
      contract.parties.push({
        name: partyMatch[1].trim()
      });
    }
    
    // Detect signatures
    const signMatch = line.match(signPattern);
    if (signMatch && signMatch[1].length > 3) {
      contract.signatures.push({
        signedBy: signMatch[1].trim()
      });
    }
  }
  
  // Extract numbered terms/clauses
  const termPattern = /^(\d+\.?\d*)\s+(.+)$/;
  for (const line of lines) {
    const match = line.match(termPattern);
    if (match) {
      contract.terms.push(`${match[1]} ${match[2]}`);
    }
  }
  
  return contract;
}

/**
 * Parse contract and save as JSON
 */
export async function parseContractToJson(
  inputPath: string, 
  outputPath: string
): Promise<void> {
  const contract = await parseContract(inputPath);
  writeFileSync(outputPath, JSON.stringify(contract, null, 2));
}

/**
 * Parse contract and extract text only
 */
export async function parseContractToText(
  inputPath: string, 
  outputPath?: string
): Promise<string> {
  const result = await parse(inputPath);
  
  if (outputPath) {
    writeFileSync(outputPath, result.text);
  }
  
  return result.text;
}

export { parse } from '@llamaindex/liteparse';
export type { ParseResult, Page, BoundingBox };