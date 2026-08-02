/**
 * PROJECT CLAW CORE — PDF Reader Agent
 * Extract text from PDFs using pdftotext or pdf-parse fallback.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'pdf_reader_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

async function extractText(filePath) {
  log(`Extracting text from: ${filePath}`);
  
  // Try pdftotext first (fastest)
  try {
    const output = execSync(`pdftotext "${filePath}" -`, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000
    });
    return { success: true, text: output.trim().slice(0, 5000), method: 'pdftotext' };
  } catch(e) {
    log('pdftotext failed: ' + e.message);
  }
  
  // Fallback: try pdf-parse
  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return { success: true, text: data.text.trim().slice(0, 5000), method: 'pdf-parse' };
  } catch(e) {
    log('pdf-parse failed: ' + e.message);
  }
  
  return { success: false, error: 'No PDF extraction method available' };
}

class PdfReaderAgent {
  async read(filePath) {
    return await extractText(filePath);
  }
  
  async summarize(filePath) {
    const result = await extractText(filePath);
    if (!result.success) return result;
    const sentences = result.text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return {
      success: true,
      summary: sentences.slice(0, 5).join('. ') + '.',
      full_length: result.text.length,
      method: result.method
    };
  }
}

module.exports = { PdfReaderAgent, extractText };

if (require.main === module) {
  (async () => {
    const file = process.argv[2];
    if (!file) {
      console.log('Usage: node pdf_reader_agent.js <pdf-file>');
      return;
    }
    const agent = new PdfReaderAgent();
    const result = await agent.summarize(file);
    console.log(JSON.stringify(result, null, 2));
  })();
}
