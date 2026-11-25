'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const { Script } = require('node:vm');

const patchId = 'antigravity-zh-cn';
const patchVersion = '0.4.0';
const profile = {
  version: '2.35.1',
  shell: '9f0aad7274795d7fbde04931d96b348dcfc5f3d81d7373e6b70aeb09307442df',
  exe: 'fdf8a0a6af474d54301740bdf0144d95a30be3105d96a2cb39bb8086278513ac',
  server: '73ce9a2405b455a93d1f13db2ae555da50406110217a349b6dd85c377fbdb9d1',
};
const hash = (data) => createHash('sha256').update(data).digest('hex');
const expectedSections = ['menu', 'sidebar', 'settings', 'plugins', 'automation', 'composer', 'common'];
const archiveName = 'app.asar';

function readCatalog() {
  const catalog = Object.create(null);
  let section;
  for (const [index, line] of fs.readFileSync(path.join(__dirname, 'translations.txt'), 'utf8')
    .replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    if (!line.trim() || line.startsWith('#')) continue;
    const header = /^\[(\w+)\]$/.exec(line);
    if (header) {
      section = header[1];
      if (!expectedSections.includes(section) || catalog[section]) {
        throw new Error(`译词表第 ${index + 1} 行分区无效`);
      }
      catalog[section] = Object.create(null);
      continue;
    }
    const [english, chinese, extra] = line.split('|');
    if (!section || !english?.trim() || !chinese?.trim() || extra !== undefined ||
      Object.hasOwn(catalog[section], english)) {
      throw new Error(`译词表第 ${index + 1} 行格式错误或有重复词条`);
    }
    catalog[section][english] = chinese;
  }
  if (expectedSections.some((name) => !Object.keys(catalog[name] ?? {}).length)) {
    throw new Error('译词表分区不完整');
  }
  return catalog;
}

// ASAR stores a Chromium Pickle header, then packed entries at byte offsets.
function readArchive(buffer) {
  if (buffer.length < 16 || buffer.readUInt32LE(0) !== 4) throw new Error('ASAR 文件头无效');
  const headerSize = buffer.readUInt32LE(4);
  const jsonLength = buffer.readUInt32LE(12);
  const dataStart = headerSize + 8;
  if (headerSize < 8 || dataStart > buffer.length || 16 + jsonLength > dataStart ||
    headerSize !== buffer.readUInt32LE(8) + 4) throw new Error('ASAR 索引长度无效');
  const header = JSON.parse(buffer.toString('utf8', 16, 16 + jsonLength));
  const entries = new Map();
  function visit(node, prefix = '') {
    for (const [name, entry] of Object.entries(node.files)) {
      const key = prefix + name;
      if (entry.files) visit(entry, key + '/');
      else if (!entry.unpacked && !entry.link) {
        const offset = Number(entry.offset);
        if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(entry.size) ||
          entry.size < 0 || dataStart + offset + entry.size > buffer.length) {
          throw new Error(`ASAR 索引无效：${key}`);
        }
        entries.set(key, { entry, bytes: buffer.subarray(dataStart + offset, dataStart + offset + entry.size) });
      }
    }
  }
  visit(header);
  return { header, entries };
}

function integrity(bytes, blockSize = 4 * 1024 * 1024) {
  const blocks = [];
  for (let offset = 0; offset < bytes.length; offset += blockSize) {
    blocks.push(hash(bytes.subarray(offset, offset + blockSize)));
  }
  if (!blocks.length) blocks.push(hash(Buffer.alloc(0)));
  return { algorithm: 'SHA256', hash: hash(bytes), blockSize, blocks };
}

function exact(source, before, after, file) {
  const start = source.indexOf(before);
  if (start === -1 || source.indexOf(before, start + before.length) !== -1) {
    throw new Error(`补丁定位失败：${file} / ${before.trim().split('\n')[0]}`);
  }
  return source.slice(0, start) + after + source.slice(start + before.length);
}

