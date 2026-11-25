'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { inflateRawSync } = require('node:zlib');
const { hash, readArchive, readCatalog } = require('./patch.cjs');

function embeddedRenderer(binary) {
  // The checked Windows build has a ZIP of web assets embedded in its backend.
  const marker = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  for (let end = binary.lastIndexOf(marker); end >= 0;
    end = end === 0 ? -1 : binary.lastIndexOf(marker, end - 1)) {
    if (end + 22 > binary.length) continue;
    const entries = binary.readUInt16LE(end + 10);
    const central = end - binary.readUInt32LE(end + 12);
    const base = central - binary.readUInt32LE(end + 16);
    if (!entries || base < 0 || central + 46 > end) continue;
    const members = new Map();
    let cursor = central;
    for (let index = 0; index < entries && cursor + 46 <= end; index++) {
      if (binary.readUInt32LE(cursor) !== 0x02014b50) break;
      const nameSize = binary.readUInt16LE(cursor + 28);
      const next = cursor + 46 + nameSize + binary.readUInt16LE(cursor + 30) +
        binary.readUInt16LE(cursor + 32);
      if (next > end) break;
      const name = binary.toString('utf8', cursor + 46, cursor + 46 + nameSize);
      if (name === 'index.html' || name === 'main.js') {
        members.set(name, {
          compression: binary.readUInt16LE(cursor + 10),
          size: binary.readUInt32LE(cursor + 20),
          start: base + binary.readUInt32LE(cursor + 42),
        });
      }
      cursor = next;
    }
    if (cursor !== end || !members.has('index.html') || !members.has('main.js')) continue;
    const { compression, size, start } = members.get('main.js');
    if (start < base || start + 30 > central || binary.readUInt32LE(start) !== 0x04034b50) continue;
    const payload = start + 30 + binary.readUInt16LE(start + 26) + binary.readUInt16LE(start + 28);
    if (payload + size > central) continue;
    const bytes = binary.subarray(payload, payload + size);
    if (compression === 0) return bytes.toString('utf8');
    if (compression === 8) return inflateRawSync(bytes, { maxOutputLength: 64 * 1024 * 1024 }).toString('utf8');
  }
  throw new Error('没有找到可识别的界面压缩资源。此版本需要重新定位资源。');
}

function escapeUnicode(text) {
  return JSON.stringify(text).slice(1, -1).replace(/[^\x20-\x7e]/g,
    (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
}

function collectNormalizedStrings(source) {
  const decoded = new Set();
  for (const match of source.matchAll(/"((?:[^"\\]|\\.){2,360})"/g)) {
    try {
      decoded.add(JSON.parse('"' + match[1] + '"').trim().replace(/\s+/gu, ' '));
    } catch {}
  }
  return decoded;
}

function candidates(source, known) {
  const counts = new Map();
  const fields = /(?:\b(?:label|title|description|tooltipText|placeholder|ariaLabel)|"(?:aria-label|aria-description)"):"((?:[^"\\]|\\.){3,260})"/g;
  for (const match of source.matchAll(fields)) {
    let label;
    try {
      label = JSON.parse('"' + match[1] + '"').trim().replace(/\s+/gu, ' ');
    } catch {
      continue;
    }
    if (!/^[A-Z][A-Za-z ]+/.test(label) || !label.includes(' ') || known.has(label) ||
      /[<>\x00-\x1f]/.test(label)) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].sort(([a, ac], [b, bc]) => bc - ac || a.localeCompare(b));
}

try {
  const [, , directory] = process.argv;
  const app = directory ?? (process.env.LOCALAPPDATA &&
    path.join(process.env.LOCALAPPDATA, 'Programs', 'antigravity'));
  if (!app) throw new Error('请指定 Antigravity 安装目录。');
  const executable = fs.readFileSync(path.join(app, 'Antigravity.exe'));
  const backend = fs.readFileSync(path.join(app, 'resources', 'bin', 'language_server.exe'));
  const archive = fs.readFileSync(path.join(app, 'resources', 'app.asar'));
  const renderer = embeddedRenderer(backend);
  const native = readArchive(archive).entries;
  const nativeText = ['main.js', 'menu.js', 'tray.js', 'utils.js', 'updater.js', 'ipcHandlers.js'].map(
    (name) => native.get('dist/' + name)?.bytes.toString('utf8') ?? ''
  ).join('\n');
  const catalog = readCatalog();
  const known = new Set(Object.values(catalog).flatMap(Object.keys));
  console.log(`Antigravity.exe  ${hash(executable)}\napp.asar         ${hash(archive)}\nlanguage_server  ${hash(backend)}`);
  const source = renderer + '\n' + nativeText;
  const decoded = collectNormalizedStrings(source);
  for (const [section, words] of Object.entries(catalog)) {
    const keys = Object.keys(words);
    const missing = keys.filter((key) => !decoded.has(key) && !source.includes(key) &&
      !source.includes(escapeUnicode(key)));
    console.log(`\n${section}  字面出现 ${keys.length - missing.length}/${keys.length}`);
    if (missing.length) console.log('动态组装或版本差异：' + missing.join(' · '));
  }
  const review = candidates(renderer, known);
  console.log(`\n候选文案（共 ${review.length} 条，显示前 120 条，含需人工排除的条目）`);
  for (const [label, count] of review.slice(0, 120)) console.log(`${count}\t${label}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
