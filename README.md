# AGenNext-DocOcr

Document OCR solution powered by [LiteParse](https://github.com/run-llama/liteparse) - a fast, open-source document parser from LlamaIndex.

## Features

- **Document Parsing**: Parse PDFs, Office files, and images with spatial text extraction
- **Invoice OCR**: Extract structured data from invoices (vendor, items, totals)
- **Contract Parsing**: Parse contracts and agreements (parties, terms, signatures)
- **Identity Verification**: Parse IDs, passports, and driver's licenses
- **Bounding Boxes**: Extract text with precise coordinates
- **Table Extraction**: Detect and extract tables from documents

## Installation

```bash
npm install -g @llamaindex/liteparse

# Or use the library
npm install @agnext/dococr
```

## Usage

### CLI

```bash
# Parse a PDF and print text to stdout
lit parse document.pdf

# Save output to a file
lit parse document.pdf -o output.txt

# Get structured JSON with bounding boxes
lit parse document.pdf --format json -o output.json
```

### Programmatic Usage

```javascript
import { parseDocument, parseInvoice, parseIdentity } from '@agnext/dococr';

// Parse any document
const doc = await parseDocument('invoice.pdf', { format: 'json' });
console.log(doc.text);

// Parse invoice
import { parseInvoice } from '@agnext/dococr';
const invoice = await parseInvoice('invoice.pdf');
console.log(invoice.vendor, invoice.total);

// Parse identity document
import { parseIdentity, verifyIdentity } from '@agnext/dococr';
const id = await parseIdentity('passport.pdf');
const verification = verifyIdentity(id);
console.log(verification.isValid);

// Parse contract
import { parseContract } from '@agnext/dococr';
const contract = await parseContract('agreement.pdf');
console.log(contract.parties);
```

## API

### Document Parsing

| Function | Description |
|----------|------------|
| `parseDocument(path, options)` | Parse any document |
| `parseToText(path, output?)` | Parse to text |
| `parseToJson(path, output)` | Parse to JSON |
| `parseToMarkdown(path, output?)` | Parse to Markdown |
| `extractTables(boxes)` | Extract tables |

### Specialized Parsers

| Function | Description |
|----------|------------|
| `parseInvoice(path)` | Extract invoice data |
| `parseContract(path)` | Extract contract data |
| `parseIdentity(path)` | Extract ID data |
| `verifyIdentity(doc)` | Verify identity fields |

## Requirements

- Node.js 18+
- LiteParse CLI (`lit`)

## License

MIT