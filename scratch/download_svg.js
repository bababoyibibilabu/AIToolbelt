import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f439.svg';
const targetFile = path.resolve(__dirname, 'hamster.svg');

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    fs.writeFileSync(targetFile, data);
    console.log('SVG downloaded successfully to', targetFile);
    console.log('File size:', data.length, 'bytes');
  });
}).on('error', (err) => {
  console.error('Error downloading SVG:', err);
});