function patchArchive(original) {
  const archive = readArchive(original);
  const catalog = readCatalog();
  const renderer = fs.readFileSync(path.join(__dirname, 'renderer.js'), 'utf8');
  new Script(renderer, { filename: 'renderer.js' });
  const hook = `
    // antigravity-zh-cn: presentation only, in a separate renderer world.
    if (!options?.navigationPolicy && !process.env.DEV_URL) {
        const chineseUi = require('./antigravity-zh-cn-renderer');
        const translateHub = () => {
            try {
                const base = resolveActiveLsBaseUrl();
                if (!base || hubContents.isDestroyed()) return;
                const expected = new URL(base);
                if (expected.protocol !== 'https:' || expected.hostname !== '127.0.0.1' ||
                    !expected.port || new URL(hubContents.getURL()).origin !== expected.origin) return;
                const code = chineseUi.code + '(' + JSON.stringify(expected.origin) + ');';
                void hubContents.executeJavaScriptInIsolatedWorld(19833, [{code}]).catch(() => {});
            } catch {}
        };
        hubContents.on('dom-ready', translateHub);
        hubContents.on('did-finish-load', translateHub);
        hubContents.on('did-navigate-in-page', (_event, _url, isMainFrame) => {
            if (isMainFrame) translateHub();
        });
    }`;
  function edit(file, replacements) {
    const member = archive.entries.get('dist/' + file);
    if (!member) throw new Error(`缺少补丁目标：${file}`);
    let source = member.bytes.toString('utf8');
    for (const [before, after] of replacements) source = exact(source, before, after, file);
    new Script(source, { filename: file });
    member.bytes = Buffer.from(source);
    member.entry.integrity = integrity(member.bytes, member.entry.integrity?.blockSize);
  }
  const anchor = '    registerWindowWebContents(win, hubContents);';
  edit('utils.js', [[anchor, anchor + hook]]);
  edit('menu.js', [
    ["label: 'New Window',", "label: '新建窗口',"],
    ["label: 'Docs',", "label: '文档',"],
    ["return { label: 'Connect to WSL', submenu };", "return { label: '连接到 WSL', submenu };"],
    ["return { label: 'Reopen Locally', click:", "return { label: '在本机重新打开', click:"],
  ]);
  edit('main.js', [
    ["label: 'No agents running',", "label: '没有正在运行的智能体',"],
    ['label: `Open ${electron_1.app.getName()}`,', 'label: `打开 ${electron_1.app.getName()}`,'],
    ["label: 'Quit',", "label: '退出',"],
  ]);
  edit('tray.js', [[
    "(count > 0 ? `${count}` : 'No') +\n" +
      "                    ' agent' +\n" +
      "                    (count === 1 ? '' : 's') +\n" +
      "                    ' running';",
    "count > 0 ? `有 ${count} 个智能体正在运行` : '没有正在运行的智能体';",
  ]]);
  edit('updater.js', [
    ['MenuUpdateStep["CheckForUpdates"] = "Check for Updates";', 'MenuUpdateStep["CheckForUpdates"] = "检查更新";'],
    ['MenuUpdateStep["CheckingForUpdates"] = "Checking for Updates...";', 'MenuUpdateStep["CheckingForUpdates"] = "正在检查更新...";'],
    ['MenuUpdateStep["DownloadingUpdate"] = "Downloading Update...";', 'MenuUpdateStep["DownloadingUpdate"] = "正在下载更新...";'],
    ['MenuUpdateStep["RestartToUpdate"] = "Restart to Update";', 'MenuUpdateStep["RestartToUpdate"] = "重启以完成更新";'],
    ["title: 'Check for Updates',\n                message: 'No updates available',\n                buttons: ['OK'],", "title: '检查更新',\n                message: '当前已是最新版本',\n                buttons: ['确定'],"],
  ]);
  edit('ipcHandlers.js', [
    [
      "function buildContextMenuTemplate(items, onSelect) {\n    return items.map((item) => {",
      "const { labels: zhMenuLabels } = require('./antigravity-zh-cn-renderer');\n" +
      "const zhMenuLabel = (raw) => {\n" +
      "    if (typeof raw !== 'string') return '';\n" +
      "    const key = raw.trim().replace(/\\s+/gu, ' ');\n" +
      "    return Object.hasOwn(zhMenuLabels, key) ? zhMenuLabels[key] : raw;\n" +
      "};\n" +
      "function buildContextMenuTemplate(items, onSelect) {\n    return items.map((item) => {",
    ],
    [
      "label: item.label ?? '',\n                type: 'submenu',",
      "label: zhMenuLabel(item.label),\n                type: 'submenu',",
    ],
    [
      "label: item.label ?? '',\n            type: item.type ?? 'normal',",
      "label: zhMenuLabel(item.label),\n            type: item.type ?? 'normal',",
    ],
    ["electron_1.dialog.showErrorBox('Cannot open folder', t.error);", "electron_1.dialog.showErrorBox('无法打开文件夹', t.error);"],
    ["message: 'Folder is on the Windows filesystem',", "message: '文件夹位于 Windows 文件系统上',"],
    ["title: 'Open workspace',", "title: '打开工作区',"],
    ["title: 'Open workspaces',", "title: '打开多个工作区',"],
    ["title: 'Select Download Folder',", "title: '选择下载文件夹',"],
  ]);
  const menuLabels = Object.assign(
    Object.create(null),
    catalog.automation,
    catalog.plugins,
    catalog.composer,
    catalog.settings,
    catalog.sidebar,
    catalog.menu,
    catalog.common
  );
  const code = `((origin) => {\n${renderer}\ninstallChineseUI(${JSON.stringify(catalog)}, origin);\n})`;
  new Script(code, { filename: 'antigravity-zh-cn-renderer.js' });
  const moduleName = 'antigravity-zh-cn-renderer.js';
  const moduleSource = `'use strict';\nmodule.exports = {\n  code: ${JSON.stringify(code)},\n  labels: ${JSON.stringify(menuLabels)},\n};\n`;
  new Script(moduleSource, { filename: moduleName });
  const bytes = Buffer.from(moduleSource);
  const entry = { size: bytes.length, offset: '0', integrity: integrity(bytes) };
  archive.header.files.dist.files[moduleName] = entry;
  archive.entries.set('dist/' + moduleName, { entry, bytes });

  let offset = 0;
  const body = [];
  for (const member of archive.entries.values()) {
    member.entry.offset = String(offset);
    member.entry.size = member.bytes.length;
    offset += member.bytes.length;
    body.push(member.bytes);
  }
  const json = Buffer.from(JSON.stringify(archive.header));
  const aligned = Math.ceil((json.length + 4) / 4) * 4;
  const header = Buffer.alloc(12 + aligned);
  header.writeUInt32LE(4, 0);
  header.writeUInt32LE(4 + aligned, 4);
  header.writeUInt32LE(aligned, 8);
  header.writeUInt32LE(json.length, 12);
  json.copy(header, 16);
  return Buffer.concat([header, ...body]);
}

