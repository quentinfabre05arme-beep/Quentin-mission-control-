/**
 * Mission Control v11.0 PRO - Live Dashboard JavaScript
 * Real-time data fetching, charts, and interactivity
 */

// Configuration
const CONFIG = {
    refreshInterval: 30000,
    priceCacheTime: 120000,
    compactMode: false,
    apiEndpoints: {
        prices: '/api/prices',
        portfolio: '/api/portfolio',
        signals: '/api/signals'
    }
};

// State
let priceData = {};
let portfolioData = {};
let lastUpdate = null;
let isCompactMode = localStorage.getItem('compact_mode') === 'true';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initKeyboardShortcuts();
    applyCompactMode();
    startAutoRefresh();
});

function initDashboard() {
    updateTimestamp();
    loadFromCache();
    fetchLiveData();
    initCharts();
}

// ==================== KEYBOARD SHORTCUTS ====================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        const key = e.key.toLowerCase();
        
        switch(key) {
            case 'r':
                e.preventDefault();
                refreshData();
                break;
            case 'c':
                e.preventDefault();
                toggleCompactMode();
                break;
            case 's':
                e.preventDefault();
                window.location.href = 'settings.html';
                break;
            case '1':
                e.preventDefault();
                window.location.href = 'index.html';
                break;
            case '2':
                e.preventDefault();
                window.location.href = 'trading.html';
                break;
            case '3':
                e.preventDefault();
                window.location.href = 'markets.html';
                break;
            case '4':
                e.preventDefault();
                window.location.href = 'systems.html';
                break;
            case '5':
                e.preventDefault();
                window.location.href = 'missions.html';
                break;
            case '6':
                e.preventDefault();
                window.location.href = 'analytics.html';
                break;
        }
    });
}

// ==================== COMPACT MODE ====================

function toggleCompactMode() {
    isCompactMode = !isCompactMode;
    localStorage.setItem('compact_mode', isCompactMode);
    applyCompactMode();
    
    // Update button state
    const btn = document.querySelector('.header-btn[onclick*="toggleCompactMode"]');
    if (btn) {
        btn.classList.toggle('active', isCompactMode);
    }
}

function applyCompactMode() {
    document.body.classList.toggle('compact-mode', isCompactMode);
}

// ==================== REFRESH ====================

function refreshData() {
    fetchLiveData();
    showNotification('Data Refreshed', 'Live data updated from sources', 'success');
}

// ==================== DATA FETCHING ====================

async function fetchLiveData() {
    try {
        // Try to fetch from local market_data.json first
        const response = await fetch('market_data.json');
        if (response.ok) {
            const data = await response.json();
            updatePrices(data);
            updateLastFetch();
        }
    } catch (error) {
        console.log('Using static data (market_data.json not available)');
    }
}

function updatePrices(data) {
    if (!data.assets) return;
    
    priceData = data.assets;
    
    // Update price displays
    Object.keys(data.assets).forEach(symbol => {
        const asset = data.assets[symbol];
        updatePriceDisplay(symbol, asset);
    });
    
    // Update market table if exists
    updateMarketTable(data.assets);
}

function updatePriceDisplay(symbol, asset) {
    const elements = document.querySelectorAll(`[data-symbol="${symbol}"]`);
    elements.forEach(el => {
        const priceEl = el.querySelector('.price-value');
        const changeEl = el.querySelector('.price-change');
        
        if (priceEl) {
            priceEl.textContent = formatCurrency(asset.price);
            priceEl.classList.remove('positive', 'negative');
            priceEl.classList.add(asset.change_24h >= 0 ? 'positive' : 'negative');
        }
        
        if (changeEl) {
            const arrow = asset.change_24h >= 0 ? '▲' : '▼';
            changeEl.textContent = `${arrow} ${Math.abs(asset.change_24h).toFixed(2)}%`;
            changeEl.classList.remove('positive', 'negative');
            changeEl.classList.add(asset.change_24h >= 0 ? 'positive' : 'negative');
        }
    });
}

