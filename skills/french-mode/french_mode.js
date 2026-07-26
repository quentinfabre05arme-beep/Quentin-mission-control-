#!/usr/bin/env node
// French Mode - DSCG Preparation Language Switcher
// Detects French input, switches language, tracks DSCG topics

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'french_mode_state.json');

// French detection patterns
const FRENCH_KEYWORDS = [
  'bonjour', 'salut', 'merci', 'bonsoir', 'comment', 'pourquoi',
  'qu\'est-ce', 'combien', 'comment', 'que', 'qui', 'quoi',
  'oui', 'non', 'd\'accord', 'voilà', 'alors', 'donc',
  'comptabilité', 'comptable', 'bilan', 'résultat', 'amortissement',
  'gestion', 'contrôle', 'financier', 'finance', 'trésorerie',
  'seuil', 'rentabilité', 'point mort', 'coût', 'marge',
  'immobilisation', 'créance', 'dette', 'capitaux', 'propre',
  'van', 'tri', 'cmpc', 'per', 'opa', 'ope',
  'sig', 'caf', 'bfr', 'frng', 'tableau', 'bord',
  'audit', 'norme', 'ifrs', 'ias', 'fiscal',
  'dscg', 'dcg', 'expertise', 'expert'
];

const DSCG_KEYWORDS = {
  d01: ['comptabilité', 'comptable', 'bilan', 'résultat', 'ifrs', 'ias', 'norme', 'amortissement', 'dotation', 'provision', 'immobilisation', 'créance', 'dette', 'passif', 'actif', 'annexe', 'consolidation', 'fusion', 'bilan fonctionnel', 'bilan financier', 'france', 'ohada'],
  d02: ['contrôle de gestion', 'budget', 'seuil de rentabilité', 'point mort', 'coût', 'marge', 'tableau de bord', 'indicateur', 'performance', 'prévision', 'variance', 'écart', 'abc', 'abm', 'target costing', 'coût cible', 'kaizen', 'lean'],
  d03: ['stratégie', 'management', 'organisation', 'swot', 'pestel', 'porter', 'matrice bcg', 'valeur', 'chaîne', 'mckinsey', 'leadership', 'motivation', 'culture', 'projet', 'tableau de bord'],
  d04: ['si', 'système d\'information', 'informatique', 'erp', 'crm', 'scm', 'bi', 'big data', 'ia', 'cloud', 'cybersécurité', 'rgpd', 'contrôle interne', 'risque', 'audit interne', 'coso', 'framework'],
  d05: ['finance', 'marché', 'taux', 'obligation', 'action', 'option', 'future', 'swap', 'forward', 'tri', 'van', 'cmpc', 'per', 'opcvm', 'sicav', 'fonds', 'hedge', 'private equity', 'venture capital'],
  d06: ['droit', 'société', 'sarl', 'sa', 'sas', 'holding', 'fiscal', 'impôt', 'tva', 'is', 'ir', 'réforme', 'loi', 'jurisprudence', 'fiscalité', 'optimisation', 'planning'],
  d07: ['rh', 'ressource humaine', 'recrutement', 'formation', 'grh', 'paie', 'médiation', 'conflit', 'négociation', 'accord', 'délégué', 'comité', 'chomage', 'emploi', 'contrat', 'cdd', 'cdi'],
  d08: ['dcf', 'discounted cash flow', 'goodwill', 'valeur', 'valorisation', 'fusion-acquisition', 'lbo', 'mbo', 'due diligence', 'audit financier', 'diagnostic financier']
};

// Load or create state
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return { mode: 'auto', lastInput: '', domain: null, sessionCount: 0 };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Detect if text is French
function isFrench(text) {
  const lower = text.toLowerCase();
  const frenchScore = FRENCH_KEYWORDS.filter(kw => lower.includes(kw)).length;
  const totalWords = lower.split(/\s+/).length;
  const ratio = frenchScore / totalWords;
  return ratio > 0.15 || frenchScore >= 2; // Threshold: 15% French words or at least 2 keywords
}

