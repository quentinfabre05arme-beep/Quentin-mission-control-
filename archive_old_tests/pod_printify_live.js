const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Load from .env file directly (bypass dotenv to avoid token mutation)
// Try multiple paths since script can be run from different directories
const possiblePaths = [
  path.join(process.cwd(), 'pod_business', '.env.local'),
  path.join(process.cwd(), '.env.local'),
  path.join(__dirname, 'pod_business', '.env.local'),
  path.join(__dirname, '.env.local'),
  'C:\\Users\\quent\\.openclaw\\workspace\\pod_business\\.env.local'
];

function loadEnvFile(envPath) {
  try {
    const content = require('fs').readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    for (const line of lines) {
      const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match) {
        env[match[1]] = match[2].trim();
      }
    }
    return env;
  } catch {
    return null;
  }
}

let envVars = null;
for (const envPath of possiblePaths) {
  envVars = loadEnvFile(envPath);
  if (envVars) {
    console.log(`[POD] Loaded env from: ${envPath}`);
    break;
  }
}

if (!envVars) {
  console.error('[POD] Warning: No .env file found');
  envVars = {};
}

const CONFIG = {
  apiKey: envVars.PRINTIFY_API_KEY,
  shopId: envVars.PRINTIFY_SHOP_ID,
  baseUrl: 'api.printify.com',
  dataDir: 'C:\\Users\\quent\\.openclaw\\workspace\\pod_business',
  autoPublish: true,
  dailyQuota: 5
};

// HTTP request helper
function apiRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.apiKey) {
      reject(new Error('PRINTIFY_API_KEY not set'));
      return;
    }

    const options = {
      hostname: CONFIG.baseUrl,
      path: `/v1${endpoint}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Quentinvest-POD-Automation/1.0'
      }
    };

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${json.error || data}`));
          }
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// SVG to PNG conversion helper (for Printify which requires raster formats)
async function convertSvgToPng(svgPath, pngPath) {
  // Try to use sharp if available (best quality)
  try {
    const sharp = require('sharp');
    const svgBuffer = await fs.readFile(svgPath);
    await sharp(svgBuffer)
      .resize(3000, 3000, { fit: 'inside', withoutEnlargement: false })
      .png()
      .toFile(pngPath);
    return true;
  } catch {
    // Sharp not available, try ImageMagick
    try {
      const { execSync } = require('child_process');
      execSync(`magick "${svgPath}" -resize 3000x3000 "${pngPath}"`, { stdio: 'ignore' });
      return true;
    } catch {
      // Try Inkscape
      try {
        const { execSync } = require('child_process');
        execSync(`inkscape "${svgPath}" --export-filename="${pngPath}" --export-width=3000`, { stdio: 'ignore' });
        return true;
      } catch {
        // Last resort: rsvg-convert
        try {
          const { execSync } = require('child_process');
          execSync(`rsvg-convert -w 3000 "${svgPath}" > "${pngPath}"`, { stdio: 'ignore' });
          return true;
        } catch {
          return false;
        }
      }
    }
  }
}

async function log(msg) {
  const ts = new Date().toISOString();
  const logLine = `[${ts}] [POD] ${msg}\n`;
  console.log(logLine.trim());
  
  // Append to log file
  try {
    await fs.appendFile(path.join(CONFIG.dataDir, 'automation.log'), logLine);
  } catch {}
}

// Get shops
async function getShops() {
  log('Fetching shops...');
  const response = await apiRequest('/shops.json');
  // Handle both {data: [...]} and [...] response formats
  return response.data || (Array.isArray(response) ? response : []) || [];
}

