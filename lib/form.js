import { parse } from '@llamaindex/liteparse';
import { writeFileSync } from 'fs';

export interface FormField {
  label?: string;
  value: string;
  confidence?: number;
  boundingBox?: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface Form {
  fields: FormField[];
  signature?: string;
  dateSigned?: string;
  rawText: string;
}

/**
 * Parse a form and extract field-value pairs
 */
export async function parseForm(filePath: string): Promise<Form> {
  const result = await parse(filePath);
  
  const form: Form = {
    fields: [],
    rawText: result.text
  };
  
  const lines = result.text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Common field patterns
  const patterns = [
    /^([A-Za-z\s]+)\s*:\s*(.+)$/,                           // Label: Value
    /^([A-Za-z\s]+)\s+[-–—]\s+(.+)$/,                      // Label - Value
    /^([A-Za-z\s]+)\s+(.+)$/,                               // Label Value
  ];
  
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1] && match[2]) {
        const label = match[1].trim();
        const value = match[2].trim();
        
        // Skip if it looks like a header or too short
        if (label.length > 2 && value.length > 0) {
          form.fields.push({ label, value });
        }
        break;
      }
    }
  }
  
  // Check for signature
  const signMatch = result.text.match(/(?:signature|signed)\s*:?\s*(.+?)(?:\n|$)/i);
  if (signMatch) {
    form.signature = signMatch[1].trim();
  }
  
  const dateMatch = result.text.match(/(?:date signed|signed on)\s*:?\s*([\d\/]+)/i);
  if (dateMatch) {
    form.dateSigned = dateMatch[1];
  }
  
  return form;
}

/**
 * Get field by label
 */
export function getField(form: Form, label: string): string | undefined {
  const field = form.fields.find(f => 
    f.label?.toLowerCase().includes(label.toLowerCase())
  );
  return field?.value;
}

/**
 * Parse form to JSON
 */
export async function parseFormToJson(
  inputPath: string, 
  outputPath: string
): Promise<void> {
  const form = await parseForm(inputPath);
  writeFileSync(outputPath, JSON.stringify(form, null, 2));
}

export { parse };