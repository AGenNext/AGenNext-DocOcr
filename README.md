# AGenNext-DocOcr

Document OCR solution powered by [LiteParse](https://github.com/run-llama/liteparse) - a fast, open-source document parser from LlamaIndex.

## Features

- Fast local PDF parsing with spatial text extraction
- Bounding box extraction for text positioning
- OCR support for scanned documents
- CLI and library API

## Installation

```bash
npm install -g @llamaindex/liteparse
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

```typescript
import { parse } from '@llamaindex/liteparse';

const result = await parse('document.pdf');
console.log(result.text);
```

## Requirements

- Node.js 18+
- LiteParse CLI (`lit`)

## License

MIT