import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoSource = path.resolve(__dirname, 'twemoji_hamster_72.png');
const publicIconsDir = path.resolve(__dirname, '../public/icons');

async function main() {
  if (!fs.existsSync(logoSource)) {
    console.error('Source logo file not found:', logoSource);
    process.exit(1);
  }

  console.log('Reading source image with Jimp...');
  const image = await Jimp.read(logoSource);

  // Ensure icons directory exists
  if (!fs.existsSync(publicIconsDir)) {
    fs.mkdirSync(publicIconsDir, { recursive: true });
  }

  console.log('Resizing and writing icon128.png (128x128)...');
  await image.clone().resize({ w: 128, h: 128 }).write(path.join(publicIconsDir, 'icon128.png'));

  console.log('Resizing and writing icon48.png (48x48)...');
  await image.clone().resize({ w: 48, h: 48 }).write(path.join(publicIconsDir, 'icon48.png'));

  console.log('Resizing and writing icon16.png (16x16)...');
  await image.clone().resize({ w: 16, h: 16 }).write(path.join(publicIconsDir, 'icon16.png'));

  console.log('Twemoji hamster logo resized to 16, 48, 128 sizes successfully.');
}

main().catch(err => {
  console.error('Failed to resize icons:', err);
  process.exit(1);
});
