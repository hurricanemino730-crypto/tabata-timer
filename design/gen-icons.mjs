import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dir = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(dir, 'icon-source.svg')
const outDir = path.join(dir, '..', 'public')

const targets = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
]

for (const { name, size } of targets) {
  await sharp(src).resize(size, size).png().toFile(path.join(outDir, name))
  console.log('generated', name)
}

// maskable: add safe padding so the icon isn't clipped by OS masks
await sharp(src)
  .resize(360, 360)
  .extend({ top: 76, bottom: 76, left: 76, right: 76, background: '#0f172a' })
  .png()
  .toFile(path.join(outDir, 'maskable-512x512.png'))
console.log('generated maskable-512x512.png')
