// pdf_reader.js - Universal PDF text extractor
const fs = require('fs');
const path = require('path');

/**
 * Extract text from PDF using multiple methods
 * Usage: node pdf_reader.js <pdf_path>
 */

async function extractPDFText(pdfPath) {
    const absolutePath = path.resolve(pdfPath);
    
    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ File not found: ${absolutePath}`);
        process.exit(1);
    }
    
    console.log(`📄 Reading: ${absolutePath}`);
    
    // Try pdf-parse first (most reliable for text PDFs)
    try {
        const pdfParse = require('pdf-parse');
        const buffer = fs.readFileSync(absolutePath);
        const data = await pdfParse(buffer);
        
        if (data.text && data.text.trim().length > 0) {
            console.log(`✅ Extracted ${data.text.length} characters using pdf-parse`);
            return {
                text: data.text,
                method: 'pdf-parse',
                pages: data.numpages,
                info: data.info
            };
        }
    } catch (err) {
        console.log(`⚠️ pdf-parse failed: ${err.message}`);
    }
    
    // Fallback: Try pdfjs-dist (good for scanned PDFs with text layer)
    try {
        const pdfjs = require('pdfjs-dist');
        const data = new Uint8Array(fs.readFileSync(absolutePath));
        const pdf = await pdfjs.getDocument({ data }).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        
        if (fullText.trim().length > 0) {
            console.log(`✅ Extracted ${fullText.length} characters using pdfjs-dist`);
            return {
                text: fullText,
                method: 'pdfjs-dist',
                pages: pdf.numPages
            };
        }
    } catch (err) {
        console.log(`⚠️ pdfjs-dist failed: ${err.message}`);
    }
    
    // Fallback: Check if it's an image-based PDF (no text layer)
    console.log('⚠️ No text found - PDF may be image-based (needs OCR)');
    
    return {
        text: '',
        method: 'none',
        error: 'Image-based PDF - use OCR tools instead'
    };
}

// Main execution
if (require.main === module) {
    const pdfPath = process.argv[2];
    if (!pdfPath) {
        console.log('Usage: node pdf_reader.js <pdf_path>');
        process.exit(1);
    }
    
    extractPDFText(pdfPath)
        .then(result => {
            if (result.text) {
                console.log('\n--- EXTRACTED TEXT ---\n');
                console.log(result.text.substring(0, 5000));
                if (result.text.length > 5000) {
                    console.log(`\n... (${result.text.length - 5000} more characters)`);
                }
                
                // Save to file
                const outputPath = pdfPath.replace(/\.pdf$/i, '_extracted.txt');
                fs.writeFileSync(outputPath, result.text);
                console.log(`\n💾 Saved to: ${outputPath}`);
            }
        })
        .catch(err => {
            console.error('❌ Error:', err);
            process.exit(1);
        });
}

module.exports = { extractPDFText };