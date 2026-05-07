import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import { 
  parseInvoice, 
  parseContract, 
  parseIdentity, 
  parseReceipt,
  parseMedicalRecord,
  parseForm,
  parseBankStatement,
  parseBusinessCard,
  parseLicensePlate,
  parseDocument
} from '@llamaindex/liteparse';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// Document type detection
function detectDocumentType(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes('invoice') || lower.includes('bill to') || lower.includes('total:')) {
    return 'invoice';
  }
  if (lower.includes('agreement') || lower.includes('contract') || lower.includes('parties')) {
    return 'contract';
  }
  if (lower.includes('passport') || lower.includes('driver license') || lower.includes('id card')) {
    return 'identity';
  }
  if (lower.includes('receipt') || lower.includes('thank you')) {
    return 'receipt';
  }
  if (lower.includes('patient') || lower.includes('prescription') || lower.includes('diagnosis')) {
    return 'medical';
  }
  if (lower.includes('bank') || lower.includes('account') || lower.includes('transaction')) {
    return 'bankstatement';
  }
  if (lower.includes('license') || lower.includes('plate') || lower.includes('vehicle')) {
    return 'license';
  }
  
  return 'document';
}

// Parse endpoint
app.post('/api/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const docType = req.body.type || 'auto';
    let result;
    
    // Parse the document
    const parsed = await parseDocument(filePath);
    
    // Auto-detect or use specified type
    const type = docType === 'auto' ? detectDocumentType(parsed.text) : docType;
    
    switch (type) {
      case 'invoice':
        result = await parseInvoice(filePath);
        break;
      case 'contract':
        result = await parseContract(filePath);
        break;
      case 'identity':
        result = await parseIdentity(filePath);
        break;
      case 'receipt':
        result = await parseReceipt(filePath);
        break;
      case 'medical':
        result = await parseMedicalRecord(filePath);
        break;
      case 'bankstatement':
        result = await parseBankStatement(filePath);
        break;
      case 'license':
        result = await parseLicensePlate(filePath);
        break;
      default:
        result = parsed;
    }
    
    // Clean up uploaded file
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    
    res.json({
      success: true,
      type,
      data: result,
      rawText: parsed.text
    });
    
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ 
      error: 'Failed to parse document',
      message: error.message 
    });
  }
});

// Parse multiple files
app.post('/api/batch', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = await Promise.all(
      req.files.map(async (file) => {
        const parsed = await parseDocument(file.path);
        const type = detectDocumentType(parsed.text);
        
        let data;
        switch (type) {
          case 'invoice': data = await parseInvoice(file.path); break;
          case 'contract': data = await parseContract(file.path); break;
          case 'identity': data = await parseIdentity(file.path); break;
          case 'receipt': data = await parseReceipt(file.path); break;
          case 'medical': data = await parseMedicalRecord(file.path); break;
          case 'bankstatement': data = await parseBankStatement(file.path); break;
          default: data = parsed;
        }
        
        // Clean up
        if (existsSync(file.path)) unlinkSync(file.path);
        
        return { type, data };
      })
    );

    res.json({ success: true, results });
    
  } catch (error) {
    console.error('Batch parse error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 DocOCR API running on http://localhost:${PORT}`);
});