// Detect DSCG domain
function detectDomain(text) {
  const lower = text.toLowerCase();
  let bestDomain = null;
  let bestScore = 0;

  for (const [domain, keywords] of Object.entries(DSCG_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  return bestDomain;
}

// Process user input
function processInput(input) {
  const state = loadState();
  state.lastInput = input;
  state.sessionCount++;

  // Check for explicit language commands
  const lower = input.toLowerCase();
  if (/\bfrançais\b|\ben français\b/.test(lower)) {
    state.mode = 'fr';
    saveState(state);
    return {
      mode: 'fr',
      detectedFrench: true,
      domain: null,
      message: 'Mode français activé. Je réponds désormais en français pour les sujets DSCG.',
      switchReason: 'explicit_command'
    };
  }

  if (/\banglais\b|\benglish\b/.test(lower)) {
    state.mode = 'en';
    saveState(state);
    return {
      mode: 'en',
      detectedFrench: false,
      domain: null,
      message: 'English mode activated. I will respond in English for DSCG topics.',
      switchReason: 'explicit_command'
    };
  }

  if (/\bauto\b/.test(lower)) {
    state.mode = 'auto';
    saveState(state);
    return {
      mode: 'auto',
      detectedFrench: true,
      domain: null,
      message: 'Mode auto-détection activé. Je détecte automatiquement la langue.',
      switchReason: 'explicit_command'
    };
  }

  // Auto-detect or use current mode
  const detectedFrench = isFrench(input);
  const domain = detectDomain(input);
  state.domain = domain;

  if (state.mode === 'auto') {
    state.mode = detectedFrench ? 'fr' : 'en';
  }

  const currentMode = state.mode;
  saveState(state);

  // Build response context
  const domainLabel = domain ? `DSCG ${domain.toUpperCase()}` : null;
  const terminology = domain ? getTerminology(domain) : null;

  return {
    mode: currentMode,
    detectedFrench,
    domain,
    domainLabel,
    terminology,
    message: null, // No switch message when auto-detecting
    switchReason: currentMode === 'fr' && detectedFrench ? 'auto_detect' : null
  };
}

// Get key terminology for a domain
function getTerminology(domain) {
  const terms = {
    d01: ['Bilan (Balance sheet)', 'Compte de résultat (P&L)', 'Capitaux propres (Equity)', 'Immobilisations (Fixed assets)', 'Amortissements (Depreciation)', 'Dotations (Provisions)', 'IFRS/IAS'],
    d02: ['BFR (WCR)', 'FRNG (NWC)', 'Seuil de rentabilité (Break-even)', 'Marge sur coûts variables (Contribution margin)', 'SIG (Intermediate balances)', 'CAF (Cash flow)', 'Tableau de bord (Dashboard)'],
    d03: ['Swot', 'Pestel', 'Porter 5 forces', 'Matrice BCG', 'Chaîne de valeur (Value chain)', 'McKinsey 7S'],
    d04: ['ERP', 'CRM', 'RGPD (GDPR)', 'Contrôle interne (Internal control)', 'Coso framework', 'Cybersécurité'],
    d05: ['VAN (NPV)', 'TRI (IRR)', 'CMPC (WACC)', 'PER (P/E)', 'OPA/OPE (Takeover bids)', 'Options', 'Futures'],
    d06: ['SARL/SA/SAS', 'IS (Corporate tax)', 'TVA (VAT)', 'Fiscalité (Taxation)', 'Optimisation fiscale'],
    d07: ['GRH (HRM)', 'Recrutement', 'Formation', 'Paie (Payroll)', 'Médiation', 'Droit du travail'],
    d08: ['DCF', 'Goodwill', 'Valorisation (Valuation)', 'LBO/MBO', 'Due diligence', 'Audit financier']
  };
  return terms[domain] || null;
}

// Format response in French with DSCG context
function formatResponse(analysis, userInput) {
  const { mode, domain, domainLabel, terminology } = analysis;

  if (mode === 'fr') {
    let response = `🎯 **Mode DSCG Français**\n\n`;

    if (domainLabel) {
      response += `📚 **Domaine :** ${domainLabel}\n\n`;
    }

    if (terminology) {
      response += `📖 **Terminologie clé :**\n${terminology.map(t => `• ${t}`).join('\n')}\n\n`;
    }

    response += `💡 **Analyse :** Je suis prêt à répondre en français sur ce sujet.\n`;
    response += `Pose ta question précise (exercice, cours, méthode...) et je te donne une réponse structurée type DSCG.`;

    return response;
  } else {
    let response = `🎯 **English DSCG Mode**\n\n`;

    if (domainLabel) {
      response += `📚 **Domain:** ${domainLabel}\n\n`;
    }

    if (terminology) {
      response += `📖 **Key terminology:**\n${terminology.map(t => `• ${t}`).join('\n')}\n\n`;
    }

    response += `💡 **Analysis:** Ready to respond in English on this topic.\n`;
    response += `Ask your specific question (exercise, course material, method...) and I\'ll give you a structured DSCG-style answer.`;

    return response;
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    console.log('French Mode - DSCG Language Switcher');
    console.log('Usage: french_mode.js <text> [--json]');
    console.log('');
    console.log('Commands: "français", "fr", "anglais", "english", "auto"');
    console.log('Detects French keywords and DSCG topics automatically.');
    console.log('');
    console.log('Examples:');
    console.log('  french_mode.js "Bonjour"              # Auto-detect French');
    console.log('  french_mode.js "français"             # Force French mode');
    console.log('  french_mode.js "english"              # Force English mode');
    console.log('  french_mode.js "auto"                 # Reset to auto-detect');
    console.log('  french_mode.js "Le BFR ?" --json      # JSON output');
    process.exit(0);
  }

  const input = args.filter(a => a !== '--json').join(' ');
  const jsonOutput = args.includes('--json');

  const analysis = processInput(input);

  if (jsonOutput) {
    console.log(JSON.stringify(analysis, null, 2));
  } else {
    if (analysis.message) {
      console.log(analysis.message);
    } else {
      console.log(formatResponse(analysis, input));
    }
  }
}

module.exports = { processInput, isFrench, detectDomain, formatResponse, getTerminology };

// Run if called directly
if (require.main === module) {
  main();
}