// Upload image
async function uploadImage(imagePath, fileName) {
  log(`Uploading image: ${fileName}`);
  
  // Read file as base64
  const imageBuffer = await fs.readFile(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  const uploadData = {
    file_name: fileName,
    contents: base64Image
  };
  
  const result = await apiRequest('/uploads/images.json', 'POST', uploadData);
  log(`Image uploaded: ${result.id}`);
  return result;
}

// Get blueprints
async function getBlueprints() {
  log('Fetching product blueprints...');
  const response = await apiRequest('/catalog/blueprints.json');
  // Printify returns { data: [...] } or just [...]
  if (Array.isArray(response)) {
    return response;
  }
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  // Some endpoints return data directly
  return response || [];
}

// Get print providers for a blueprint
async function getPrintProviders(blueprintId) {
  const response = await apiRequest(`/catalog/blueprints/${blueprintId}/print_providers.json`);
  if (Array.isArray(response)) {
    return response;
  }
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  return response || [];
}

// Create product
async function createProduct(shopId, productData) {
  log(`Creating product: ${productData.title}`);
  const result = await apiRequest(`/shops/${shopId}/products.json`, 'POST', productData);
  log(`Product created: ${result.id}`);
  return result;
}

// Publish product - Printify publish uses boolean flags
async function publishProduct(shopId, productId) {
  log(`Publishing product ${productId}...`);
  
  // Printify publish endpoint takes an object with boolean flags
  const publishData = {
    title: true,
    description: true,
    tags: true,
    variants: true,
    images: true
  };
  
  await apiRequest(`/shops/${shopId}/products/${productId}/publish.json`, 'POST', publishData);
  log(`Product published successfully`);
}

// Generate product data - uses dynamic variant fetching
async function generateProductData(imageId, design, blueprintId, printProviderId) {
  // Fetch available variants for this blueprint/provider
  log(`Fetching variants for blueprint ${blueprintId}, provider ${printProviderId}...`);
  
  let variants = [];
  try {
    const variantData = await apiRequest(`/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`);
    log(`Variant API response keys: ${Object.keys(variantData).join(', ')}`);
    
    let availableVariants = [];
    if (Array.isArray(variantData)) {
      availableVariants = variantData;
    } else if (variantData.data && Array.isArray(variantData.data)) {
      availableVariants = variantData.data;
    } else if (variantData.variants && Array.isArray(variantData.variants)) {
      availableVariants = variantData.variants;
    } else {
      log(`Unexpected variant response structure: ${JSON.stringify(variantData).slice(0, 500)}`);
    }
    
    log(`Raw variant count: ${availableVariants.length}`);
    
    // Filter to enabled variants and set prices
    variants = availableVariants
      .filter(v => v.is_available !== false)
      .slice(0, 5) // Limit to first 5 sizes
      .map(v => ({
        id: v.id,
        price: v.id % 2 === 0 ? 2499 : 2699, // Simple pricing
        is_enabled: true
      }));
    
    log(`Found ${variants.length} variants`);
  } catch (err) {
    log(`Warning: Could not fetch variants: ${err.message}`);
    // Fallback to basic variant structure
    variants = [{ id: 1, price: 2499, is_enabled: true }];
  }
  
  const variantIds = variants.map(v => v.id);
  
  return {
    title: `${design.text} - Premium Design`,
    description: generateDescription(design),
    blueprint_id: blueprintId,
    print_provider_id: printProviderId,
    variants: variants,
    print_areas: [{
      variant_ids: variantIds,
      placeholders: [{
        position: 'front',
        images: [{
          id: imageId,
          x: 0.5,
          y: 0.5,
          scale: 1.0,
          angle: 0
        }]
      }]
    }],
    tags: [design.category, 'trending', 'premium']
  };
}

function generateDescription(design) {
  return `Premium ${design.category} design featuring "${design.text}". 

• High-quality DTG printing
• Premium cotton blend
• Data-driven design aesthetic
• Perfect for ${design.category} enthusiasts

Printed on demand with worldwide shipping.`;
}

// Full automation cycle
async function runAutomation() {
  log('=== PRINTIFY FULL AUTOMATION STARTING ===');
  
  // Step 1: Get shops
  const shops = await getShops();
  if (shops.length === 0) {
    throw new Error('No shops found. Create a shop in Printify first.');
  }
  
  const shopId = CONFIG.shopId !== 'auto' ? CONFIG.shopId : shops[0].id;
  log(`Using shop: ${shops[0].title} (ID: ${shopId})`);
  
  // Step 2: Get a blueprint and print provider
  log('Fetching available blueprints...');
  const blueprints = await getBlueprints();
  if (blueprints.length === 0) {
    throw new Error('No blueprints found in catalog');
  }
  
  // Find a unisex t-shirt blueprint
  const tShirtBlueprint = blueprints.find(b => 
    b.title.toLowerCase().includes('unisex') && 
    b.title.toLowerCase().includes('tee')
  ) || blueprints[0];
  
  log(`Using blueprint: ${tShirtBlueprint.title} (ID: ${tShirtBlueprint.id})`);
  
  // Get print providers for this blueprint
  const providers = await getPrintProviders(tShirtBlueprint.id);
  if (providers.length === 0) {
    throw new Error('No print providers found for blueprint');
  }
  
  const printProvider = providers[0];
  log(`Using print provider: ${printProvider.title} (ID: ${printProvider.id})`);
  
  // Step 3: Load designs
  const designsDir = path.join(CONFIG.dataDir, 'designs');
  const designFiles = await fs.readdir(designsDir).catch(() => []);
  const svgFiles = designFiles.filter(f => f.endsWith('.svg')).slice(0, CONFIG.dailyQuota);
  
  log(`${svgFiles.length} designs to process`);
  
  // Step 4: Process each design
  const results = [];
  
  for (const svgFile of svgFiles) {
    try {
      const designPath = path.join(designsDir, svgFile);
      
      // Parse design name
      const designName = svgFile.replace('.svg', '').replace(/_/g, ' ').toUpperCase();
      const category = svgFile.includes('crypto') ? 'crypto' : 
                      svgFile.includes('fitness') ? 'fitness' : 'professions';
      
      const design = {
        text: designName,
        category: category
      };
      
      // Convert SVG to PNG first (Printify requires raster formats)
      const pngPath = designPath.replace('.svg', '.png');
      log(`Converting ${svgFile} to PNG...`);
      
      const converted = await convertSvgToPng(designPath, pngPath);
      if (!converted) {
        log(`Error: Could not convert ${svgFile} to PNG. Skipping...`);
        results.push({ design: svgFile, status: 'error', message: 'SVG conversion failed' });
        continue;
      }
      log(`Converted: ${pngPath}`);
      
      // Upload the converted image
      let imageId;
      try {
        const uploadResult = await uploadImage(pngPath, `${designName}.png`);
        imageId = uploadResult.id;
        log(`Image uploaded: ${imageId}`);
      } catch (uploadErr) {
        log(`Upload error: ${uploadErr.message}`);
        throw uploadErr;
      }
      
      // Create product with uploaded image
      const productData = await generateProductData(imageId, design, tShirtBlueprint.id, printProvider.id);
      const product = await createProduct(shopId, productData);
      
      // Publish if auto-publish enabled
      if (CONFIG.autoPublish) {
        await publishProduct(shopId, product.id);
      }
      
      results.push({
        design: svgFile,
        status: 'published',
        productId: product.id,
        shopId: shopId
      });
      
      // Clean up temporary PNG file
      try {
        await fs.unlink(pngPath);
        log(`Cleaned up temporary file: ${pngPath}`);
      } catch {}
      
    } catch (err) {
      log(`Error processing ${svgFile}: ${err.message}`);
      results.push({ design: svgFile, status: 'error', message: err.message });
    }
  }
  
  // Step 4: Save results
  const summary = {
    timestamp: new Date().toISOString(),
    shopId: shopId,
    designsProcessed: svgFiles.length,
    results: results
  };
  
  await fs.writeFile(
    path.join(CONFIG.dataDir, 'automation_results.json'),
    JSON.stringify(summary, null, 2)
  );
  
  log('=== AUTOMATION COMPLETE ===');
  return summary;
}

// Check status
async function checkStatus() {
  log('Checking Printify status...');
  
  try {
    const shops = await getShops();
    
    if (shops.length > 0) {
      const shop = shops[0];
      log(`✓ Connected to Printify`);
      log(`✓ Shop: ${shop.title} (ID: ${shop.id})`);
      
      // Update shop ID in config
      CONFIG.shopId = shop.id;
      
      return {
        status: 'connected',
        shop: shop,
        message: 'Ready for full automation'
      };
    } else {
      return {
        status: 'no_shops',
        message: 'No shops found. Create a shop in Printify dashboard first.'
      };
    }
    
  } catch (err) {
    return {
      status: 'error',
      message: err.message
    };
  }
}

// Main entry
async function main() {
  const mode = process.argv[2];
  
  switch(mode) {
    case 'status':
      const status = await checkStatus();
      console.log(JSON.stringify(status, null, 2));
      break;
      
    case 'run':
      await runAutomation();
      break;
      
    case 'upload':
      // Test upload
      log('Test upload mode - requires PNG conversion first');
      break;
      
    default:
      console.log(`
Printify Full Automation - ACTIVE

Usage: node pod_printify_live.js [command]

Commands:
  status  - Check API connection and shop status
  run     - Run full automation cycle
  upload  - Test image upload

Environment:
  PRINTIFY_API_KEY: ${CONFIG.apiKey ? '✓ Set' : '✗ Not set'}
  PRINTIFY_SHOP_ID: ${CONFIG.shopId || 'auto-detect'}

Status:
  Run 'status' to verify connection
      `);
  }
}

module.exports = { checkStatus, runAutomation };

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
