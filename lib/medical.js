import { parse } from '@llamaindex/liteparse';
import { writeFileSync } from 'fs';

export interface MedicalRecord {
  patientName?: string;
  patientId?: string;
  dateOfBirth?: string;
  doctor?: string;
  visitDate?: string;
  diagnosis?: string[];
  symptoms?: string[];
  prescriptions: Prescription[];
  labResults: LabResult[];
  vitalSigns: VitalSigns;
  notes?: string;
  rawText: string;
}

export interface Prescription {
  medication: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  refills?: number;
}

export interface LabResult {
  test: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  status?: 'normal' | 'abnormal' | 'critical';
}

export interface VitalSigns {
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  weight?: string;
  height?: string;
  bmi?: string;
}

/**
 * Parse a medical record/document
 */
export async function parseMedicalRecord(filePath: string): Promise<MedicalRecord> {
  const result = await parse(filePath);
  
  const record: MedicalRecord = {
    prescriptions: [],
    labResults: [],
    vitalSigns: {},
    rawText: result.text
  };
  
  const lines = result.text.split('\n').map(l => l.trim()).filter(l => l);
  
  const patterns = {
    patientName: /(?:patient|name)\s*:?\s*([A-Za-z\s]+)/i,
    patientId: /(?:patient\s*#?|id)\s*:?\s*([A-Z0-9-]+)/i,
    dob: /(?:dob|date of birth)\s*:?\s*([\d\/]+)/i,
    doctor: /(?:doctor|physician|provider)\s*:?\s*([A-Za-z\s]+)/i,
    visitDate: /(?:visit|date|exam date)\s*:?\s*([\d\/]+)/i,
    bloodPressure: /bp\s*:?\s*(\d+\/\d+)/i,
    heartRate: /(?:hr|heart rate|pulse)\s*:?\s*(\d+)/i,
    temperature: /(?:temp|temperature)\s*:?\s*(\d+\.?\d*)\s*(?:°|degrees?)?/i,
    weight: /(?:weight|wt)\s*:?\s*(\d+\.?\d*)\s*(?:lbs|kg)?/i,
    height: /(?:height|ht)\s*:?\s*(\d+['\"]|\d+\.\d+)/i,
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        if (key in record) {
          (record as any)[key] = match[1];
        } else if (key in record.vitalSigns) {
          record.vitalSigns[key as keyof VitalSigns] = match[1];
        }
      }
    }
  }
  
  // Extract prescription patterns
  const rxPattern = /(.+?)\s+(\d+\s*mg|[\d\.]+\s*ml)\s+(.+)/i;
  for (const line of lines) {
    const match = line.match(rxPattern);
    if (match) {
      record.prescriptions.push({
        medication: match[1].trim(),
        dosage: match[2],
        frequency: match[3]
      });
    }
  }
  
  // Extract lab results
  const labPattern = /(.+?)\s+([\d\.]+)\s+([\w\/%]+)\s+(.+)/i;
  for (const line of lines) {
    const match = line.match(labPattern);
    if (match) {
      record.labResults.push({
        test: match[1].trim(),
        value: match[2],
        unit: match[3],
        referenceRange: match[4]
      });
    }
  }
  
  return record;
}

/**
 * Parse medical record to JSON
 */
export async function parseMedicalRecordToJson(
  inputPath: string, 
  outputPath: string
): Promise<void> {
  const record = await parseMedicalRecord(inputPath);
  writeFileSync(outputPath, JSON.stringify(record, null, 2));
}

export { parse };