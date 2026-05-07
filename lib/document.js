import { parse, type ParseResult } from '@llamaindex/liteparse';
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname, basename, extname } from 'path';

export interface DocumentMetadata {
  fileName: string;
  fileType: string;
  pageCount?: number;
  parsedAt: string;
}

export interface ParsedDocument {
  text: string;
  markdown?: string;
  metadata: DocumentMetadata;
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

export type OutputFormat = 'text' | 'json' | 'markdown';

/**
 * Parse any document (PDF, DOCX, XLSX, PPTX, images)
 */
export async function parseDocument(
  filePath: string,
  options?: {
    format?: OutputFormat;
    outputPath?: string;
    targetPages?: string;
  }
): Promise<ParsedDocument> {
  const resolvedPath = resolve(filePath);
  const result = await parse(resolvedPath, { targetPages: options?.targetPages });
  
  const metadata: DocumentMetadata = {
    fileName: basename(filePath),
    fileType: extname(filePath).toLowerCase().replace('.', ''),
    parsedAt: new Date().toISOString()
  };
  
  const doc: ParsedDocument = {
    text: result.text,
    markdown: result.markdown,
    metadata
  };
  
  // Add bounding boxes if available
  if (result.pages) {
    metadata.pageCount = result.pages.length;
    doc.boundingBoxes = [];
    
    for (const page of result.pages) {
      if (page.boundingBoxes) {
        doc.boundingBoxes.push(...page.boundingBoxes);
      }
    }
  }
  
  // Write to file if output path specified
  if (options?.outputPath) {
    let content = result.text;
    
    if (options.format === 'json') {
      content = JSON.stringify(doc, null, 2);
    } else if (options.format === 'markdown') {
      content = result.markdown || result.text;
    }
    
    writeFileSync(options.outputPath, content);
  }
  
  return doc;
}

/**
 * Parse document to text
 */
export async function parseToText(
  inputPath: string,
  outputPath?: string
): Promise<string> {
  const doc = await parseDocument(inputPath, {
    format: 'text',
    outputPath
  });
  return doc.text;
}

/**
 * Parse document to JSON
 */
export async function parseToJson(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await parseDocument(inputPath, {
    format: 'json',
    outputPath
  });
}

/**
 * Parse document to Markdown
 */
export async function parseToMarkdown(
  inputPath: string,
  outputPath?: string
): Promise<string> {
  const doc = await parseDocument(inputPath, {
    format: 'markdown',
    outputPath
  });
  return doc.markdown || doc.text;
}

/**
 * Get text within a bounding box region
 */
export function getTextInRegion(
  boxes: BoundingBox[],
  page: number,
  x: number,
  y: number,
  width: number,
  height: number
): string[] {
  return boxes
    .filter(box => {
      if (box.page !== page) return false;
      
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      
      return (
        centerX >= x &&
        centerX <= x + width &&
        centerY >= y &&
        centerY <= y + height
      );
    })
    .map(box => box.text);
}

/**
 * Extract tables from document
 */
export interface Table {
  rows: string[][];
  page: number;
}

export function extractTables(boxes: BoundingBox[], pageNumber?: number): Table[] {
  const pageBoxes = pageNumber !== undefined
    ? boxes.filter(b => b.page === pageNumber)
    : boxes;
  
  const tables: Table[] = [];
  
  // Simple table detection based on spatial layout
  const yTolerance = 10;
  let currentY = -1;
  let currentRow: string[] = [];
  let lastX = 0;
  
  const sortedBoxes = [...pageBoxes].sort((a, b) => {
    if (Math.abs(a.y - b.y) > yTolerance) return a.y - b.y;
    return a.x - b.x;
  });
  
  for (const box of sortedBoxes) {
    if (currentY === -1) {
      currentY = box.y;
    }
    
    if (Math.abs(box.y - currentY) > yTolerance) {
      if (currentRow.length > 0) {
        tables.push({ rows: [currentRow], page: box.page });
        currentRow = [];
      }
      currentY = box.y;
    }
    
    if (box.x > lastX + 50) {
      currentRow.push(box.text);
    } else if (currentRow.length > 0) {
      currentRow[currentRow.length - 1] += ' ' + box.text;
    }
    
    lastX = box.x + box.width;
  }
  
  if (currentRow.length > 0) {
    tables.push({ rows: [currentRow], page: sortedBoxes[0]?.page || 1 });
  }
  
  return tables;
}

export { parse };
export type { ParseResult };