function readInstallation(appDir) {
  const resources = path.join(appDir, 'resources');
  const target = path.join(resources, archiveName);
  const original = fs.readFileSync(target);
  const archive = readArchive(original);
  const pkg = JSON.parse(archive.entries.get('package.json')?.bytes ?? '{}');
  if (pkg.name !== 'antigravity') throw new Error('所选目录没有 Antigravity 独立桌面版');
  return { appDir, resources, target, original, version: pkg.version, digest: hash(original) };
}

function fileHash(filename) {
  const digest = createHash('sha256');
  const fd = fs.openSync(filename, 'r');
  const chunk = Buffer.alloc(1024 * 1024);
  try {
    for (let n = fs.readSync(fd, chunk); n; n = fs.readSync(fd, chunk)) {
      digest.update(chunk.subarray(0, n));
    }
  } finally {
    fs.closeSync(fd);
  }
  return digest.digest('hex');
}

function verifyProfile(installation) {
  const { version, appDir, resources } = installation;
  if (version !== profile.version) throw new Error(`当前为 ${version}，补丁仅支持 ${profile.version}`);
  if (fileHash(path.join(appDir, 'Antigravity.exe')) !== profile.exe ||
    fileHash(path.join(resources, 'bin', 'language_server.exe')) !== profile.server) {
    throw new Error('应用或界面资源与已核对的 Windows 构建不同');
  }
  // The exact executable above was inspected with embedded ASAR integrity off.
  // A future profile must be reviewed with its original Electron fuses intact.
}

function bundlePaths({ resources }) {
  const base = path.join(resources, `${patchId}-${profile.version}-${profile.shell.slice(0, 12)}`);
  return { backup: base + '.bak', state: base + '.json' };
}

