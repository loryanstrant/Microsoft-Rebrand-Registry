// Validates that every logo asset is safe to ship and sharp at the sizes the site renders.
// Pure Node: the registry has no runtime dependencies and this keeps it that way.
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import path from 'node:path';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const root = new URL('../', import.meta.url);

export async function loadConfig() {
  return JSON.parse(await readFile(new URL('config/logo-sources.json', root), 'utf8'));
}

export function readPng(buffer) {
  if (buffer.length < 8 || !PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)) {
    throw new Error('not a PNG file');
  }
  const chunks = [];
  let header = null;
  let palette = null;
  let transparency = null;
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (offset + 12 + length > buffer.length) throw new Error('truncated PNG chunk');
    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12]
      };
    } else if (type === 'PLTE') palette = Buffer.from(data);
    else if (type === 'tRNS') transparency = Buffer.from(data);
    else if (type === 'IDAT') chunks.push(Buffer.from(data));
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (!header) throw new Error('PNG has no IHDR header');
  if (!header.width || !header.height) throw new Error('PNG has zero dimensions');
  return { ...header, palette, transparency, data: Buffer.concat(chunks) };
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

// Returns the bounding box of pixels that are not fully transparent, or null when the
// pixel format is one we deliberately do not decode (interlaced or sub-byte samples).
export function visibleBounds(png) {
  const channels = CHANNELS[png.colorType];
  if (channels === undefined) throw new Error(`unsupported PNG colour type ${png.colorType}`);
  const hasAlpha = png.colorType === 4 || png.colorType === 6;
  const paletteAlpha = png.colorType === 3 && png.transparency;
  if (png.interlace !== 0 || png.bitDepth < 8) return null;
  if (!hasAlpha && !paletteAlpha) {
    return { left: 0, top: 0, right: png.width - 1, bottom: png.height - 1 };
  }

  const bytesPerSample = png.bitDepth / 8;
  const pixelBytes = channels * bytesPerSample;
  const rowBytes = png.width * pixelBytes;
  const raw = inflateSync(png.data);
  if (raw.length < (rowBytes + 1) * png.height) throw new Error('PNG pixel data is truncated');

  let previous = Buffer.alloc(rowBytes);
  let current = Buffer.alloc(rowBytes);
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < png.height; y += 1) {
    const start = y * (rowBytes + 1);
    const filter = raw[start];
    raw.copy(current, 0, start + 1, start + 1 + rowBytes);
    for (let i = 0; i < rowBytes; i += 1) {
      const a = i >= pixelBytes ? current[i - pixelBytes] : 0;
      const b = previous[i];
      const c = i >= pixelBytes ? previous[i - pixelBytes] : 0;
      let value = current[i];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`unknown PNG filter ${filter}`);
      current[i] = value & 0xff;
    }
    for (let x = 0; x < png.width; x += 1) {
      const base = x * pixelBytes;
      let alpha;
      if (paletteAlpha) {
        const index = current[base];
        alpha = index < png.transparency.length ? png.transparency[index] : 255;
      } else {
        alpha = current[base + pixelBytes - bytesPerSample];
      }
      if (alpha > 0) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    [previous, current] = [current, previous];
  }
  return right < 0 ? null : { left, top, right, bottom };
}

