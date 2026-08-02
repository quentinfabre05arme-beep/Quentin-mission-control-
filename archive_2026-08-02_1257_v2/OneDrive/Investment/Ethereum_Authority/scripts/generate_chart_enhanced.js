const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateEnhancedChart() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1200, height: 675 });
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .chart-container {
      width: 1200px;
      height: 675px;
      background: linear-gradient(145deg, #111318 0%, #1a1d28 100%);
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 100px rgba(0,255,136,0.03);
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    .chart-container::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0,255,136,0.3), transparent);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
    }
    .title-section h1 {
      color: #fff;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .price-card {
      background: linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(0,255,136,0.02) 100%);
      border: 1px solid rgba(0,255,136,0.2);
      border-radius: 12px;
      padding: 20px 30px;
      text-align: right;
    }
    .price-label {
      color: #6b7280;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .price-value {
      color: #00ff88;
      font-size: 36px;
      font-weight: 700;
      text-shadow: 0 0 30px rgba(0,255,136,0.3);
    }
    .price-change {
      color: #00ff88;
      font-size: 16px;
      margin-top: 4px;
    }
    .content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .section {
      background: rgba(255,255,255,0.02);
      border-radius: 12px;
      padding: 24px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .resistance .section-title { color: #ff4757; }
    .support .section-title { color: #00ff88; }
    .level {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      margin-bottom: 12px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      border-left: 4px solid;
      transition: transform 0.2s;
    }
    .level:hover { transform: translateX(5px); }
    .resistance .level { border-left-color: #ff4757; }
    .support .level { border-left-color: #00ff88; }
    .level-price {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
    }
    .level-label {
      font-size: 13px;
      color: #6b7280;
      margin-top: 2px;
    }
    .level-desc {
      font-size: 13px;
      color: #9ca3af;
      text-align: right;
    }
    .footer {
      position: absolute;
      bottom: 30px;
      left: 40px;
      right: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .footer-left {
      display: flex;
      gap: 30px;
    }
    .stat {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 14px;
      color: #9ca3af;
      font-weight: 500;
    }
    .footer-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #00ff88, #00c853);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0a0a0f;
      font-weight: 700;
      font-size: 18px;
    }
    .brand {
      color: #fff;
      font-size: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="chart-container">
    <div class="header">
      <div class="title-section">
        <h1>ETH Technical Levels</h1>
        <div class="subtitle">July 23, 2026</div>
      </div>
      <div class="price-card">
        <div class="price-label">Current Price</div>
        <div class="price-value">$1,928.39</div>
        <div class="price-change">+0.28% today</div>
      </div>
    </div>
    
    <div class="content">
      <div class="section resistance">
        <div class="section-title">
          <span>🔴</span> Resistance Levels
        </div>
        <div class="level">
          <div>
            <div class="level-price">$2,200</div>
            <div class="level-label">R3 — Breakout Target</div>
          </div>
          <div class="level-desc">Major resistance</div>
        </div>
        <div class="level">
          <div>
            <div class="level-price">$2,100</div>
            <div class="level-label">R2 — June Highs</div>
          </div>
          <div class="level-desc">Recent rejection</div>
        </div>
        <div class="level">
          <div>
            <div class="level-price">$2,000</div>
            <div class="level-label">R1 — Psychological</div>
          </div>
          <div class="level-desc">Key round number</div>
        </div>
      </div>
      
      <div class="section support">
        <div class="section-title">
          <span>🟢</span> Support Levels
        </div>
        <div class="level">
          <div>
            <div class="level-price">$1,850</div>
            <div class="level-label">S1 — Swing Low</div>
          </div>
          <div class="level-desc">First support</div>
        </div>
        <div class="level">
          <div>
            <div class="level-price">$1,800</div>
            <div class="level-label">S2 — 200 EMA</div>
          </div>
          <div class="level-desc">Must hold</div>
        </div>
        <div class="level">
          <div>
            <div class="level-price">$1,750</div>
            <div class="level-label">S3 — Structural</div>
          </div>
          <div class="level-desc">Major support</div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-left">
        <div class="stat">
          <div class="stat-label">Gas</div>
          <div class="stat-value">15 Gwei</div>
        </div>
        <div class="stat">
          <div class="stat-label">Staked</div>
          <div class="stat-value">27.65%</div>
        </div>
        <div class="stat">
          <div class="stat-label">Exchange Balance</div>
          <div class="stat-value">18M ETH</div>
        </div>
      </div>
      <div class="footer-right">
        <div class="logo">Ξ</div>
        <div class="brand">Ethereum Authority</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  const outputPath = path.join(__dirname, '../../content_pipeline/x_posts/2026-07-23/chart_14pm_enhanced.png');
  await page.screenshot({
    path: outputPath,
    fullPage: false,
    clip: { x: 0, y: 0, width: 1200, height: 675 }
  });
  
  console.log('✅ Enhanced chart saved:', outputPath);
  await browser.close();
}

generateEnhancedChart().catch(console.error);
