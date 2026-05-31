import { Jimp } from 'jimp';
import fs from 'fs';

const logoSource = 'C:/Users/Administrator/.gemini/antigravity/brain/f7471df9-dd2a-4c8c-aa42-fa3357a0d18f/cute_hamster_bead_eyes_1780152500354.png';

async function inspect() {
  if (!fs.existsSync(logoSource)) {
    console.error('Source not found:', logoSource);
    return;
  }
  const image = await Jimp.read(logoSource);
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  
  console.log(`Image Dimensions: ${w}x${h}`);
  
  // Sample a few pixels: corners, edge midpoints, and center
  const samples = [
    { name: 'Top-Left Corner (0,0)', x: 0, y: 0 },
    { name: 'Top-Right Corner (w-1,0)', x: w - 1, y: 0 },
    { name: 'Bottom-Left Corner (0,h-1)', x: 0, y: h - 1 },
    { name: 'Bottom-Right Corner (w-1,h-1)', x: w - 1, y: h - 1 },
    { name: 'Top Edge Center (w/2,0)', x: Math.floor(w/2), y: 0 },
    { name: 'Left Edge Center (0,h/2)', x: 0, y: Math.floor(h/2) },
    { name: 'Center (w/2,h/2)', x: Math.floor(w/2), y: Math.floor(h/2) }
  ];
  
  samples.forEach(s => {
    const idx = (s.y * w + s.x) * 4;
    const r = image.bitmap.data[idx + 0];
    const g = image.bitmap.data[idx + 1];
    const b = image.bitmap.data[idx + 2];
    const a = image.bitmap.data[idx + 3];
    console.log(`${s.name}: RGBA(${r}, ${g}, ${b}, ${a})`);
  });
}

inspect().catch(console.error);
