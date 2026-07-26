/**
 * Data Pipeline Processor
 * Process and transform data files
 */

const fs = require('fs');
const path = require('path');

class DataPipeline {
  constructor() {
    this.transforms = [];
  }

  addTransform(name, fn) {
    this.transforms.push({ name, fn });
    return this;
  }

  processFile(inputPath, outputPath) {
    let data = fs.readFileSync(inputPath, 'utf8');
    
    const stats = {
      transforms: [],
      before: data.length,
      after: 0
    };
    
    for (const transform of this.transforms) {
      const before = data.length;
      data = transform.fn(data);
      stats.transforms.push({
        name: transform.name,
        sizeChange: data.length - before
      });
    }
    
    stats.after = data.length;
    
    fs.writeFileSync(outputPath, data);
    
    return {
      input: inputPath,
      output: outputPath,
      stats
    };
  }

  // Built-in transforms
  static transforms = {
    jsonToCsv: (data) => {
      const obj = JSON.parse(data);
      const headers = Object.keys(obj[0] || {});
      const rows = obj.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','));
      return [headers.join(','), ...rows].join('\n');
    },
    
    deduplicate: (data) => {
      const lines = data.split('\n');
      return [...new Set(lines)].join('\n');
    },
    
    sortLines: (data) => {
      return data.split('\n').sort().join('\n');
    },
    
    extractJson: (data) => {
      const matches = data.match(/\{[^{}]*\}/g) || [];
      return matches.join('\n');
    }
  };
}

module.exports = DataPipeline;
