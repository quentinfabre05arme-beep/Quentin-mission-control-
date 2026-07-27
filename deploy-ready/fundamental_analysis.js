/**
 * FUNDAMENTAL ANALYSIS MODULE
 * Fetches company financials, news, and key metrics
 * Sources: Yahoo Finance (unofficial), Finnhub (free tier), NewsAPI
 */

const https = require('https');

// Finnhub free API (60 calls/minute)
const FINNHUB_KEY = 'demo'; // Replace with actual key if available

// Yahoo Finance endpoint
async function fetchYahooFinance(symbol) {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics,financialData,calendarEvents`;
  
  return new Promise((resolve, reject) => {
    https.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.quoteSummary?.result?.[0] || {});
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Fetch news for sentiment
async function fetchNews(symbol) {
  const query = symbol === 'BTC' || symbol === 'ETH' ? `${symbol} cryptocurrency` : `${symbol} stock`;
  // Using Serper for news
  return {
    status: 'manual_fetch_required',
    note: 'Use Serper.dev API or manual news search',
    query: query
  };
}

// Get comprehensive fundamental data
async function analyzeFundamentals(symbol) {
  console.log(`\n📈 Fundamental Analysis: ${symbol}`);
  
  try {
    const data = await fetchYahooFinance(symbol);
    
    const summary = data.summaryDetail || {};
    const stats = data.defaultKeyStatistics || {};
    const financials = data.financialData || {};
    
    return {
      symbol,
      timestamp: new Date().toISOString(),
      
      // Valuation Metrics
      valuation: {
        marketCap: formatCurrency(summary.marketCap),
        peRatio: summary.trailingPE?.toFixed(2) || 'N/A',
        forwardPE: summary.forwardPE?.toFixed(2) || 'N/A',
        pegRatio: summary.pegRatio?.toFixed(2) || 'N/A',
        priceToBook: summary.priceToBook?.toFixed(2) || 'N/A',
        priceToSales: summary.priceToSalesTrailing12Months?.toFixed(2) || 'N/A',
        enterpriseValue: formatCurrency(summary.enterpriseValue)
      },
      
      // Profitability
      profitability: {
        profitMargin: formatPercent(summary.profitMargins),
        revenueGrowth: formatPercent(financials.revenueGrowth),
        earningsGrowth: formatPercent(financials.earningsGrowth),
        returnOnEquity: formatPercent(stats.returnOnEquity),
        returnOnAssets: formatPercent(stats.returnOnAssets)
      },
      
      // Financial Health
      health: {
        currentRatio: financials.currentRatio?.toFixed(2) || 'N/A',
        debtToEquity: financials.debtToEquityRatio?.toFixed(2) || 'N/A',
        quickRatio: financials.quickRatio?.toFixed(2) || 'N/A',
        totalCash: formatCurrency(financials.totalCash),
        totalDebt: formatCurrency(financials.totalDebt)
      },
      
      // Dividend
      dividend: {
        yield: formatPercent(summary.dividendYield),
        rate: summary.dividendRate || 'N/A',
        exDate: summary.exDividendDate ? new Date(summary.exDividendDate * 1000).toLocaleDateString() : 'N/A'
      },
      
      // Trading Info
      trading: {
        beta: summary.beta?.toFixed(2) || 'N/A',
        avgVolume: formatNumber(summary.averageVolume),
        avgVolume10Day: formatNumber(summary.averageVolume10days),
        fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh?.toFixed(2) || 'N/A',
        fiftyTwoWeekLow: summary.fiftyTwoWeekLow?.toFixed(2) || 'N/A',
        targetPrice: financials.targetMeanPrice?.toFixed(2) || 'N/A'
      },
      
      // Key Events
      events: {
        earningsDate: data.calendarEvents?.earnings?.earningsDate?.[0] 
          ? new Date(data.calendarEvents.earnings.earningsDate[0] * 1000).toLocaleDateString() 
          : 'N/A'
      }
    };
    
  } catch (e) {
    return {
      symbol,
      error: e.message,
      note: 'Yahoo Finance data may require authentication or different endpoint'
    };
  }
}

// Helper formatters
function formatCurrency(value) {
  if (!value) return 'N/A';
  if (value >= 1e12) return `$${(value/1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value/1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value/1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

function formatNumber(value) {
  if (!value) return 'N/A';
  if (value >= 1e9) return `${(value/1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value/1e6).toFixed(2)}M`;
  return value.toLocaleString();
}

function formatPercent(value) {
  if (!value) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

// Format output
function formatFundamentals(data) {
  if (data.error) {
    console.log(`\n❌ Error: ${data.error}`);
    return;
  }
  
  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║  FUNDAMENTAL ANALYSIS: ${data.symbol.padEnd(11)} ║`);
  console.log(`╚════════════════════════════════════════════╝`);
  
  console.log(`\n💰 VALUATION:`);
  console.log(`   Market Cap: ${data.valuation.marketCap}`);
  console.log(`   P/E Ratio: ${data.valuation.peRatio}`);
  console.log(`   Forward P/E: ${data.valuation.forwardPE}`);
  console.log(`   PEG Ratio: ${data.valuation.pegRatio}`);
  console.log(`   Price/Book: ${data.valuation.priceToBook}`);
  
  console.log(`\n📈 PROFITABILITY:`);
  console.log(`   Profit Margin: ${data.profitability.profitMargin}`);
  console.log(`   Revenue Growth: ${data.profitability.revenueGrowth}`);
  console.log(`   ROE: ${data.profitability.returnOnEquity}`);
  console.log(`   ROA: ${data.profitability.returnOnAssets}`);
  
  console.log(`\n🏦 FINANCIAL HEALTH:`);
  console.log(`   Current Ratio: ${data.health.currentRatio}`);
  console.log(`   Debt/Equity: ${data.health.debtToEquity}`);
  console.log(`   Cash: ${data.health.totalCash}`);
  console.log(`   Debt: ${data.health.totalDebt}`);
  
  console.log(`\n📊 TRADING METRICS:`);
  console.log(`   Beta: ${data.trading.beta}`);
  console.log(`   52W Range: $${data.trading.fiftyTwoWeekLow} - $${data.trading.fiftyTwoWeekHigh}`);
  console.log(`   Target Price: $${data.trading.targetPrice}`);
  
  console.log(`\n📅 KEY DATES:`);
  console.log(`   Earnings: ${data.events.earningsDate}`);
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const symbol = args[0]?.toUpperCase() || 'MSTR';
  const format = args.includes('--json') ? 'json' : 'text';
  
  try {
    const data = await analyzeFundamentals(symbol);
    
    if (format === 'json') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      formatFundamentals(data);
    }
  } catch (e) {
    console.error(`❌ Analysis failed: ${e.message}`);
  }
}

module.exports = { analyzeFundamentals, formatFundamentals };

if (require.main === module) main();
