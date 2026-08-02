/**
 * PROJECT CLAW CORE — Doc Generator
 * Generate Markdown docs from JS files.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'doc_generator.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

class DocGenerator {
  generateForFile(filePath) {
    log(`Generating docs for ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const name = path.basename(filePath, '.js');
    const classMatch = content.match(/class\s+(\w+)/);
    const functionMatches = [...content.matchAll(/function\s+(\w+)\s*\(/g)];
    const exportMatches = [...content.matchAll(/module\.exports\s*=\s*\{([^}]+)\}/gs)];
    
    let md = `# ${name}\n\n`;
    if (classMatch) md += `**Class:** ${classMatch[1]}\n\n`;
    if (functionMatches.length > 0) {
      md += `## Functions\n\n`;
      for (const m of functionMatches.slice(0, 10)) {
        md += `- \`${m[1]}()\`\n`;
      }
    }
    md += `\n## Source\n\n- Path: ${filePath}\n- Lines: ${content.split('\n').length}\n`;
    
    return md;
  }
  
  generateForDirectory(dir, outputDir) {
    log(`Generating docs for ${dir}`);
    fs.mkdirSync(outputDir, { recursive: true });
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
    const results = [];
    for (const file of files) {
      const filePath = path.join(dir, file);
      const md = this.generateForFile(filePath);
      const outPath = path.join(outputDir, file.replace('.js', '.md'));
      fs.writeFileSync(outPath, md);
      results.push({ file, out: outPath });
    }
    return { success: true, generated: results.length, files: results };
  }
}

module.exports = { DocGenerator };

if (require.main === module) {
  const gen = new DocGenerator();
  const result = gen.generateForDirectory('project_claw_core/core', 'project_claw_core/docs/core');
  console.log(JSON.stringify({ generated: result.generated }, null, 2));
}
