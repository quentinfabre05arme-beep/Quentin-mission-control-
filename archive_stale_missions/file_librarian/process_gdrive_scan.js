/**
 * Google Drive Librarian - File Scan Processor
 * Processes Google Drive file list and categorizes by patterns
 */

const fs = require('fs');
const path = require('path');

// Categories and their patterns
const CATEGORIES = {
  investment: [
    /stock/i, /portfolio/i, /dcf/i, /discounted cash flow/i, /valuation/i,
    /invest/i, /finance/i, /market/i, /trading/i, /etf/i, /bitcoin/i, /crypto/i,
    /btc/i, /eth/i, /dividend/i, /yield/i, /covered call/i, /ticker/i,
    /fiscal/i, /tax/i, /impôt/i, /revenu/i, /ca\s/i, /compta/i, /accounting/i
  ],
  business: [
    /sci\s/i, /real estate/i, /immobilier/i, /facture/i, /invoice/i,
    /contract/i, /contrat/i, /bank/i, /banque/i, /rib/i, /iban/i,
    /business/i, /entreprise/i, /professional/i, /professionnel/i,
    /declaration/i, /déclaration/i, /vat/i, /tva/i, /fiscal/i
  ],
  personal: [
    /mariage/i, /wedding/i, /guest/i, /invité/i, /recipe/i, /recette/i,
    /meal/i, /repas/i, /health/i, /santé/i, /hormonal/i, /satiety/i,
    /glucose/i, /migraine/i, /medical/i, /médecin/i, /fitness/i,
    /sport/i, /travel/i, /voyage/i, /vacation/i, /holiday/i
  ],
  technical: [
    /guide/i, /tutorial/i, /how-to/i, /automation/i, /api/i, /code/i,
    /script/i, /programming/i, /development/i, /dev/i, /software/i,
    /app/i, /application/i, /web/i, /server/i, /database/i, /db/i
  ],
  ebook: [
    /ebook/i, /book/i, /livre/i, /course/i, /cours/i, /master.*plan/i,
    /playbook/i, /report/i, /rapport/i, /whitepaper/i, /guide.*final/i
  ]
};

