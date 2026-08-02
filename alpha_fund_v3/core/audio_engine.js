#!/usr/bin/env node
/**
 * 🎵 AUDIO ENGINE v1.0
 * TTS, WAV output, Windows System.Speech
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const AUDIO_DIR = path.join(__dirname, '..', 'audio');

// ─── TTS (Text to Speech) ─────────────────────────────────
function speak(text) {
  try {
    execSync(
      `powershell -c "Add-Type -AssemblyName System.Speech; ` +
      `$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; ` +
      `$synth.Speak('${text.replace(/'/g, "''")}')"`,
      { timeout: 30000, windowsHide: true }
    );
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── SAVE TTS TO WAV ──────────────────────────────────────
function textToWav(text, filename = null) {
  const fp = filename || path.join(AUDIO_DIR, `tts_${Date.now()}.wav`);
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  
  try {
    execSync(
      `powershell -c "Add-Type -AssemblyName System.Speech; ` +
      `$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; ` +
      `$synth.SetOutputToWaveFile('${fp.replace(/\\/g, '\\\\')}'); ` +
      `$synth.Speak('${text.replace(/'/g, "''")}'); ` +
      `$synth.SetOutputToDefaultAudioDevice()"`,
      { timeout: 30000, windowsHide: true }
    );
    return { success: true, path: fp, size: fs.existsSync(fp) ? fs.statSync(fp).size : 0 };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { speak, textToWav };

// ─── TEST ─────────────────────────────────────────────────
if (require.main === module) {
  console.log('🎵 Audio Engine v1.0');
  console.log('');
  
  console.log('Testing TTS...');
  const result = speak('Audio engine operational. Phase 2 building.');
  console.log(result.success ? '✅ TTS working' : '❌ ' + result.error);
  
  console.log('');
  console.log('Testing WAV output...');
  const wav = textToWav('Test audio file', path.join(AUDIO_DIR, 'test.wav'));
  console.log(wav.success ? `✅ WAV saved: ${wav.size} bytes` : '❌ ' + wav.error);
  
  console.log('');
  console.log('Audio engine ready');
}
