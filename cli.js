#!/usr/bin/env node

import { parse } from '@llamaindex/liteparse';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

interface ParseOptions {
  input: string;
  output?: string;
  format?: 'text' | 'json' | 'markdown';
  targetPages?: string;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
AGenNext DocOCR - Document OCR powered by LiteParse

Usage:
  dococr parse <file> [options]
  dococr batch <directory> [options]

Options:
  -o, --output <file>    Output file path
  -f, --format         Output format (text|json|markdown)
  -p, --target-pages   Pages to parse (e.g., "1-5,10")

Examples:
  dococr parse document.pdf
  dococr parse document.pdf -o result.txt
  dococr parse document.pdf --format json -o result.json
`);
    return;
  }

  const command = args[0];
  
  if (command === 'parse') {
    const inputFile = args[1];
    if (!inputFile) {
      console.error('Error: Input file is required');
      process.exit(1);
    }
    
    const options: ParseOptions = { input: inputFile };
    
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '-o' || args[i] === '--output') {
        options.output = args[++i];
      } else if (args[i] === '-f' || args[i] === '--format') {
        options.format = args[++i] as 'text' | 'json' | 'markdown';
      } else if (args[i] === '-p' || args[i] === '--target-pages') {
        options.targetPages = args[++i];
      }
    }
    
    try {
      console.log(\`Parsing: \${inputFile}\`);
      const result = await parse(resolve(inputFile));
      
      if (options.output) {
        const format = options.format || 'text';
        let content = result.text;
        
        if (format === 'json') {
          content = JSON.stringify(result, null, 2);
        } else if (format === 'markdown') {
          content = result.markdown || result.text;
        }
        
        writeFileSync(options.output, content);
        console.log(\`Output saved to: \${options.output}\`);
      } else {
        console.log(result.text);
      }
      
      console.log('Parsing complete!');
    } catch (error) {
      console.error('Error parsing document:', error);
      process.exit(1);
    }
  } else {
    console.error(\`Unknown command: \${command}\`);
    process.exit(1);
  }
}

main();