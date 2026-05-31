import { Jimp } from 'jimp';
import fs from 'fs';

const targetIcon = 'd:/vibe coding/AIToolbelt/public/icons/icon128.png';

async function check() {
  if (!fs.existsSync(targetIcon)) {
    console.error('File not found:', targetIcon);
    return;
  }
  const image = await Jimp.read(targetIcon);
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let transparentCount = 0;
  let solidCount = 0;
  
  image.scan(0, 0, w, h, function(x, y, idx) {
    const alpha = this.bitmap.data[idx + 3];
    if (alpha === 0) {
      transparentCount++;
    } else {
      solidCount++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  });
  
  console.log(`Dimensions: ${w}x${h}`);
  console.log(`Transparent Pixels: ${transparentCount} (${Math.round(transparentCount/(w*h)*100)}%)`);
  console.log(`Solid Pixels: ${solidCount} (${Math.round(solidCount/(w*h)*100)}%)`);
  console.log(`Solid Bounding Box: minX=${minX}, minY=${minY}, maxX=${maxX}, maxY=${maxY}`);
  console.log(`Solid Width: ${maxX - minX + 1}, Solid Height: ${maxY - minY + 1}`);
}

check().catch(console.error);