export function readSvg(text) {
  if (!/<svg[\s>]/i.test(text)) throw new Error('not an SVG file');
  if (/<script[\s>]/i.test(text)) throw new Error('SVG contains a script element');
  if (/\son\w+\s*=/i.test(text)) throw new Error('SVG contains an event handler attribute');
  if (/<foreignObject[\s>]/i.test(text)) throw new Error('SVG contains a foreignObject element');
  if (/(?:href|xlink:href|src)\s*=\s*["']https?:/i.test(text)) throw new Error('SVG references an external resource');
  const viewBox = /viewBox\s*=\s*["']\s*([-\d.eE]+)[,\s]+([-\d.eE]+)[,\s]+([-\d.eE]+)[,\s]+([-\d.eE]+)\s*["']/.exec(text);
  if (viewBox) {
    const width = Number(viewBox[3]);
    const height = Number(viewBox[4]);
    if (!(width > 0) || !(height > 0)) throw new Error('SVG viewBox has no positive extent');
    return { width, height, geometry: 'viewBox' };
  }
  // Some contributed artwork carries only intrinsic dimensions. That still scales
  // correctly inside the site's fixed logo boxes, so accept it and say where the
  // geometry came from rather than rejecting a usable mark.
  const rootTag = /<svg[\s>][^>]*>/i.exec(text)?.[0] ?? '';
  const width = Number(/\swidth\s*=\s*["']\s*([\d.]+)\s*(?:px)?\s*["']/i.exec(rootTag)?.[1]);
  const height = Number(/\sheight\s*=\s*["']\s*([\d.]+)\s*(?:px)?\s*["']/i.exec(rootTag)?.[1]);
  if (!(width > 0) || !(height > 0)) throw new Error('SVG has neither a viewBox nor positive width and height');
  return { width, height, geometry: 'intrinsic' };
}

export function checkAsset(name, buffer, rules) {
  const { minSourcePx, minVisibleShare, maxAspectRatio } = rules;
  const problems = [];
  const detail = {};
  if (!buffer.length) return { problems: ['file is empty'], detail };

  if (name.endsWith('.svg')) {
    const svg = readSvg(buffer.toString('utf8'));
    detail.width = svg.width;
    detail.height = svg.height;
    detail.scalable = true;
    detail.geometry = svg.geometry;
    if (svg.geometry === 'intrinsic') detail.note = 'no viewBox; sized from intrinsic width and height';
    const aspect = Math.max(svg.width / svg.height, svg.height / svg.width);
    if (aspect > maxAspectRatio) problems.push(`aspect ratio ${aspect.toFixed(2)}:1 exceeds ${maxAspectRatio}:1`);
    return { problems, detail };
  }
  if (!name.endsWith('.png')) return { problems: ['unsupported logo format'], detail };

  const png = readPng(buffer);
  detail.width = png.width;
  detail.height = png.height;
  detail.scalable = false;
  const longest = Math.max(png.width, png.height);
  if (longest < minSourcePx) problems.push(`${png.width}x${png.height} is below the ${minSourcePx}px needed for crisp rendering`);
  const aspect = Math.max(png.width / png.height, png.height / png.width);
  if (aspect > maxAspectRatio) problems.push(`aspect ratio ${aspect.toFixed(2)}:1 exceeds ${maxAspectRatio}:1`);

  const bounds = visibleBounds(png);
  if (bounds === null) {
    if (png.interlace === 0 && png.bitDepth >= 8) problems.push('artwork is fully transparent');
    else detail.note = 'alpha bounds not measured for this pixel format';
    return { problems, detail };
  }
  const visibleWidth = bounds.right - bounds.left + 1;
  const visibleHeight = bounds.bottom - bounds.top + 1;
  const share = Math.max(visibleWidth / png.width, visibleHeight / png.height);
  detail.visibleShare = Number(share.toFixed(3));
  detail.visiblePx = `${visibleWidth}x${visibleHeight}`;
  if (share < minVisibleShare) {
    problems.push(`visible artwork fills only ${(share * 100).toFixed(0)}% of the canvas (minimum ${(minVisibleShare * 100).toFixed(0)}%)`);
  }
  const visibleLongest = Math.max(visibleWidth, visibleHeight);
  if (visibleLongest < minSourcePx) {
    problems.push(`visible artwork is only ${visibleWidth}x${visibleHeight}, below the ${minSourcePx}px needed after transparent padding`);
  }
  return { problems, detail };
}

export function rulesFor(config, entry) {
  const { registryPx, timelinePx, densityFactor } = config.display;
  const base = {
    minSourcePx: Math.max(registryPx, timelinePx) * densityFactor,
    minVisibleShare: config.validation.minVisibleShare,
    maxAspectRatio: config.validation.maxAspectRatio
  };
  return { ...base, ...(entry?.exception ?? {}) };
}

export async function validateLogos({ config, baseDir = '.', only } = {}) {
  const loaded = config ?? (await loadConfig());
  const entries = [...loaded.managed, ...loaded.unmanaged].filter(entry => !only || only.includes(entry.local));
  const results = [];
  for (const entry of entries) {
    const rules = rulesFor(loaded, entry);
    let problems = [];
    let detail = {};
    try {
      const buffer = await readFile(path.join(baseDir, entry.local));
      ({ problems, detail } = checkAsset(entry.local, buffer, rules));
    } catch (error) {
      problems = [error.code === 'ENOENT' ? 'file is missing' : error.message];
    }
    results.push({ local: entry.local, problems, detail, exception: entry.exception ?? null });
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv.slice(2).filter(argument => !argument.startsWith('--'));
  const results = await validateLogos({ only: only.length ? only : undefined });
  const invalid = results.filter(result => result.problems.length);
  for (const result of invalid) {
    console.error(`○ Invalid ${result.local}: ${result.problems.join('; ')}`);
  }
  if (invalid.length) process.exit(1);
  console.log(`● Validated ${results.length} logo assets for 52px and 32px rendering.`);
}
