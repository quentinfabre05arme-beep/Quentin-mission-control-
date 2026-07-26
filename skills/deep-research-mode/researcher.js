/**
 * Deep Research Mode
 * Multi-step autonomous research with verification and citations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RESEARCH_DIR = path.join(__dirname, '..', '..', 'research_outputs');

class DeepResearchMode {
  constructor() {
    this.sources = [];
    this.claims = [];
    this.confidence = 0;
  }

  /**
   * Execute deep research on a topic
   */
  async execute({ query, depth = 'standard', sources = ['all'], verify = true }) {
    console.log(`🔬 Starting deep research: "${query}"`);
    console.log(`   Depth: ${depth} | Sources: ${sources.join(', ')}`);

    // Phase 1: Expand query
    const queries = this.expandQuery(query);
    console.log(`📋 Expanded to ${queries.length} sub-queries`);

    // Phase 2: Multi-source collection
    const rawData = await this.collectFromSources(queries, sources);
    console.log(`📚 Collected ${rawData.length} data points`);

    // Phase 3: Verification
    if (verify) {
      this.verifyClaims(rawData);
      console.log(`✓ Verified ${this.claims.filter(c => c.verified).length} claims`);
    }

    // Phase 4: Synthesis
    const synthesis = this.synthesize(rawData);

    // Phase 5: Generate report
    const report = this.generateReport(query, synthesis, depth);

    // Save report
    this.saveReport(report);

    return report;
  }

  /**
   * Expand single query into multiple targeted queries
   */
  expandQuery(query) {
    const expansions = [query];
    
    // Add temporal variations
    expansions.push(`${query} today`);
    expansions.push(`${query} latest news`);
    
    // Add analytical variations
    expansions.push(`${query} analysis`);
    expansions.push(`${query} trends`);
    
    // Add sentiment variations
    expansions.push(`${query} sentiment`);
    expansions.push(`${query} outlook`);
    
    return [...new Set(expansions)];
  }

  /**
   * Collect data from multiple sources
   */
  async collectFromSources(queries, sourceTypes) {
    const results = [];

    for (const query of queries) {
      // Search via Serper
      try {
        const searchResults = await this.searchSerper(query);
        results.push(...searchResults);
      } catch (error) {
        console.warn(`Search failed for "${query}":`, error.message);
      }
    }

    return results;
  }

  /**
   * Search using Serper.dev API
   */
  async searchSerper(query) {
    const apiKey = process.env.SERPER_API_KEY || '1a32d0…94f3';
    
    // Use PowerShell to make the request
    try {
      const command = `Invoke-RestMethod -Uri "https://google.serper.dev/search" -Method POST -Headers @{"X-API-KEY"="${apiKey}";"Content-Type"="application/json"} -Body '{"q":"${query}"}'`;
      
      const output = execSync(command, { 
        encoding: 'utf8', 
        shell: 'powershell',
        timeout: 10000 
      });
      
      const data = JSON.parse(output);
      
      return (data.organic || []).map(result => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        date: result.date,
        source: new URL(result.link).hostname,
        query,
        type: 'search'
      }));
    } catch (error) {
      console.error('Serper search failed:', error.message);
      return [];
    }
  }

  /**
   * Verify claims across multiple sources
   */
  verifyClaims(data) {
    // Group by similar claims
    const claimGroups = this.groupByClaim(data);
    
    for (const [claim, sources] of Object.entries(claimGroups)) {
      const verified = sources.length >= 2;
      const confidence = this.calculateConfidence(sources);
      
      this.claims.push({
        claim,
        sources: sources.length,
        verified,
        confidence,
        details: sources
      });
    }
  }

  /**
   * Group data points by similar claims
   */
  groupByClaim(data) {
    const groups = {};
    
    for (const item of data) {
      // Extract key claims from snippet
      const keyClaim = this.extractKeyClaim(item.snippet);
      
      if (!groups[keyClaim]) {
        groups[keyClaim] = [];
      }
      
      groups[keyClaim].push(item);
    }
    
    return groups;
  }

  /**
   * Extract key claim from text
   */
  extractKeyClaim(text) {
    // Simple extraction - look for numbers, percentages, key facts
    const patterns = [
      /(\d+(?:\.\d+)?%)/,           // Percentages
      /(\$[\d,]+(?:\.\d+)?)/,        // Dollar amounts
      /(\d+(?:\.\d+)?(?:\s*(?:BTC|ETH|USD|EUR)))/i,  // Crypto amounts
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    // Fallback: first 50 chars
    return text.substring(0, 50);
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(sources) {
    const count = sources.length;
    
    if (count >= 3) return 0.95;
    if (count === 2) return 0.80;
    if (count === 1) return 0.60;
    return 0.30;
  }

  /**
   * Synthesize findings into coherent analysis
   */
  synthesize(data) {
    const verifiedClaims = this.claims.filter(c => c.verified);
    const unverifiedClaims = this.claims.filter(c => !c.verified);
    
    // Extract themes
    const themes = this.extractThemes(data);
    
    // Determine overall sentiment
    const sentiment = this.analyzeSentiment(data);
    
    return {
      themes,
      sentiment,
      verifiedClaims,
      unverifiedClaims,
      totalSources: data.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract themes from data
   */
  extractThemes(data) {
    const wordCounts = {};
    
    for (const item of data) {
      const words = (item.title + ' ' + item.snippet)
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4);
      
      for (const word of words) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }
    
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }

  /**
   * Analyze sentiment from data
   */
  analyzeSentiment(data) {
    const positive = ['up', 'rise', 'bull', 'growth', 'gain', 'high'];
    const negative = ['down', 'fall', 'bear', 'loss', 'drop', 'low'];
    
    let posCount = 0;
    let negCount = 0;
    
    for (const item of data) {
      const text = (item.title + ' ' + item.snippet).toLowerCase();
      
      for (const word of positive) {
        if (text.includes(word)) posCount++;
      }
      
      for (const word of negative) {
        if (text.includes(word)) negCount++;
      }
    }
    
    if (posCount > negCount * 1.5) return 'bullish';
    if (negCount > posCount * 1.5) return 'bearish';
    return 'neutral';
  }

  /**
   * Generate structured report
   */
  generateReport(query, synthesis, depth) {
    const { themes, sentiment, verifiedClaims, unverifiedClaims } = synthesis;
    
    let report = `# Research Report: ${query}\n`;
    report += `**Date:** ${new Date().toISOString()}\n`;
    report += `**Depth:** ${depth}\n`;
    report += `**Sources:** ${synthesis.totalSources} consulted\n\n`;
    
    // Executive Summary
    report += `## Executive Summary\n`;
    report += `Sentiment: ${sentiment.toUpperCase()}. `;
    report += `${verifiedClaims.length} claims verified across ${synthesis.totalSources} sources. `;
    report += `Key themes: ${themes.slice(0, 3).map(t => t.word).join(', ')}.\n\n`;
    
    // Verified Claims
    if (verifiedClaims.length > 0) {
      report += `## Verified Claims\n`;
      report += `| Claim | Sources | Confidence |\n`;
      report += `|-------|---------|------------|\n`;
      
      for (const claim of verifiedClaims.slice(0, 10)) {
        report += `| ${claim.claim.substring(0, 50)} | ${claim.sources} | ${(claim.confidence * 100).toFixed(0)}% |\n`;
      }
      report += '\n';
    }
    
    // Unverified Claims
    if (unverifiedClaims.length > 0) {
      report += `## ⚠️ Needs Verification\n`;
      for (const claim of unverifiedClaims.slice(0, 5)) {
        report += `- ${claim.claim.substring(0, 100)} (only ${claim.sources} source(s))\n`;
      }
      report += '\n';
    }
    
    // Sources
    report += `## Sources\n`;
    const uniqueSources = [...new Set(this.sources)];
    for (let i = 0; i < Math.min(uniqueSources.length, 10); i++) {
      const source = uniqueSources[i];
      report += `[${i + 1}] ${source.link} — ${source.title}\n`;
    }
    
    return {
      topic: query,
      depth,
      sentiment,
      verifiedCount: verifiedClaims.length,
      unverifiedCount: unverifiedClaims.length,
      totalSources: synthesis.totalSources,
      markdown: report,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Save report to file
   */
  saveReport(report) {
    if (!fs.existsSync(RESEARCH_DIR)) {
      fs.mkdirSync(RESEARCH_DIR, { recursive: true });
    }
    
    const filename = `research_${new Date().toISOString().split('T')[0]}_${report.topic.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.md`;
    const filepath = path.join(RESEARCH_DIR, filename);
    
    fs.writeFileSync(filepath, report.markdown);
    console.log(`💾 Report saved: ${filepath}`);
  }
}

module.exports = DeepResearchMode;
