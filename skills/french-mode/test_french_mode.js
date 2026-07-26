#!/usr/bin/env node
// Test suite for French Mode

const { processInput, isFrench, detectDomain, formatResponse, getTerminology } = require('./french_mode');
const fs = require('fs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'Assertion failed'}: expected "${expected}", got "${actual}"`);
  }
}

function assertTrue(actual, msg) {
  if (!actual) {
    throw new Error(`${msg || 'Assertion failed'}: expected true, got "${actual}"`);
  }
}

console.log('🧪 French Mode - Test Suite\n');

// === Language Detection Tests ===
console.log('--- Language Detection ---');

test('Detect simple French greeting', () => {
  assertTrue(isFrench('Bonjour, comment ça va ?'), 'Should detect French greeting');
});

test('Detect French accounting term', () => {
  assertTrue(isFrench('Quel est le bilan de cette entreprise ?'), 'Should detect "bilan"');
});

test('Detect DSCG keyword', () => {
  assertTrue(isFrench('Explique-moi le BFR et le FRNG'), 'Should detect DSCG terms');
});

test('English text not detected as French', () => {
  const result = isFrench('What is the balance sheet of this company?');
  assertEqual(result, false, 'English should not be detected as French');
});

test('Mixed French-English text', () => {
  assertTrue(isFrench('Le break-even point ou seuil de rentabilité'), 'Should detect French words');
});

test('Short French phrase', () => {
  assertTrue(isFrench('comptabilité'), 'Single French keyword');
});

// === Domain Detection Tests ===
console.log('\n--- Domain Detection ---');

test('Detect D01 - Comptabilité', () => {
  const domain = detectDomain('Comment comptabiliser les immobilisations selon IAS 16 ?');
  assertEqual(domain, 'd01', 'Should detect D01');
});

test('Detect D02 - Contrôle de gestion', () => {
  const domain = detectDomain('Calcul du seuil de rentabilité et du point mort');
  assertEqual(domain, 'd02', 'Should detect D02');
});

test('Detect D05 - Finance', () => {
  const domain = detectDomain('Calculer la VAN et le TRI d\'un projet d\'investissement');
  assertEqual(domain, 'd05', 'Should detect D05');
});

test('Detect D06 - Droit & Fiscalité', () => {
  const domain = detectDomain('La fiscalité des sociétés SARL et SA');
  assertEqual(domain, 'd06', 'Should detect D06');
});

test('Detect D08 - DCF/Valorisation', () => {
  const domain = detectDomain('Méthode DCF et goodwill pour valoriser une entreprise');
  assertEqual(domain, 'd08', 'Should detect D08');
});

test('No domain for generic text', () => {
  const domain = detectDomain('Hello world');
  assertEqual(domain, null, 'No DSCG domain should be detected');
});

// === Process Input Tests ===
console.log('\n--- Process Input ---');

// Reset state before tests
const stateFile = require('path').join(__dirname, 'french_mode_state.json');
if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);

test('Auto-detect French input', () => {
  const result = processInput('Bonjour, explique le bilan fonctionnel');
  assertEqual(result.mode, 'fr', 'Should switch to French');
  assertTrue(result.detectedFrench, 'Should detect French');
  assertEqual(result.domain, 'd01', 'Should detect D01');
});

test('Auto-detect English input', () => {
  // Reset state
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  const result = processInput('What is the WACC formula?');
  assertEqual(result.mode, 'en', 'Should stay in English');
  assertEqual(result.detectedFrench, false, 'Should not detect French');
});

test('Explicit French command', () => {
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  const result = processInput('français');
  assertEqual(result.mode, 'fr', 'Should set French mode');
  assertEqual(result.switchReason, 'explicit_command', 'Should be explicit command');
});

test('Explicit English command', () => {
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  const result = processInput('english');
  assertEqual(result.mode, 'en', 'Should set English mode');
});

test('Explicit auto command', () => {
  const result = processInput('auto');
  assertEqual(result.mode, 'auto', 'Should set auto mode');
});

test('French mode persists', () => {
  // After "français" command, next input should stay French
  processInput('français');
  const result = processInput('Tell me about the balance sheet'); // English input but French mode
  assertEqual(result.mode, 'fr', 'Should stay in French mode');
});

test('English mode persists', () => {
  processInput('english');
  const result = processInput('Explique le bilan'); // French input but English mode
  assertEqual(result.mode, 'en', 'Should stay in English mode');
});

// === Terminology Tests ===
console.log('\n--- Terminology ---');

test('Get D01 terminology', () => {
  const terms = getTerminology('d01');
  assertTrue(terms.length > 0, 'Should return D01 terms');
  assertTrue(terms.some(t => t.includes('Bilan')), 'Should include Bilan');
});

test('Get D05 terminology', () => {
  const terms = getTerminology('d05');
  assertTrue(terms.some(t => t.includes('VAN')), 'Should include VAN');
  assertTrue(terms.some(t => t.includes('TRI')), 'Should include TRI');
});

// === Format Response Tests ===
console.log('\n--- Format Response ---');

test('French response format', () => {
  const analysis = {
    mode: 'fr',
    domain: 'd01',
    domainLabel: 'DSCG D01',
    terminology: ['Bilan', 'Compte de résultat']
  };
  const response = formatResponse(analysis, 'input');
  assertTrue(response.includes('Mode DSCG Français'), 'Should include French header');
  assertTrue(response.includes('DSCG D01'), 'Should include domain');
  assertTrue(response.includes('Bilan'), 'Should include terminology');
});

test('English response format', () => {
  const analysis = {
    mode: 'en',
    domain: 'd05',
    domainLabel: 'DSCG D05',
    terminology: ['NPV', 'IRR']
  };
  const response = formatResponse(analysis, 'input');
  assertTrue(response.includes('English DSCG Mode'), 'Should include English header');
  assertTrue(response.includes('DSCG D05'), 'Should include domain');
});

// === Edge Cases ===
console.log('\n--- Edge Cases ---');

test('Empty string', () => {
  const result = processInput('');
  assertEqual(result.mode, 'en', 'Empty string defaults to English');
});

test('Single character', () => {
  const result = processInput('a');
  assertEqual(result.mode, 'en', 'Single char defaults to English');
});

test('French input overrides English mode with auto', () => {
  // First set auto mode, then provide French input
  processInput('auto');
  const result = processInput('préparation DSCG comptabilité');
  assertEqual(result.mode, 'fr', 'Auto mode + French input = French');
});

test('Punctuation and special chars', () => {
  assertTrue(isFrench('L\'amortissement, c\'est quoi ?'), 'Should handle punctuation');
});

test('Case insensitive', () => {
  assertTrue(isFrench('COMPTABILITÉ'), 'Should be case insensitive');
});

test('Accented characters', () => {
  assertTrue(isFrench('comptabilité'), 'Should handle accents');
  assertTrue(isFrench('trésorerie'), 'Should handle é');
  assertTrue(isFrench('bilan'), 'Should handle standard chars');
});

// === JSON Output Test ===
console.log('\n--- JSON Output ---');

test('JSON structure valid', () => {
  const result = processInput('Bilan et compte de résultat');
  assertTrue(result.mode !== undefined, 'Should have mode');
  assertTrue(result.detectedFrench !== undefined, 'Should have detectedFrench');
  assertTrue(result.domain !== undefined, 'Should have domain');
});

// Cleanup
if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);

// Summary
console.log('\n' + '='.repeat(40));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(40));

if (failed > 0) {
  process.exit(1);
}