function readBackup({ backup, state }, currentDigest) {
  const bytes = fs.readFileSync(backup);
  if (hash(bytes) !== profile.shell) throw new Error('原版备份校验失败');
  const ledger = JSON.parse(fs.readFileSync(state, 'utf8'));
  const digestPattern = /^[0-9a-f]{64}$/;
  if (ledger.patch !== patchId || ledger.original !== profile.shell ||
    !digestPattern.test(ledger.localized) ||
    (ledger.previousLocalized !== undefined && !digestPattern.test(ledger.previousLocalized))) {
    throw new Error('补丁记录校验失败');
  }
  if (currentDigest !== ledger.localized && currentDigest !== ledger.previousLocalized) {
    throw new Error('应用文件与补丁记录不一致，已停止');
  }
  return bytes;
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function queryAppState() {
  const tool = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32',
    'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const query = "if ([System.Diagnostics.Process]::GetProcessesByName('Antigravity').Length) { 'RUNNING' } else { 'CLOSED' }";
  const result = spawnSync(tool, ['-NoProfile', '-NonInteractive', '-Command', query],
    { encoding: 'utf8', windowsHide: true, timeout: 20000 });
  const answer = result.stdout?.trim().split(/\r?\n/).pop()?.trim();
  if (result.error || result.status !== 0 || !['CLOSED', 'RUNNING'].includes(answer)) {
    throw new Error('无法检查 Antigravity 是否已退出');
  }
  return answer;
}

function assertAppClosed(maxWaitMs = 0) {
  const deadline = Date.now() + maxWaitMs;
  let notified = false;
  while (true) {
    const state = queryAppState();
    if (state === 'CLOSED') return;
    if (Date.now() >= deadline) {
      throw new Error('检测到 Antigravity 进程仍在后台运行，请先从右下角系统托盘右键退出（或稍等数秒）后再重试');
    }
    if (!notified) {
      console.log('正在等待 Antigravity 后台进程完全退出…');
      notified = true;
    }
    sleepMs(1000);
  }
}

function writeAtomic(destination, bytes, beforeRename = () => {}) {
  const staging = destination + '.' + randomUUID() + '.tmp';
  try {
    fs.writeFileSync(staging, bytes, { flag: 'wx', flush: true });
    beforeRename();
    for (let attempt = 0; ; attempt++) {
      try {
        fs.renameSync(staging, destination);
        break;
      } catch (error) {
        if (attempt < 5 && ['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) {
          sleepMs(500);
          continue;
        }
        throw error;
      }
    }
  } finally {
    if (fs.existsSync(staging)) fs.unlinkSync(staging);
  }
}

function replaceArchive(installation, bytes) {
  writeAtomic(installation.target, bytes, () => {
    if (fileHash(installation.target) !== installation.digest) {
      throw new Error('应用文件刚刚发生变化，请重新检查后再操作');
    }
    assertAppClosed();
  });
}

function changeInstallation(action, appDir) {
  const lock = path.join(appDir, 'resources', patchId + '.lock');
  let fd;
  try {
    fd = fs.openSync(lock, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`检测到补丁操作锁：${lock}`);
    throw error;
  }
  try {
    assertAppClosed(15000);
    const installation = readInstallation(appDir);
    verifyProfile(installation);
    const paths = bundlePaths(installation);
    const stock = installation.digest === profile.shell;
    const original = stock ? installation.original : readBackup(paths, installation.digest);
    if (action === 'restore') {
      if (stock) return '当前已是原版。';
      replaceArchive(installation, original);
      return '已恢复原版，可以重新启动 Antigravity。';
    }
    const localized = patchArchive(original);
    const localizedDigest = hash(localized);
    if (localizedDigest === installation.digest) return `当前已安装汉化补丁 v${patchVersion}。`;
    if (!fs.existsSync(paths.backup)) writeAtomic(paths.backup, original);
    if (fileHash(paths.backup) !== profile.shell) throw new Error('原版备份校验失败');
    // Keep the currently installed digest valid if replacing the archive is interrupted.
    writeAtomic(paths.state, JSON.stringify({
      patch: patchId, original: profile.shell, localized: localizedDigest,
      previousLocalized: stock ? undefined : installation.digest,
    }) + '\n');
    replaceArchive(installation, localized);
    return `汉化补丁 v${patchVersion} 已${stock ? '安装' : '升级'}，可以重新启动 Antigravity。`;
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}

function check(appDir) {
  const installation = readInstallation(appDir);
  console.log(`Antigravity ${installation.version}\n${installation.appDir}\napp.asar SHA-256: ${installation.digest}`);
  verifyProfile(installation);
  if (installation.digest === profile.shell) return '兼容。当前是原版，可以安装。';
  const original = readBackup(bundlePaths(installation), installation.digest);
  return hash(patchArchive(original)) === installation.digest
    ? `兼容。当前已安装本包的汉化补丁 v${patchVersion}（无需重复升级），也可按 R 恢复原版。`
    : `兼容。当前仍是旧版汉化补丁（尚未应用 v${patchVersion}），请完全退出软件后按 A 完成升级。`;
}

function main() {
  if (process.platform !== 'win32') throw new Error('当前补丁适用于 Windows 桌面版');
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('需要 Node.js 22 或更新版本');
  const [action = 'check', directory, unexpected] = process.argv.slice(2);
  if (unexpected || !['check', 'apply', 'restore'].includes(action)) {
    throw new Error('使用方法：node patch.cjs check|apply|restore [Antigravity 安装目录]');
  }
  const defaultDir = process.env.LOCALAPPDATA &&
    path.join(process.env.LOCALAPPDATA, 'Programs', 'antigravity');
  if (!directory && !defaultDir) throw new Error('请指定 Antigravity 安装目录');
  const appDir = fs.realpathSync(directory || defaultDir);
  console.log(action === 'check' ? check(appDir) : changeInstallation(action, appDir));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.code === 'EPERM' || error.code === 'EACCES'
      ? `权限不足或文件仍在使用：${error.path ?? ''}`
      : error.message);
    process.exitCode = 1;
  }
}

module.exports = { hash, patchArchive, readArchive, readCatalog };
