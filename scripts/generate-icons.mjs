/* ----------------------------------------------------------------------------
   generate-icons.mjs — rasterize the Cabler Parts SVG marks into PNG/ICO assets.

   Setup + run:
     npm i -D sharp png-to-ico
     node scripts/generate-icons.mjs

   Reads from /public:
     favicon.svg          → favicon.ico (32), apple-touch-icon.png (180),
                            icon-192.png (192), icon-512.png (512)
     icon-maskable.svg    → icon-maskable-512.png (512)

   Writes all outputs back into /public. Self-contained; if sharp or png-to-ico
   are missing it logs a clear install hint and exits without throwing.
---------------------------------------------------------------------------- */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFile, writeFile, access } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

// ---- Load optional deps with a friendly guard -------------------------------
let sharp;
let pngToIco;
try {
  ({ default: sharp } = await import("sharp"));
  ({ default: pngToIco } = await import("png-to-ico"));
} catch (err) {
  console.error(
    "\n[generate-icons] Missing build dependencies.\n" +
      "  Install them first:  npm i -D sharp png-to-ico\n" +
      "  Then run:            node scripts/generate-icons.mjs\n" +
      `  (original error: ${err?.message || err})\n`
  );
  process.exit(1);
}

// ---- Helpers ----------------------------------------------------------------
async function readSvg(name) {
  const path = join(PUBLIC, name);
  try {
    await access(path);
  } catch {
    throw new Error(`Source SVG not found: ${path}`);
  }
  return readFile(path);
}

async function pngFromSvg(svgBuffer, size) {
  // density boost keeps the vector crisp at the target raster size
  return sharp(svgBuffer, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function writePng(svgBuffer, size, outName) {
  const buf = await pngFromSvg(svgBuffer, size);
  const out = join(PUBLIC, outName);
  await writeFile(out, buf);
  console.log(`  wrote ${outName} (${size}x${size}, ${buf.length} bytes)`);
}

// ---- Main -------------------------------------------------------------------
async function main() {
  console.log("[generate-icons] rasterizing Cabler Parts assets into /public …");

  const favicon = await readSvg("favicon.svg");
  const maskable = await readSvg("icon-maskable.svg");

  // PNGs from the standard mark
  await writePng(favicon, 180, "apple-touch-icon.png");
  await writePng(favicon, 192, "icon-192.png");
  await writePng(favicon, 512, "icon-512.png");

  // Maskable PNG (full-bleed amber)
  await writePng(maskable, 512, "icon-maskable-512.png");

  // favicon.ico from a 32px raster
  const ico32 = await pngFromSvg(favicon, 32);
  const icoBuf = await pngToIco(ico32);
  const icoOut = join(PUBLIC, "favicon.ico");
  await writeFile(icoOut, icoBuf);
  console.log(`  wrote favicon.ico (32x32, ${icoBuf.length} bytes)`);

  console.log("[generate-icons] done.");
}

main().catch((err) => {
  console.error(`\n[generate-icons] failed: ${err?.message || err}\n`);
  process.exit(1);
});