function updateMarketTable(assets) {
    const tableBody = document.getElementById('market-table-body');
    if (!tableBody) return;
    
    const symbols = ['BTC', 'ETH', 'MSTR', 'HIMS'];
    let html = '';
    
    symbols.forEach(symbol => {
        const asset = assets[symbol];
        if (!asset) return;
        
        const changeClass = asset.change_24h >= 0 ? 'positive' : 'negative';
        const arrow = asset.change_24h >= 0 ? '▲' : '▼';
        const signal = getSignalForAsset(symbol, asset);
        
        html += `
            <tr>
                <td><strong>${symbol}</strong> <span style="color: var(--text-muted);">${asset.name}</span></td>
                <td class="mono">${formatCurrency(asset.price)}</td>
                <td class="mono ${changeClass}">${arrow} ${Math.abs(asset.change_24h).toFixed(2)}%</td>
                <td>${getSignalBadge(signal)}</td>
                <td class="mono">${asset.rsi || '--'}</td>
                <td>${asset.trend || 'Neutral'}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function getSignalForAsset(symbol, asset) {
    // Simple signal logic based on RSI
    const rsi = asset.rsi || 50;
    if (rsi < 30) return 'STRONG_BUY';
    if (rsi < 45) return 'WEAK_BUY';
    if (rsi > 70) return 'STRONG_SELL';
    if (rsi > 55) return 'WEAK_SELL';
    return 'NEUTRAL';
}

function getSignalBadge(signal) {
    const badges = {
        'STRONG_BUY': '<span class="badge badge-success">STRONG BUY</span>',
        'WEAK_BUY': '<span class="badge badge-warning">WEAK BUY</span>',
        'NEUTRAL': '<span class="badge badge-info">NEUTRAL</span>',
        'WEAK_SELL': '<span class="badge badge-warning">WEAK SELL</span>',
        'STRONG_SELL': '<span class="badge badge-danger">STRONG SELL</span>'
    };
    return badges[signal] || badges['NEUTRAL'];
}

// ==================== PORTFOLIO ====================

function updatePortfolio(data) {
    portfolioData = data;
    
    // Update portfolio metrics
    const equityEl = document.getElementById('portfolio-equity');
    const pnlEl = document.getElementById('portfolio-pnl');
    const cashEl = document.getElementById('portfolio-cash');
    
    if (equityEl) equityEl.textContent = formatCurrency(data.equity);
    if (pnlEl) {
        pnlEl.textContent = formatCurrency(data.total_pnl);
        pnlEl.classList.remove('positive', 'negative');
        pnlEl.classList.add(data.total_pnl >= 0 ? 'positive' : 'negative');
    }
    if (cashEl) cashEl.textContent = formatCurrency(data.cash);
}

// ==================== CHARTS ====================

function initCharts() {
    // Simple sparkline charts using CSS/SVG
    createSparklines();
}

function createSparklines() {
    const sparklines = document.querySelectorAll('.sparkline');
    sparklines.forEach(el => {
        const data = generateMockSparklineData();
        el.innerHTML = renderSparkline(data);
    });
}

function generateMockSparklineData() {
    // Generate random walk data for demo
    const data = [];
    let value = 100;
    for (let i = 0; i < 20; i++) {
        value += (Math.random() - 0.5) * 10;
        data.push(value);
    }
    return data;
}

function renderSparkline(data) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');
    
    const isPositive = data[data.length - 1] >= data[0];
    const color = isPositive ? 'var(--accent-bull)' : 'var(--accent-bear)';
    
    return `
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 40px;">
            <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/>
            <circle cx="100" cy="${100 - ((data[data.length - 1] - min) / range) * 100}" r="3" fill="${color}"/>
        </svg>
    `;
}

// ==================== UTILITIES ====================

function formatCurrency(value) {
    if (value === undefined || value === null) return '--';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatNumber(value, decimals = 0) {
    if (value === undefined || value === null) return '--';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

function updateTimestamp() {
    const el = document.getElementById('timestamp');
    if (el) {
        const now = new Date();
        el.textContent = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    }
}

function updateLastFetch() {
    lastUpdate = new Date();
    const el = document.getElementById('last-fetch');
    if (el) {
        el.textContent = 'Just now';
    }
}

function startAutoRefresh() {
    // Update timestamp every second
    setInterval(updateTimestamp, 1000);
    
    // Fetch data every 30 seconds
    setInterval(fetchLiveData, CONFIG.refreshInterval);
}

// ==================== CACHE ====================

function saveToCache() {
    const data = {
        prices: priceData,
        portfolio: portfolioData,
        timestamp: Date.now()
    };
    localStorage.setItem('mission_control_data', JSON.stringify(data));
}

function loadFromCache() {
    try {
        const cached = localStorage.getItem('mission_control_data');
        if (cached) {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < CONFIG.priceCacheTime) {
                if (data.prices) updatePrices({ assets: data.prices });
                if (data.portfolio) updatePortfolio(data.portfolio);
            }
        }
    } catch (e) {
        console.log('Cache load failed');
    }
}

// ==================== NOTIFICATIONS ====================

function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Export for global access
window.MissionControl = {
    refresh: fetchLiveData,
    getPrices: () => priceData,
    getPortfolio: () => portfolioData,
    toggleCompact: toggleCompactMode
};

// ==================== SEARCH (Cmd+K) ====================

function initSearch() {
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            showSearchModal();
        }
    });
}

function showSearchModal() {
    const existing = document.getElementById('search-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'search-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8); z-index: 10000;
        display: flex; align-items: flex-start; justify-content: center;
        padding-top: 100px;
    `;
    
    modal.innerHTML = `
        <div style="width: 500px; background: #13161c; border: 1px solid #1e2128; border-radius: 12px; overflow: hidden;">
            <div style="padding: 16px 20px; border-bottom: 1px solid #1e2128; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 1.2em;">🔍</span>
                <input type="text" placeholder="Search pages, assets, commands..." 
                    style="flex: 1; background: transparent; border: none; color: #f0f1f3; font-size: 1em; outline: none;"
                    id="search-input" autofocus>
                <span style="font-family: monospace; font-size: 0.75em; color: #5a6070; background: #1a1d23; padding: 4px 8px; border-radius: 4px;">ESC</span>
            </div>
            <div id="search-results" style="max-height: 300px; overflow-y: auto;">
                <div style="padding: 16px 20px; color: #5a6070; font-size: 0.9em;">Type to search...</div>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.remove();
    }, { once: true });
    
    document.body.appendChild(modal);
    
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    
    const commands = [
        { name: 'Dashboard', url: 'index.html', icon: '📊', key: '1' },
        { name: 'Trading', url: 'trading.html', icon: '💰', key: '2' },
        { name: 'Markets', url: 'markets.html', icon: '📈', key: '3' },
        { name: 'Systems', url: 'systems.html', icon: '⚙️', key: '4' },
        { name: 'Missions', url: 'missions.html', icon: '🎯', key: '5' },
        { name: 'Analytics', url: 'analytics.html', icon: '📊', key: '6' },
        { name: 'Settings', url: 'settings.html', icon: '⚙️', key: 's' },
        { name: 'Refresh Data', action: () => { fetchLiveData(); modal.remove(); }, icon: '🔄', key: 'r' },
        { name: 'Toggle Compact', action: () => { toggleCompactMode(); modal.remove(); }, icon: '📊', key: 'c' },
    ];
    
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = commands.filter(c => c.name.toLowerCase().includes(query));
        
        results.innerHTML = filtered.map((c, i) => `
            <div class="search-item" data-index="${i}" style="padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px;"
                onmouseover="this.style.background='#1a1d23'" onmouseout="this.style.background='transparent'">
                <span style="font-size: 1.2em;">${c.icon}</span>
                <span style="flex: 1; color: #f0f1f3;">${c.name}</span>
                <span style="font-family: monospace; font-size: 0.75em; color: #5a6070;">${c.key}</span>
            </div>
        `).join('') || '<div style="padding: 16px 20px; color: #5a6070;">No results</div>';
        
        results.querySelectorAll('.search-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.index);
                const cmd = filtered[idx];
                if (cmd.url) window.location.href = cmd.url;
                if (cmd.action) cmd.action();
            });
        });
    });
    
    input.focus();
}

// Initialize search
document.addEventListener('DOMContentLoaded', () => {
    initSearch();
});