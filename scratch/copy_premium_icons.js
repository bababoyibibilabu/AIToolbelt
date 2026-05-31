import fs from 'fs';
import path from 'path';

// Absolute path to the generated image
const logoSource = 'C:/Users/Administrator/.gemini/antigravity/brain/f7471df9-dd2a-4c8c-aa42-fa3357a0d18f/cute_hamster_logo_1780150997255.png';
const publicIconsDir = 'd:/vibe coding/AIToolbelt/public/icons';

if (fs.existsSync(logoSource)) {
  fs.copyFileSync(logoSource, path.join(publicIconsDir, 'icon16.png'));
  fs.copyFileSync(logoSource, path.join(publicIconsDir, 'icon48.png'));
  fs.copyFileSync(logoSource, path.join(publicIconsDir, 'icon128.png'));
  console.log('Premium logo icons copied over dummy icons successfully.');
} else {
  console.error('Source logo file not found:', logoSource);
}
