// File Librarian + Google Drive Integration
// Auto-organizes workspace files and syncs summaries to Drive

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class FileLibrarianDrive {
  constructor() {
    this.workspaceDir = 'C:\\Users\\quent\\.openclaw\\workspace';
    this.driveFolder = 'OpenClaw_Library';
  }

  async run() {
    console.log('📁 Organizing files and syncing to Drive...');
    
    // 1. Index workspace files
    const files = await this.indexFiles();
    
    // 2. Generate summaries
    const summaries = await this.generateSummaries(files);
    
    // 3. Upload to Google Drive
    await this.uploadToDrive(summaries);
    
    console.log(`✅ Indexed ${files.length} files and synced to Drive!`);
  }

  async indexFiles() {
    const files = [];
    const dirs = ['missions', 'skills', 'memory', 'reports'];
    
    for (const dir of dirs) {
      const dirPath = path.join(this.workspaceDir, dir);
      if (fs.existsSync(dirPath)) {
        const entries = fs.readdirSync(dirPath, { recursive: true });
        for (const entry of entries) {
          if (typeof entry === 'string' && entry.endsWith('.md')) {
            const fullPath = path.join(dirPath, entry);
            try {
              const stat = fs.statSync(fullPath);
              files.push({
                path: fullPath,
                relative: path.join(dir, entry),
                size: stat.size,
                modified: stat.mtime
              });
            } catch (e) {}
          }
        }
      }
    }
    
    return files;
  }

  async generateSummaries(files) {
    const summaries = files.map(f => {
      try {
        const content = fs.readFileSync(f.path, 'utf8');
        const lines = content.split('\n');
        const title = lines[0]?.replace('#', '').trim() || path.basename(f.path);
        const firstParagraph = lines.slice(1).find(l => l.trim().length > 0) || '';
        
        return {
          title,
          summary: firstParagraph.substring(0, 200),
          path: f.relative,
          size: f.size
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    
    return summaries;
  }

  async uploadToDrive(summaries) {
    try {
      // Create index file
      const indexContent = summaries.map(s => 
        `# ${s.title}\n\n${s.summary}\n\nLocation: ${s.path}\nSize: ${s.size} bytes\n---\n`
      ).join('\n');
      
      const indexPath = path.join(this.workspaceDir, 'library_index.md');
      fs.writeFileSync(indexPath, indexContent);
      
      // Upload to Google Drive
      const cmd = `oo connector run gdrive.upload_file --file "${indexPath}" --folder "${this.driveFolder}"`;
      execSync(cmd, { encoding: 'utf8', timeout: 30000 });
      
      console.log('☁️ Uploaded to Google Drive');
    } catch (e) {
      console.error('Drive upload failed:', e.message);
      // Keep local copy
    }
  }
}

if (require.main === module) {
  new FileLibrarianDrive().run().catch(console.error);
}

module.exports = FileLibrarianDrive;
