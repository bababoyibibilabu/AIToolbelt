import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f439.png';
const targetFile = path.resolve(__dirname, 'twemoji_hamster_72.png');

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed to download PNG. Status code:', res.statusCode);
    res.resume();
    return;
  }
  
  const fileStream = fs.createWriteStream(targetFile);
  res.pipe(fileStream);
  
  fileStream.on('finish', () => {
    fileStream.close();
    console.log('Twemoji PNG downloaded successfully to', targetFile);
    console.log('File size:', fs.statSync(targetFile).size, 'bytes');
  });
}).on('error', (err) => {
  console.error('Error downloading PNG:', err);
});
