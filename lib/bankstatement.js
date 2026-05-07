import { parse } from '@llamaindex/liteparse';
import { writeFileSync } from 'fs';

export interface Transaction {
  date: string;
  description: string;
  amount: string;
  type: 'credit' | 'debit';
  balance?: string;
}

export interface BankStatement {
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
  statementDate?: string;
  periodStart?: string;
  periodEnd?: string;
  openingBalance?: string;
  closingBalance?: string;
  totalCredits?: string;
  totalDebits?: string;
  transactions: Transaction[];
  rawText: string;
}

/**
 * Parse a bank statement
 */
export async function parseBankStatement(filePath: string): Promise<BankStatement> {
  const result = await parse(filePath);
  
  const statement: BankStatement = {
    transactions: [],
    rawText: result.text
  };
  
  const lines = result.text.split('\n').map(l => l.trim()).filter(l => l);
  
  const patterns = {
    accountHolder: /(?:account holder|name)\s*:?\s*([A-Za-z\s]+)/i,
    accountNumber: /(?:account\s*#?|acct)\s*:?\s*([*X\d]+)/i,
    bankName: /(?:bank|financial institution)\s*:?\s*([A-Za-z\s]+)/i,
    statementDate: /(?:statement date)\s*:?\s*([\d\/]+)/i,
    openingBalance: /(?:opening|beginning)\s*balance\s*:?\s*\$?([\d,]+\.?\d*)/i,
    closingBalance: /(?:closing|ending)\s*balance\s*:?\s*\$?([\d,]+\.?\d*)/i,
    totalCredits: /(?:total\s*credits|deposits)\s*:?\s*\$?([\d,]+\.?\d*)/i,
    totalDebits: /(?:total\s*debits|withdrawals)\s*:?\s*\$?([\d,]+\.?\d*)/i,
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match && !(statement as any)[key]) {
        (statement as any)[key] = match[1];
      }
    }
  }
  
  // Parse transactions: Date Description Amount
  const txPattern = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(-?\$?[\d,]+\.?\d*)$/;
  for (const line of lines) {
    const match = line.match(txPattern);
    if (match) {
      const amount = match[3].replace('$', '').replace(',', '');
      const isDebit = amount.startsWith('-') || parseFloat(amount) < 0;
      
      statement.transactions.push({
        date: match[1],
        description: match[2].trim(),
        amount: amount.replace('-', ''),
        type: isDebit ? 'debit' : 'credit'
      });
    }
  }
  
  return statement;
}

/**
 * Get transactions by type
 */
export function getTransactionsByType(
  statement: BankStatement, 
  type: 'credit' | 'debit'
): Transaction[] {
  return statement.transactions.filter(t => t.type === type);
}

/**
 * Calculate total amount
 */
export function calculateTotal(statement: BankStatement, type?: 'credit' | 'debit'): number {
  const transactions = type ? getTransactionsByType(statement, type) : statement.transactions;
  return transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
}

/**
 * Parse bank statement to JSON
 */
export async function parseBankStatementToJson(
  inputPath: string, 
  outputPath: string
): Promise<void> {
  const statement = await parseBankStatement(inputPath);
  writeFileSync(outputPath, JSON.stringify(statement, null, 2));
}

export { parse };