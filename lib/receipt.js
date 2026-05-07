import { parse } from '@llamaindex/liteparse';
import { writeFileSync } from 'fs';

export interface Receipt {
  vendor?: string;
  date?: string;
  total?: string;
  tax?: string;
  items: ReceiptItem[];
  paymentMethod?: string;
  rawText: string;
}

export interface ReceiptItem {
  name: string;
  quantity?: string;
  price?: string;
}

export interface ParseResult {
  text: string;
  markdown?: string;
  pages: any[];
}

/**
 * Parse a receipt and extract structured data
 */
export async function parseReceipt(filePath: string): Promise<Receipt> {
  const result = await parse(filePath);
  
  const receipt: Receipt = {
    items: [],
    rawText: result.text
  };
  
  const lines = result.text.split('\n').map(l => l.trim()).filter(l => l);
  
  const vendorPattern = /^([A-Za-z\s&]+)$/;
  const totalPattern = /(?:total|amount|sum|subtotal|grand total)\s*:?\s*\$?([\d,]+\.?\d*)/i;
  const taxPattern = /(?:tax|gst|vat)\s*:?\s*\$?([\d,]+\.?\d*)/i;
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
  const qtyPattern = /^(\d+)\s+(.+?)\s+\$?([\d,]+\.?\d*)$/;
  
  for (const line of lines) {
    const totalMatch = line.match(totalPattern);
    if (totalMatch && !receipt.total) {
      receipt.total = totalMatch[1];
    }
    
    const taxMatch = line.match(taxPattern);
    if (taxMatch && !receipt.tax) {
      receipt.tax = taxMatch[1];
    }
    
    const dateMatch = line.match(datePattern);
    if (dateMatch && !receipt.date) {
      receipt.date = dateMatch[1];
    }
    
    const qtyMatch = line.match(qtyPattern);
    if (qtyMatch) {
      receipt.items.push({
        quantity: qtyMatch[1],
        name: qtyMatch[2],
        price: qtyMatch[3]
      });
    }
  }
  
  // Vendor is usually first non-empty line
  if (lines.length > 0) {
    receipt.vendor = lines[0];
  }
  
  return receipt;
}

export { parse };