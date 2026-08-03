const fs = require('fs');
const path = require('path');

const TARGET_EXTS = ['.md', '.txt', '.json', '.js', '.py', '.ps1'];
const MAX_SIZE = 500000;
const SKIP_DIRS = ['node_modules', 'venv', '__pycache__', '.git', 'tmp', 'temp', 'dist', 'build'];

function walkDir(dir, baseDir = dir, files = []) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(baseDir, fullPath).replace(/\\\\/g, '/');
            
            if (entry.isDirectory()) {
                if (!entry.name.startsWith('.') && !SKIP_DIRS.includes(entry.name)) {
                    files = walkDir(fullPath, baseDir, files);
                }
            } else if (entry.isFile()) {
                const ext = path.extname(fullPath).toLowerCase();
                const stats = fs.statSync(fullPath);
                if (TARGET_EXTS.includes(ext) && stats.size < MAX_SIZE) {
                    files.push({
                        path: relPath,
                        ext,
                        size: stats.size,
                        mtime: stats.mtime.toISOString()
                    });
                }
            }
        }
    } catch (e) {}
    return files;
}

const allFiles = walkDir('.');

// Write UTF-8 without BOM
const jsonOutput = JSON.stringify(allFiles, null, 2);
fs.writeFileSync('librarian_files.json', jsonOutput, { encoding: 'utf8' });
console.log(`Scanned ${allFiles.length} files`);