function categorizeFile(name) {
  const lowerName = name.toLowerCase();
  const categories = [];
  
  for (const [category, patterns] of Object.entries(CATEGORIES)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerName)) {
        categories.push(category);
        break;
      }
    }
  }
  
  return categories.length > 0 ? categories : ['uncategorized'];
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return 'N/A';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDate(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function processFiles(data) {
  const files = data.data?.files || [];
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.split('T')[0];
  
  const catalog = {
    metadata: {
      scanDate: timestamp,
      fileCount: files.length,
      nextPageToken: data.data?.nextPageToken || null
    },
    files: [],
    categories: {},
    owners: {},
    stats: {
      totalSize: 0,
      folders: 0,
      documents: 0,
      spreadsheets: 0,
      presentations: 0,
      pdfs: 0,
      others: 0
    }
  };
  
  // Initialize category counts
  Object.keys(CATEGORIES).forEach(cat => catalog.categories[cat] = []);
  catalog.categories.uncategorized = [];
  
  for (const file of files) {
    // Skip trashed files
    if (file.trashed) continue;
    
    const categories = categorizeFile(file.name);
    const processedFile = {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.sizeBytes,
      sizeFormatted: formatBytes(file.sizeBytes),
      created: file.createdTime,
      modified: file.modifiedTime,
      modifiedFormatted: formatDate(file.modifiedTime),
      webViewLink: file.webViewLink,
      isShared: file.shared,
      isStarred: file.starred,
      categories: categories,
      owner: file.owners?.[0]?.emailAddress || 'unknown',
      ownerName: file.owners?.[0]?.displayName || 'unknown',
      parents: file.parents || []
    };
    
    catalog.files.push(processedFile);
    
    // Update stats
    if (file.sizeBytes) catalog.stats.totalSize += file.sizeBytes;
    
    // Mime type stats
    if (file.mimeType === 'application/vnd.google-apps.folder') catalog.stats.folders++;
    else if (file.mimeType === 'application/vnd.google-apps.document') catalog.stats.documents++;
    else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') catalog.stats.spreadsheets++;
    else if (file.mimeType === 'application/vnd.google-apps.presentation') catalog.stats.presentations++;
    else if (file.mimeType === 'application/pdf') catalog.stats.pdfs++;
    else catalog.stats.others++;
    
    // Categories
    categories.forEach(cat => catalog.categories[cat].push(file.id));
    
    // Owner stats
    const ownerEmail = file.owners?.[0]?.emailAddress || 'unknown';
    if (!catalog.owners[ownerEmail]) {
      catalog.owners[ownerEmail] = {
        name: file.owners?.[0]?.displayName || 'unknown',
        count: 0,
        files: []
      };
    }
    catalog.owners[ownerEmail].count++;
    catalog.owners[ownerEmail].files.push(file.id);
  }
  
  // Calculate category percentages
  const totalFiles = catalog.files.length;
  for (const [cat, ids] of Object.entries(catalog.categories)) {
    catalog.categories[cat] = {
      count: ids.length,
      percentage: totalFiles > 0 ? ((ids.length / totalFiles) * 100).toFixed(1) : 0,
      fileIds: ids
    };
  }
  
  // Sort files by modified time (newest first)
  catalog.files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
  
  // Recent files (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  catalog.metadata.recentFiles = catalog.files
    .filter(f => new Date(f.modified) > sevenDaysAgo)
    .map(f => ({ id: f.id, name: f.name, modified: f.modifiedFormatted }));
  
  return { catalog, dateStr };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node process_gdrive_scan.js <input-json-file>');
    process.exit(1);
  }
  
  const inputFile = args[0];
  
  // Read input
  let rawData;
  try {
    rawData = fs.readFileSync(inputFile, 'utf8');
  } catch (err) {
    console.error(`Error reading input file: ${err.message}`);
    process.exit(1);
  }
  
  // Parse JSON
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (err) {
    console.error(`Error parsing JSON: ${err.message}`);
    process.exit(1);
  }
  
  // Process
  const { catalog, dateStr } = processFiles(data);
  
  // Write catalog
  const catalogPath = path.join(__dirname, '..', '..', 'google_drive_catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  console.log(`✅ Catalog saved to: ${catalogPath}`);
  
  // Write daily log
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logPath = path.join(logDir, `gdrive_${dateStr}.log`);
  
  const logContent = `=== Google Drive Daily Scan: ${dateStr} ===
Timestamp: ${catalog.metadata.scanDate}
Files Scanned: ${catalog.metadata.fileCount}

=== Category Breakdown ===
${Object.entries(catalog.categories)
  .map(([cat, info]) => `  ${cat}: ${info.count} files (${info.percentage}%)`)
  .join('\n')}

=== File Type Stats ===
  Folders: ${catalog.stats.folders}
  Documents: ${catalog.stats.documents}
  Spreadsheets: ${catalog.stats.spreadsheets}
  Presentations: ${catalog.stats.presentations}
  PDFs: ${catalog.stats.pdfs}
  Others: ${catalog.stats.others}
  Total Size: ${formatBytes(catalog.stats.totalSize)}

=== Owners ===
${Object.entries(catalog.owners)
  .map(([email, info]) => `  ${info.name} (${email}): ${info.count} files`)
  .join('\n')}

=== Recent Activity (Last 7 Days) ===
${catalog.metadata.recentFiles.length > 0 
  ? catalog.metadata.recentFiles.map(f => `  [${f.modified}] ${f.name}`).join('\n')
  : '  No recent activity'}

=== Top 10 Recently Modified Files ===
${catalog.files.slice(0, 10).map(f => 
  `  [${f.modifiedFormatted}] ${f.name} (${f.categories.join(', ')})`
).join('\n')}

=== Scan Complete ===
`;
  
  fs.writeFileSync(logPath, logContent);
  console.log(`✅ Log saved to: ${logPath}`);
  
  // Summary output
  console.log('\n=== SCAN SUMMARY ===');
  console.log(`Files Processed: ${catalog.metadata.fileCount}`);
  console.log(`Total Size: ${formatBytes(catalog.stats.totalSize)}`);
  console.log(`Recent Activity: ${catalog.metadata.recentFiles.length} files (7 days)`);
  console.log('\nCategory Distribution:');
  Object.entries(catalog.categories)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([cat, info]) => {
      console.log(`  ${cat.padEnd(15)} ${String(info.count).padStart(3)} files (${info.percentage}%)`);
    });
}

main();
