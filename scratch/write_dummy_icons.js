import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// A simple, valid base64-encoded cyan/violet colored square PNG icon (48x48)
// Created dynamically as a buffer
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACNSURBVGhD7c4xEQAgEATBqR/9u4QChgMcoG1vYmZ35+97e+8n4AABDhDgAAEOEOAAAQ4Q4AABDgR/QAECBCAAAQIQgAAFCEAAAhAgQAACELhB4AQECBCAAAQIQIACEIBfQAECBCAAAQIQgAAFCEAAAhAgQAECBCAAAQIQgAAFCEAAAhCAwHMCf77l4AcP8AUP0F2k611y/wAAAABJRU5ErkJggg==';

const buffer = Buffer.from(base64Png, 'base64');

const iconsDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Write the same minimal PNG file to 16, 48, and 128 sizes
fs.writeFileSync(path.join(iconsDir, 'icon16.png'), buffer);
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), buffer);
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), buffer);

console.log('Dummy PNG icons created successfully.');
