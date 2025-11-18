// Simple script to generate a beep sound as base64
// Run with: node generate-beep.js

const fs = require('fs');

// WAV file header for 440Hz beep, 0.3 seconds, mono, 44100 sample rate
function generateBeepWAV() {
  const sampleRate = 44100;
  const duration = 0.3; // seconds
  const frequency = 600; // Hz (higher pitch beep)
  const numSamples = Math.floor(sampleRate * duration);

  // WAV header (44 bytes)
  const header = Buffer.alloc(44);

  // "RIFF" chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + numSamples * 2, 4); // file size - 8
  header.write('WAVE', 8);

  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // subchunk size
  header.writeUInt16LE(1, 20); // audio format (1 = PCM)
  header.writeUInt16LE(1, 22); // num channels (1 = mono)
  header.writeUInt32LE(sampleRate, 24); // sample rate
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample

  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(numSamples * 2, 40); // data size

  // Generate sine wave samples
  const samples = Buffer.alloc(numSamples * 2);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t);
    // Apply envelope (fade in/out to avoid clicks)
    const envelope = Math.min(i / (sampleRate * 0.01), 1) *
                     Math.min((numSamples - i) / (sampleRate * 0.01), 1);
    const value = Math.floor(sample * envelope * 32767);
    samples.writeInt16LE(value, i * 2);
  }

  return Buffer.concat([header, samples]);
}

const beepBuffer = generateBeepWAV();
const base64 = beepBuffer.toString('base64');

console.log('Base64 WAV (first 100 chars):', base64.substring(0, 100));
console.log('Full length:', base64.length);

// Save to file
fs.writeFileSync('./src/assets/sounds/beep.wav', beepBuffer);
console.log('Saved to ./src/assets/sounds/beep.wav');

// Also save base64 version
fs.writeFileSync('./src/assets/sounds/beep-base64.txt', base64);
console.log('Saved base64 to ./src/assets/sounds/beep-base64.txt');
