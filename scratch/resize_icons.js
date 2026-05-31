import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

const logoSource = 'C:/Users/Administrator/.gemini/antigravity/brain/f7471df9-dd2a-4c8c-aa42-fa3357a0d18f/cute_hamster_bead_eyes_1780152500354.png';
const publicIconsDir = 'd:/vibe coding/AIToolbelt/public/icons';

async function main() {
  if (!fs.existsSync(logoSource)) {
    console.error('Source logo file not found:', logoSource);
    process.exit(1);
  }

  console.log('Reading source image with Jimp...');
  let image = await Jimp.read(logoSource);

  // Crop to hamster's tight boundaries manually and remove background
  console.log('Manually cropping hamster to tight boundaries and keying out background...');
  image = cropAndKeyHamster(image);

  // Add 2px dark outline to prevent blending into white backgrounds
  console.log('Drawing a 2-pixel dark outline around the hamster...');
  image = addHamsterOutline(image);

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

  console.log('Hamster logo resized to 16, 48, 128 sizes successfully.');
}

/**
 * Deterministically find the hamster's bounding box using color distance,
 * crop the image tightly to it, and remove the outer background pixels.
 */
function cropAndKeyHamster(image) {
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  
  // Sample background color from top-left corner
  const bgR = image.bitmap.data[0];
  const bgG = image.bitmap.data[1];
  const bgB = image.bitmap.data[2];
  
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  
  // 1. Scan for bounding box of pixels that are NOT background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      
      const distance = Math.sqrt(
        Math.pow(r - bgR, 2) +
        Math.pow(g - bgG, 2) +
        Math.pow(b - bgB, 2)
      );
      
      // If color is different from background, it is the hamster
      if (distance >= 75) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  if (maxX === -1) {
    console.warn('Could not find hamster bounding box, using full canvas.');
    return image;
  }
  
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  console.log(`Cropping tightly: minX=${minX}, minY=${minY}, width=${cropW}, height=${cropH}`);
  
  // 2. Crop the image canvas to fit the hamster tightly
  image.crop({ x: minX, y: minY, w: cropW, h: cropH });
  
  // 3. Scan the cropped image and make all background pixels transparent
  const newWidth = image.bitmap.width;
  const newHeight = image.bitmap.height;
  
  image.scan(0, 0, newWidth, newHeight, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    const distance = Math.sqrt(
      Math.pow(r - bgR, 2) +
      Math.pow(g - bgG, 2) +
      Math.pow(b - bgB, 2)
    );
    
    if (distance < 75) {
      this.bitmap.data[idx + 3] = 0; // Set background to transparent
    }
  });
  
  return image;
}

/**
 * Draw a 2px dark border stroke around solid pixels on a padded canvas.
 */
function addHamsterOutline(srcImage) {
  const pad = 6; // Padding size
  const width = srcImage.bitmap.width + pad * 2;
  const height = srcImage.bitmap.height + pad * 2;
  
  // Create a new padded transparent image
  const padded = new Jimp({ width, height, color: 0x00000000 });
  
  // Composite original image centered on padded canvas
  padded.composite(srcImage, pad, pad);
  
  // Clone to check solid pixels while writing borders
  const original = padded.clone();
  const strokeColor = { r: 52, g: 32, b: 20, a: 255 }; // Dark cocoa brown stroke (#342014)
  
  padded.scan(0, 0, width, height, function(x, y, idx) {
    // Only check transparent pixels for drawing border
    if (original.bitmap.data[idx + 3] === 0) {
      let isBorder = false;
      const radius = 2; // 2px stroke radius
      
      for (let dy = -radius; dy <= radius && !isBorder; dy++) {
        for (let dx = -radius; dx <= radius && !isBorder; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = (ny * width + nx) * 4;
            // If neighbor has alpha, it's near solid edge
            if (original.bitmap.data[nIdx + 3] > 10) {
              isBorder = true;
            }
          }
        }
      }
      
      if (isBorder) {
        this.bitmap.data[idx + 0] = strokeColor.r;
        this.bitmap.data[idx + 1] = strokeColor.g;
        this.bitmap.data[idx + 2] = strokeColor.b;
        this.bitmap.data[idx + 3] = strokeColor.a;
      }
    }
  });
  
  return padded;
}

main().catch(err => {
  console.error('Failed to resize icons:', err);
  process.exit(1);
});
