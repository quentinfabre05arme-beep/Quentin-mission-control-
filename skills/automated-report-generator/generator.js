/**
 * Automated Report Generator
 * Generate reports from data and templates
 */

const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '..', '..', 'reports');

class ReportGenerator {
  constructor() {
    this.reportsDir = REPORTS_DIR;
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  generate({ title, data, template = 'default' }) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `report_${timestamp}_${title.replace(/[^a-z0-9]/gi, '_')}.md`;
    
    const content = this.renderTemplate(template, { title, data, timestamp });
    
    fs.writeFileSync(path.join(this.reportsDir, filename), content);
    
    return {
      filename,
      path: path.join(this.reportsDir, filename),
      generated: true
    };
  }

  renderTemplate(template, { title, data, timestamp }) {
    return `# ${title}
**Generated:** ${timestamp}

## Summary
${data.summary || 'No summary provided'}

## Details
${JSON.stringify(data.details || {}, null, 2)}

## Metrics
- Total Items: ${data.metrics?.count || 0}
- Success Rate: ${data.metrics?.success || 'N/A'}%
- Duration: ${data.metrics?.duration || 'N/A'}

## Notes
${data.notes || 'No additional notes'}

---
*Auto-generated report*
`;
  }
}

module.exports = ReportGenerator;
