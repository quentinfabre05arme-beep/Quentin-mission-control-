/**
 * PROJECT CLAW CORE — Speech Agent
 * Text-to-speech using Windows System.Speech.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'speech_agent.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function speak(text, options = {}) {
  log(`Speaking: ${text.slice(0, 100)}`);
  const rate = options.rate || 0; // -10 to 10
  const volume = options.volume || 100; // 0 to 100
  
  const ps = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = ${rate}
$synth.Volume = ${volume}
$synth.Speak('${text.replace(/'/g, "''")}')
`;
  
  try {
    execSync(`powershell -c "${ps}"`, { windowsHide: true, timeout: 30000 });
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

function speakToFile(text, outputPath, options = {}) {
  const file = outputPath || path.join(__dirname, '..', 'logs', `speech_${Date.now()}.wav`);
  log(`Saving speech to: ${file}`);
  const rate = options.rate || 0;
  const volume = options.volume || 100;
  
  const ps = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = ${rate}
$synth.Volume = ${volume}
$stream = New-Object System.Speech.Synthesis.SpeechFileStream('${file.replace(/'/g, "''")}', [System.Speech.Synthesis.SynthesisMediaType]::Wave)
$synth.SetOutputToWaveStream($stream)
$synth.Speak('${text.replace(/'/g, "''")}')
$stream.Close()
`;
  
  try {
    execSync(`powershell -c "${ps}"`, { windowsHide: true, timeout: 30000 });
    return { success: true, path: file };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

class SpeechAgent {
  say(text, options) {
    return speak(text, options);
  }
  save(text, outputPath, options) {
    return speakToFile(text, outputPath, options);
  }
}

module.exports = { SpeechAgent, speak, speakToFile };

if (require.main === module) {
  const text = process.argv[2] || 'Claw is operational';
  speak(text);
}
