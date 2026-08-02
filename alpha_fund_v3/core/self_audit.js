#!/usr/bin/env node
/**
 * 🔍 CLAW SELF-AUDIT ENGINE v2.0
 * Comprehensive analysis without crashing
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'alpha_fund_v3', 'logs', 'full_audit.json');

// ─── CONFIG ─────────────────────────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 
  'coverage', '.cache', 'archive', 'archive_*',
  'out', '.vercel', '.vscode', '.idea'
]);

// ─── STATE ──────────────────────────────────────────────────
const audit = {
  timestamp: new Date().toISOString(),
  system: {},
  workspace: {
    total_files: 0,
    total_dirs: 0,
    total_size: 0,
    top_dirs: [],
    file_types: {},
    empty_dirs: 0,
    old_files: 0, // > 30 days
    duplicates: [],
    dead_code: [],
    orphans: [] // Files not referenced by anything
  },
  processes: [],
  registry: [],
  services: [],
  network: {},
  security: {},
  recommendations: []
};

// ─── SCAN DIRECTORY ───────────────────────────────────────
function scanDir(dir, depth = 0) {
  if (depth > 3) return null; // Limit depth
  
  const name = path.basename(dir);
  if (SKIP_DIRS.has(name)) return null;
  
  const result = {
    name,
    path: dir,
    files: 0,
    dirs: 0,
    size: 0,
    types: {},
    old_files: 0
  };
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      if (item.startsWith('.')) continue;
      
      const fp = path.join(dir, item);
      try {
        const stat = fs.statSync(fp);
        
        if (stat.isDirectory()) {
          const sub = scanDir(fp, depth + 1);
          if (sub) {
            result.dirs++;
            result.files += sub.files;
            result.size += sub.size;
            // Merge types
            Object.entries(sub.types).forEach(([t, c]) => {
              result.types[t] = (result.types[t] || 0) + c;
            });
            result.old_files += sub.old_files;
          }
        } else {
          result.files++;
          result.size += stat.size;
          
          const ext = path.extname(item).toLowerCase() || '(no ext)';
          result.types[ext] = (result.types[ext] || 0) + 1;
          
          // Check if old (> 30 days)
          const age = Date.now() - stat.mtime.getTime();
          if (age > 30 * 24 * 60 * 60 * 1000) {
            result.old_files++;
          }
        }
      } catch(e) {}
    }
  } catch(e) {}
  
  return result;
}

// ─── FIND DEAD CODE ───────────────────────────────────────
function findDeadCode() {
  const dead = [];
  
  // Check for orphaned node_modules references
  const pkgFiles = [];
  function findPackages(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item === 'node_modules' || item.startsWith('.')) continue;
        const fp = path.join(dir, item);
        try {
          const stat = fs.statSync(fp);
          if (stat.isDirectory()) {
            findPackages(fp);
          } else if (item === 'package.json') {
            pkgFiles.push(fp);
          }
        } catch(e) {}
      }
    } catch(e) {}
  }
  
  findPackages(ROOT);
  
  for (const pkg of pkgFiles) {
    try {
      const content = JSON.parse(fs.readFileSync(pkg, 'utf8'));
      const dir = path.dirname(pkg);
      const nm = path.join(dir, 'node_modules');
      
      if (fs.existsSync(nm)) {
        const deps = Object.keys(content.dependencies || {});
        const devDeps = Object.keys(content.devDependencies || {});
        const allDeps = [...deps, ...devDeps];
        
        const installed = fs.readdirSync(nm).filter(d => !d.startsWith('.'));
        const unused = installed.filter(d => !allDeps.includes(d) && !d.startsWith('@'));
        
        if (unused.length > 0) {
          dead.push({
            package: pkg,
            unused_deps: unused.length,
            examples: unused.slice(0, 5)
          });
        }
      }
    } catch(e) {}
  }
  
  return dead;
}

// ─── SYSTEM INFO ────────────────────────────────────────────
function getSystemInfo() {
  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpus: os.cpus().length,
    total_ram_gb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    free_ram_gb: Math.round(os.freemem() / 1024 / 1024 / 1024),
    uptime_hours: Math.floor(os.uptime() / 3600),
    user: os.userInfo().username,
    home: os.homedir()
  };
}

// ─── GENERATE RECOMMENDATIONS ─────────────────────────────
function generateRecommendations(workspace) {
  const recs = [];
  
  // RAM
  const ramUsed = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  if (ramUsed > 90) {
    recs.push({
      priority: 'CRITICAL',
      issue: `RAM at ${ramUsed}%`,
      action: 'Restart gateway, close browser tabs, stop unused processes'
    });
  }
  
  // File bloat
  if (workspace.old_files > 1000) {
    recs.push({
      priority: 'HIGH',
      issue: `${workspace.old_files} files older than 30 days`,
      action: 'Archive or delete old files'
    });
  }
  
  // Empty dirs
  if (workspace.empty_dirs > 50) {
    recs.push({
      priority: 'MEDIUM',
      issue: `${workspace.empty_dirs} empty directories`,
      action: 'Remove empty directories'
    });
  }
  
  // Large dirs
  const large = workspace.top_dirs.filter(d => d.size > 100 * 1024 * 1024); // >100MB
  if (large.length > 0) {
    recs.push({
      priority: 'MEDIUM',
      issue: `${large.length} directories > 100MB`,
      action: 'Archive or compress large directories',
      dirs: large.map(d => d.name)
    });
  }
  
  return recs;
}

// ─── MAIN ─────────────────────────────────────────────────
function run() {
  console.log('🔍 FULL SYSTEM AUDIT v2.0');
  console.log('');
  
  // System
  audit.system = getSystemInfo();
  console.log(`System: ${audit.system.platform} ${audit.system.release}`);
  console.log(`RAM: ${audit.system.total_ram_gb}GB total, ${audit.system.free_ram_gb}GB free`);
  console.log(`Uptime: ${audit.system.uptime_hours}h`);
  console.log('');
  
  // Scan workspace (top-level only, then drill into large ones)
  console.log('Scanning workspace...');
  const items = fs.readdirSync(ROOT);
  const dirs = [];
  
  for (const item of items) {
    if (item.startsWith('.')) continue;
    const fp = path.join(ROOT, item);
    try {
      const stat = fs.statSync(fp);
      if (stat.isDirectory() && !SKIP_DIRS.has(item)) {
        const result = scanDir(fp);
        if (result) {
          dirs.push(result);
          audit.workspace.total_files += result.files;
          audit.workspace.total_dirs += result.dirs + 1;
          audit.workspace.total_size += result.size;
          audit.workspace.old_files += result.old_files;
        }
      }
    } catch(e) {}
  }
  
  // Sort by size
  dirs.sort((a, b) => b.size - a.size);
  audit.workspace.top_dirs = dirs.slice(0, 15).map(d => ({
    name: d.name,
    files: d.files,
    dirs: d.dirs,
    size_mb: Math.round(d.size / 1024 / 1024),
    old_files: d.old_files,
    types: Object.entries(d.types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {})
  }));
  
  // Count empty dirs
  let emptyCount = 0;
  function countEmpty(dir, depth = 0) {
    if (depth > 4 || !fs.existsSync(dir)) return;
    try {
      const items = fs.readdirSync(dir).filter(i => !i.startsWith('.'));
      if (items.length === 0) {
        emptyCount++;
      } else {
        for (const item of items) {
          const fp = path.join(dir, item);
          try {
            if (fs.statSync(fp).isDirectory()) countEmpty(fp, depth + 1);
          } catch(e) {}
        }
      }
    } catch(e) {}
  }
  countEmpty(ROOT);
  audit.workspace.empty_dirs = emptyCount;
  
  // Find dead code
  console.log('Checking for dead code...');
  audit.workspace.dead_code = findDeadCode();
  
  // Generate recommendations
  audit.recommendations = generateRecommendations(audit.workspace);
  
  // Save
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(audit, null, 2));
  
  // Print summary
  console.log('');
  console.log('=== AUDIT COMPLETE ===');
  console.log(`Files: ${audit.workspace.total_files.toLocaleString()}`);
  console.log(`Dirs: ${audit.workspace.total_dirs.toLocaleString()}`);
  console.log(`Size: ${Math.round(audit.workspace.total_size / 1024 / 1024)}MB`);
  console.log(`Old files (>30d): ${audit.workspace.old_files}`);
  console.log(`Empty dirs: ${audit.workspace.empty_dirs}`);
  console.log(`Dead code issues: ${audit.workspace.dead_code.length}`);
  console.log(`Recommendations: ${audit.recommendations.length}`);
  console.log('');
  
  console.log('Top directories:');
  audit.workspace.top_dirs.slice(0, 5).forEach(d => {
    console.log(`  ${d.name.padEnd(25)} ${d.size_mb}MB | ${d.files} files | ${d.old_files} old`);
  });
  
  console.log('');
  console.log('Recommendations:');
  audit.recommendations.forEach(r => {
    const icon = r.priority === 'CRITICAL' ? '🔴' : r.priority === 'HIGH' ? '🟠' : '🟡';
    console.log(`  ${icon} ${r.issue}`);
    console.log(`     → ${r.action}`);
  });
  
  console.log('');
  console.log(`Full report saved to: ${OUTPUT}`);
  
  return audit;
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { run };

if (require.main === module) {
  run();
}
