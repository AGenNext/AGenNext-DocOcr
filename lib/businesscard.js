import { parse } from '@llamaindex/liteparse';
import { writeFileSync } from 'fs';

export interface BusinessCard {
  name?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  website?: string;
  address?: string;
  rawText: string;
}

/**
 * Parse a business card
 */
export async function parseBusinessCard(filePath: string): Promise<BusinessCard> {
  const result = await parse(filePath);
  
  const card: BusinessCard = {
    rawText: result.text
  };
  
  const text = result.text;
  
  // Email
  const emailMatch = text.match(/([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) card.email = emailMatch[1];
  
  // Website  
  const webMatch = text.match(/(?:www\.|http)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  if (webMatch) card.website = webMatch[0].replace('http://', '').replace('https://', '');
  
  // Phone patterns
  const phonePatterns = {
    phone: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    mobile: /mobile[:\s]+(.+)/i,
    fax: /fax[:\s]+(.+)/i,
  };
  
  for (const [key, pattern] of Object.entries(phonePatterns)) {
    const match = text.match(pattern);
    if (match) {
      const value = key === 'mobile' || key === 'fax' ? match[1].trim() : match[0];
      if (!card.phone && key === 'phone') card.phone = value;
      else (card as any)[key] = value.trim();
    }
  }
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Name is usually first or second line
  const namePattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+$/;
  for (const line of lines) {
    if (!card.name && namePattern.test(line)) {
      card.name = line;
      break;
    }
  }
  
  // Title usually follows name
  const titles = ['CEO', 'CTO', 'CFO', 'Director', 'Manager', 'Engineer', 'Developer', 'Consultant', 'President', 'VP', 'Founder', 'Owner'];
  for (const line of lines) {
    if (!card.title && titles.some(t => line.includes(t))) {
      card.title = line;
      break;
    }
  }
  
  // Company usually has Inc, LLC, Corp, Ltd
  const companyPattern = /(.+?(?:Inc|LLC|Corp|Ltd|Company|Co\.))/;
  for (const line of lines) {
    if (!card.company && companyPattern.test(line)) {
      const match = line.match(companyPattern);
      if (match) card.company = match[1];
      break;
    }
  }
  
  // Address check
  const addressMatch = text.match(/[\d\s]+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)[,\s]+[A-Za-z]+,?\s*[A-Z]{2}\s*\d{5}/);
  if (addressMatch) card.address = addressMatch[0];
  
  return card;
}

/**
 * Parse business card to JSON
 */
export async function parseBusinessCardToJson(
  inputPath: string, 
  outputPath: string
): Promise<void> {
  const card = await parseBusinessCard(inputPath);
  writeFileSync(outputPath, JSON.stringify(card, null, 2));
}

export { parse };