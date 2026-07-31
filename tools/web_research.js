// web_research.js - Deep web research using browser automation
// Replaces broken web_search with real browser-based research

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Deep Web Research Tool
 * Uses browser automation to search and extract information from the web
 * 
 * Usage: node web_research.js "your search query"
 */

async function deepResearch(query, options = {}) {
    const {
        depth = 3,           // How many pages to visit
        timeout = 30000,      // Timeout per page
        saveResults = true    // Save to file
    } = options;

    console.log(`🔍 Starting deep research: "${query}"`);
    console.log(`📊 Depth: ${depth} pages | Timeout: ${timeout}ms`);
    console.log('');

    // Step 1: Search via DuckDuckGo (no API key needed)
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    console.log(`🌐 Searching: ${searchUrl}`);
    
    // Use browser tool via OpenClaw
    // Since we can't call browser directly from script, we'll document the approach
    
    const researchPlan = {
        query,
        steps: [
            {
                step: 1,
                action: 'browser.open',
                url: searchUrl,
                purpose: 'Get search results'
            },
            {
                step: 2,
                action: 'browser.snapshot',
                purpose: 'Extract result links'
            },
            {
                step: 3,
                action: 'browser.click',
                target: 'first_result',
                purpose: 'Visit top result'
            },
            {
                step: 4,
                action: 'browser.snapshot',
                purpose: 'Extract content'
            },
            {
                step: 5,
                action: 'repeat',
                for: 'next_results',
                purpose: 'Visit more sources'
            }
        ]
    };

    return researchPlan;
}

// Alternative: Use curl to fetch search results
function fetchSearchResults(query) {
    try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const result = execSync(`curl -s -L "${searchUrl}" -A "Mozilla/5.0"`, { 
            encoding: 'utf8',
            timeout: 15000 
        });
        return result;
    } catch (e) {
        console.error('Search failed:', e.message);
        return null;
    }
}

// Parse DuckDuckGo results
function parseResults(html) {
    const results = [];
    const regex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    
    while ((match = regex.exec(html)) !== null && results.length < 10) {
        results.push({
            url: match[1],
            title: match[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        });
    }
    
    return results;
}

// Main execution
if (require.main === module) {
    const query = process.argv[2];
    if (!query) {
        console.log('Usage: node web_research.js "your search query"');
        console.log('');
        console.log('Examples:');
        console.log('  node web_research.js "best digital products to sell 2026"');
        console.log('  node web_research.js "Gumroad vs Etsy fees"');
        console.log('  node web_research.js "micro entreprise France registration"');
        process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('🔍 DEEP WEB RESEARCH TOOL');
    console.log('='.repeat(60));
    console.log('');

    // Fetch results
    const html = fetchSearchResults(query);
    if (html) {
        const results = parseResults(html);
        
        console.log(`✅ Found ${results.length} results`);
        console.log('');
        
        results.forEach((result, i) => {
            console.log(`${i + 1}. ${result.title}`);
            console.log(`   URL: ${result.url}`);
            console.log('');
        });

        // Save results
        const outputFile = path.join(__dirname, `research_${Date.now()}.json`);
        fs.writeFileSync(outputFile, JSON.stringify({ query, results, timestamp: new Date().toISOString() }, null, 2));
        console.log(`💾 Saved to: ${outputFile}`);
        
        // Next steps
        console.log('');
        console.log('📋 NEXT STEPS:');
        console.log('   Use browser tool to visit these URLs:');
        console.log('   browser(action: "open", url: "URL_HERE")');
        console.log('');
        console.log('   Or use web_fetch for specific pages:');
        console.log('   web_fetch("URL_HERE")');
    } else {
        console.log('❌ Search failed. Try using browser tool directly:');
        console.log('   browser(action: "open", url: "https://duckduckgo.com/?q=YOUR_QUERY")');
    }
}

module.exports = { deepResearch, fetchSearchResults, parseResults };