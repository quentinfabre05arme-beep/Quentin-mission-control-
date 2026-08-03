// OCR Pipeline - Document text extraction via OOMOL
// Uses ocr_web_service and fuxin connectors

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class OCRPipeline {
  constructor() {
    this.outputDir = 'C:\\Users\\quent\\.openclaw\\workspace\\ocr_output';
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // Process a document from URL
  async processFromURL(url, options = {}) {
    console.log(`🔍 OCR processing: ${url}`);
    
    try {
      // Use OOMOL's OCR Web Service
      const cmd = `oo connector run ocr_web_service.process_document_from_url --url "${url}" --format text`;
      const output = execSync(cmd, { encoding: 'utf8', timeout: 60000 });
      
      const result = JSON.parse(output);
      
      // Save extracted text
      const outputFile = path.join(this.outputDir, `ocr_${Date.now()}.txt`);
      fs.writeFileSync(outputFile, result.text || '');
      
      console.log(`✅ OCR complete: ${outputFile}`);
      
      return {
        success: true,
        text: result.text,
        confidence: result.confidence,
        outputFile
      };
    } catch (e) {
      console.error('OCR failed:', e.message);
      return { success: false, error: e.message };
    }
  }

  // Process local PDF/image
  async processLocalFile(filePath, options = {}) {
    console.log(`🔍 OCR processing local file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }

    try {
      // For local files, use fuxin OCR
      const cmd = `oo connector run fuxin.ocr_document --file "${filePath}"`;
      const output = execSync(cmd, { encoding: 'utf8', timeout: 60000 });
      
      const result = JSON.parse(output);
      
      // Save extracted text
      const outputFile = path.join(this.outputDir, `ocr_${path.basename(filePath)}_${Date.now()}.txt`);
      fs.writeFileSync(outputFile, result.text || '');
      
      console.log(`✅ OCR complete: ${outputFile}`);
      
      return {
        success: true,
        text: result.text,
        pages: result.pages,
        outputFile
      };
    } catch (e) {
      console.error('OCR failed:', e.message);
      return { success: false, error: e.message };
    }
  }

  // Batch process multiple files
  async batchProcess(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      const result = await this.processLocalFile(filePath);
      results.push({ file: filePath, ...result });
    }
    
    return {
      total: filePaths.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // Extract text and create index
  async extractAndIndex(directory) {
    console.log(`📁 Indexing documents in: ${directory}`);
    
    const files = fs.readdirSync(directory)
      .filter(f => /\.(pdf|png|jpg|jpeg|tiff)$/i.test(f))
      .map(f => path.join(directory, f));
    
    const results = await this.batchProcess(files);
    
    // Create index
    const index = {
      created: new Date().toISOString(),
      directory,
      totalFiles: results.total,
      extracted: results.successful,
      documents: results.results.map(r => ({
        file: path.basename(r.file),
        outputFile: r.outputFile,
        success: r.success,
        textLength: r.text?.length || 0
      }))
    };
    
    const indexPath = path.join(this.outputDir, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    
    console.log(`✅ Indexed ${results.successful}/${results.total} documents`);
    
    return index;
  }
}

if (require.main === module) {
  const pipeline = new OCRPipeline();
  
  // Example: process a file
  // pipeline.processLocalFile('path/to/document.pdf').then(console.log);
  
  // Example: index directory
  // pipeline.extractAndIndex('path/to/documents').then(console.log);
}

module.exports = OCRPipeline;
