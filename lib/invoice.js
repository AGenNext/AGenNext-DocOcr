import { parse } from '@llamaindex/liteparse';
import { writeFileSync } from 'fs';

export interface Invoice {
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  vendor?: string;
  total?: string;
  currency?: string;
  items: InvoiceItem[];
  rawText: string;
}

export interface InvoiceItem {
  description: string;
  quantity?: string;
  unitPrice?: string;
  amount?: string;
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
 * Parse an invoice document and extract structured data
 */
export async function parseInvoice(filePath: string): Promise<Invoice> {
  const result = await parse(filePath);
  
  const invoice: Invoice = {
    items: [],
    rawText: result.text
  };
  
  const lines = result.text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Common invoice patterns
  const invoiceNumberPattern = /invoice\s*#?\s*:?\s*([A-Z0-9-]+)/i;
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
  const vendorPattern = /(?:from|vendor|seller|company)\s*:?\s*([^\n]+)/i;
  const totalPattern = /(?:total|amount|sum)\s*:?\s*\$?([\d,]+\.?\d*)/i;
  const currencyPattern = /\$\s*([\d,]+\.?\d*)/;
  
  for (const line of lines) {
    const numMatch = line.match(invoiceNumberPattern);
    if (numMatch && !invoice.invoiceNumber) {
      invoice.invoiceNumber = numMatch[1];
    }
    
    const dateMatch = line.match(datePattern);
    if (dateMatch && !invoice.date) {
      invoice.date = dateMatch[1];
    }
    
    const vendorMatch = line.match(vendorPattern);
    if (vendorMatch && !invoice.vendor) {
      invoice.vendor = vendorMatch[1].trim();
    }
    
    const totalMatch = line.match(totalPattern);
    if (totalMatch && !invoice.total) {
      invoice.total = totalMatch[1];
      const currMatch = line.match(currencyPattern);
      invoice.currency = currMatch ? '$' : 'USD';
    }
  }
  
  // Simple line item detection (lines with prices)
  const itemPattern = /(.+?)\s+([\d,]+(\.\d{2})?)\s*$/;
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (match && !line.match(invoiceNumberPattern) && !line.match(totalPattern)) {
      invoice.items.push({
        description: match[1].trim(),
        amount: match[2]
      });
    }
  }
  
  return invoice;
}

/**
 * Parse invoice and save as JSON
 */
export async function parseInvoiceToJson(
  inputPath: string, 
  outputPath: string
): Promise<void> {
  const invoice = await parseInvoice(inputPath);
  writeFileSync(outputPath, JSON.stringify(invoice, null, 2));
}

/**
 * Parse invoice and extract text only
 */
export async function parseInvoiceToText(
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