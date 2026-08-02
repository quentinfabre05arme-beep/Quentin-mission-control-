#!/usr/bin/env node
/**
 * 📦 PACKAGE INSTALLER
 * Auto-install missing tools via winget/npm/pip
 */

const { execSync } = require('child_process');
const fs = require('fs');

// ─── CHECK TOOL ───────────────────────────────────────────
function hasTool(name) {
  try {
    execSync(`where ${name}`, { timeout: 5000, windowsHide: true });
    return true;
  } catch(e) {
    return false;
  }
}

// ─── INSTALL VIA WINGET ───────────────────────────────────
function wingetInstall(packageName, id = null) {
  try {
    const pkgId = id || packageName;
    execSync(
      `winget install --id ${pkgId} --silent --accept-package-agreements --accept-source-agreements`,
      { timeout: 120000, windowsHide: true }
    );
    return { success: true, method: 'winget' };
  } catch(e) {
    return { error: e.message, method: 'winget' };
  }
}

// ─── INSTALL VIA NPM ────────────────────────────────────────
function npmInstall(packageName, global = false) {
  try {
    const flag = global ? '-g' : '';
    execSync(
      `npm install ${flag} ${packageName}`,
      { timeout: 120000, windowsHide: true }
    );
    return { success: true, method: 'npm' };
  } catch(e) {
    return { error: e.message, method: 'npm' };
  }
}

// ─── INSTALL VIA PIP ──────────────────────────────────────
function pipInstall(packageName) {
  try {
    execSync(
      `pip install ${packageName} --user`,
      { timeout: 120000, windowsHide: true }
    );
    return { success: true, method: 'pip' };
  } catch(e) {
    return { error: e.message, method: 'pip' };
  }
}

// ─── ENSURE TOOL ──────────────────────────────────────────
function ensure(name, options) {
  if (hasTool(name)) {
    return { success: true, alreadyInstalled: true };
  }
  
  if (options.winget) {
    const result = wingetInstall(options.winget);
    if (result.success) return result;
  }
  
  if (options.npm) {
    const result = npmInstall(options.npm, options.global);
    if (result.success) return result;
  }
  
  if (options.pip) {
    const result = pipInstall(options.pip);
    if (result.success) return result;
  }
  
  return { error: 'Could not install', attempted: options };
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { hasTool, wingetInstall, npmInstall, pipInstall, ensure };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('📦 Package Installer');
  console.log('');
  
  const tools = [
    { name: 'node', options: {} },
    { name: 'python', options: {} },
    { name: 'git', options: {} },
    { name: 'winget', options: {} },
    { name: 'curl', options: { winget: 'curl.curl' } },
    { name: 'ffmpeg', options: { winget: 'Gyan.FFmpeg' } },
  ];
  
  tools.forEach(t => {
    const installed = hasTool(t.name);
    console.log(`${t.name}: ${installed ? '✅' : '❌'}`);
  });
  
  console.log('');
  console.log('Package installer ready');
}
