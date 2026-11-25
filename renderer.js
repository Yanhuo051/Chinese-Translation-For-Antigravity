function installChineseUI(catalog, expectedOrigin) {
  if (location.origin !== expectedOrigin || window.top !== window || window.__agyChineseUI) return;
  window.__agyChineseUI = true;

  const test = (id) => `[data-testid="${id}"]`;
  const tests = (...ids) => ids.map(test).join(',');
  const attrs = ['title', 'aria-label', 'aria-description', 'placeholder', 'data-placeholder', 'data-tooltip-content'];
  const watched = [...attrs, 'role', 'data-testid', 'data-sidebar-row-id', 'contenteditable'];
  // The Settings portal host is the backdrop on desktop, or bottom-sheet / sub-dialogs when portaled.
  const settingsScope = [
    '.settings-modal-backdrop,.settings-modal-container',
    tests(
      'settings-sidebar', 'settings-app-version-card', 'project-customizations-content',
      'running-page', 'add-mcp-screen', 'voice-picker', 'mcp-config-modal',
      'browser-site-data-dialog', 'voice-delete-recordings-modal', 'dictation-languages-popover'
    )
  ].join(',');
  const composerScope = tests(
    'agent-input-box', 'model-selector-panel', 'voice-dock-composer',
    'voice-dock', 'permissions-menu', 'composer-connectors-submenu', 'agent-selector-submenu'
  );
  // Portaled popovers, cascading submenus, select popups, tooltips, sheets, and sub-modals.
  const overlayScope = [
    '.agy-overlay,[data-select-popup],[data-hover-card-popup],[data-bottom-sheet-popup]',
    '.compact-tooltip,[role="tooltip"],.agy-dialog,[role="dialog"],[role="alertdialog"]',
    '[role="menu"],[role="listbox"]',
    tests('context-menu-popup', 'context-menu-submenu-popup', 'bottom-sheet')
  ].join(',');
  const shortcutRows = '[data-testid^="shortcut-row-"],' + test('inline-keybinding-recorder');
  const protectedContent = [
    'script,style,textarea,[contenteditable]:not([contenteditable="false"])',
    'option:not([value])',
    'pre,code,kbd,.monaco-editor,.xterm,[data-quotable],iframe,webview',
    '[data-sidebar-section-drop-id] span.truncate.flex-1',
    '[data-cascade-id]:not([data-testid="conversation-view"])',
    '[data-testid="customization-card"] .font-medium',
    '[data-testid="browser-site-data-site"] .truncate',
    tests(
      'agent-response', 'user-message', 'user-message-content', 'user-message-bubble',
      'artifact-view', 'file-tree-node-icon', 'tab-file-tree-sidebar', 'input-attachment',
      'automation-instructions', 'automation-instructions-markdown', 'automation-name',
      'queued-messages-card', 'plugin-suggested-prompt-list', 'plugin-suggested-prompt-row',
      'project-selector-item', 'project-selector-github-repo-item', 'model-selector-custom-item',
      'model-selector-item', 'model-selector-effort-group', 'plugin-card-fallback',
      'plugin-sidebar-sortable-item'
    )
  ].join(',');
  const sharedUI = [
    'button,[role="button"],[role^="menuitem"],[role="tab"],[role="tooltip"]',
    '[role="alert"],.agy-dialog,[role="dialog"],[role="alertdialog"],[role="status"],[role="option"]',
    tests(
      'context-menu-popup', 'context-menu-submenu-popup', 'menu-section-header',
      'menu-option-label', 'menu-option-description', 'menu-option-trailing-label',
      'plugin-view-title-bar', 'new-conversation-button', 'sidebar-search-button', 'app-update-button',
      'app-icon-new-conversation-button', 'settings-button', 'automations-button', 'plugins-button',
      'home-greeting', 'conversation-open-elsewhere-banner', 'model-selector-empty',
      'project-folder-selection-step', 'plugin-sidecar-modal', 'webview-prompt-card'
    )
  ].join(',');
  const scopes = [
    [catalog.menu, tests('title-menu-bar', 'title-menu-bar-item', 'title-menu-bar-option', 'app-logo-menu-trigger', 'app-logo-menu')],
    [catalog.sidebar, tests(
      'sidebar-navigation-items', 'conversation-list-sidebar', 'section-header',
      'customize-sidebar-modal', 'sidebar-add-project-button', 'settings-button'
    )],
    [catalog.settings, settingsScope],
    [catalog.plugins, tests(
      'customizations-marketplace', 'customizations-installed', 'plugins-tabs',
      'customizations-empty-state', 'marketplace-filter-menu', 'marketplace-bundles-banner',
      'plugin-detail', 'plugin-install-conflict-modal', 'plugin-source-caution-modal', 'plugin-view-title-bar'
    )],
    [catalog.automation, tests(
      'automation-detail-page', 'automation-settings', 'automation-runs',
      'schedule-editor-panel', 'cloud-trigger-editor-panel', 'automation-schedule-editor',
      'new-sidecar-modal', 'automation-kind-toggle'
    )],
    [catalog.composer, composerScope],
    [catalog.common, sharedUI]
  ];
  const overlayWords = Object.assign(
    Object.create(null),
    catalog.menu,
    catalog.automation,
    catalog.plugins,
    catalog.sidebar,
    catalog.composer,
    catalog.settings,
    catalog.common
  );
  const has = (dictionary, key) => Object.hasOwn(dictionary, key);
  const normalize = (label) => label.trim().replace(/\s+/gu, ' ');
  const relative = /^(\d+)\s?(s|m|h|d|w|mo|y)(?: ago)?$/;
  const unit = { s: '秒', m: '分钟', h: '小时', d: '天', w: '周', mo: '个月', y: '年' };
  const formatRelative = (label) => {
    const match = relative.exec(label);
    return match ? `${match[1]} ${unit[match[2]]}前` : undefined;
  };
  const preserveWhitespace = (raw, label) => raw.replace(/\S(?:[\s\S]*\S)?/, () => label);

  function formatDurationSpan(raw) {
    const clean = raw.replace(/\.$/, '').trim();
    if (clean === '<1m' || /^less than (?:a|1) minute$/i.test(clean)) return '1 分钟内';
    const replaced = clean
      .replace(/,\s*/g, ' ')
      .replace(/\band\s+/gi, '')
      .replace(/\b(\d+)\s*(?:days?|d)\b/gi, '$1 天')
      .replace(/\b(\d+)\s*(?:hours?|hrs?|h)\b/gi, '$1 小时')
      .replace(/\b(\d+)\s*(?:minutes?|mins?|m)\b/gi, '$1 分钟')
      .replace(/\b(\d+)\s*(?:seconds?|secs?|s)\b/gi, '$1 秒')
      .replace(/\s+/g, ' ');
    return replaced !== clean ? `${replaced}后` : undefined;
  }

  function formatLimitPrefix(raw) {
    if (raw === 'Daily limit') return '每日限额';
    if (raw === 'Weekly limit') return '每周限额';
    const match = /^(\d+)(s|m|h|d) limit$/.exec(raw);
    return match ? `${match[1]} ${unit[match[2]]}限额` : undefined;
  }

  function translateConflictClause(clause, fixed) {
    const match = /^Conflicts with "([^"]+)"(?: \((.+)\))?$/.exec(clause);
    if (!match) return undefined;
    const note = match[2] === 'press Enter to replace' ? '按 Enter 替换' : match[2] && fixed(match[2]);
    return `与「${match[1].split(', ').map(fixed).join('、')}」冲突${note ? `（${note}）` : ''}`;
  }

  function dynamicTemplate(label, element) {
    const fixed = (word) => has(catalog.settings, word) ? catalog.settings[word]
      : has(overlayWords, word) ? overlayWords[word] : word;

    let match = /^Your [Pp]lan: (.+)$/.exec(label);
    if (match) return '当前套餐：' + match[1];
    match = /^[Aa]vailable AI [Cc]redits: ([\d,.]+)$/.exec(label);
    if (match) return '可用 AI 点数：' + match[1];
    match = /^No matching languages for "(.+)"$/.exec(label);
    if (match) return `没有匹配「${match[1]}」的语言`;
    match = /^When toggled on, (.+?) will use your AI credits to fulfill model requests once you're out of model quota\. \1 will always use your model quota first before using AI credits\.$/.exec(label);
    if (match) return `启用后，${match[1]} 会在模型配额用完时用 AI 点数处理请求。模型配额会优先使用。`;
    match = /^Exited with code (-?\d+)\.$/.exec(label);
    if (match && element.closest(test('setup-script-status'))) return `脚本已退出，退出代码为 ${match[1]}。`;

    // Model quota, reset timers, and selector indicators.
    match = /^(Daily limit|Weekly limit|\d+[smhd] limit), resets in (.+)$/.exec(label);
    if (match) {
      const prefix = formatLimitPrefix(match[1]);
      const span = formatDurationSpan(match[2]);
      if (prefix && span) return `${prefix}，将于 ${span}重置`;
    }
    match = /^(?:Quota )?(?:[Rr]esets|[Rr]efreshes) in (.+)$/.exec(label);
    if (match) {
      const span = formatDurationSpan(match[1]);
      if (span) return `将于 ${span}重置`;
    }
    match = /^(?:Quota )?(?:[Rr]esets|[Rr]efreshes) (?:at|on) (.+?)\.?$/.exec(label);
    if (match) return `将于 ${match[1]} 重置`;
    const limitLabel = formatLimitPrefix(label);
    if (limitLabel) return limitLabel;
    match = /^(\d+(?:\.\d+)?)% left$/.exec(label);
    if (match) return `剩余 ${match[1]}%`;
    match = /^(\d+) models selected$/.exec(label);
    if (match) return `已选择 ${match[1]} 个模型`;
    match = /^Select model, current: (.+)$/.exec(label);
    if (match) return '选择模型，当前：' + fixed(match[1]);

    // Queued message shortcut hints, experimental flags, and admin-disabled options.
    match = /^(\S+) (Sends immediately|Queues after the turn|On empty prompt, sends next in queue)$/.exec(label);
    if (match) {
      const actionMap = {
        'Sends immediately': '立即发送',
        'Queues after the turn': '当前轮次结束后排队发送',
        'On empty prompt, sends next in queue': '输入框为空时发送队列中的下一条'
      };
      return `${match[1]} ${actionMap[match[2]]}`;
    }
    match = /^(.+) \(experimental\)$/.exec(label);
    if (match) return `${fixed(match[1])}（实验性）`;
    match = /^(.+) \(disabled by admin\)$/.exec(label);
    if (match) return `${fixed(match[1])}（已被管理员停用）`;

    // Permissions, MCP tools, Token Usage breakdowns, and Hooks.
    match = /^Inherits your Global Permissions when working (in this project|in these conversations)\.$/.exec(label);
    if (match) {
      return match[1] === 'in this project'
        ? '在此项目中工作时继承全局权限。'
        : '在这些对话中工作时继承全局权限。';
    }
    if (label === 'projects' && element.closest('[data-testid$="-overrides-trigger"]')) {
      return '个项目';
    }
    match = /^(\d+) tools? (enabled|disabled|excluded)$/.exec(label);
    if (match) {
      const stateMap = { enabled: '启用', disabled: '停用', excluded: '排除' };
      return `已${stateMap[match[2]]} ${match[1]} 个工具`;
    }
    match = /^Show (\d+) breakdowns?$/.exec(label);
    if (match) return `展开 ${match[1]} 项明细`;
    match = /^(\d+) (tools|demoted|excluded)$/.exec(label);
    if (match) {
      if (match[2] === 'tools') return `${match[1]} 个工具`;
      return `${match[1]} 项已${match[2] === 'demoted' ? '降级' : '排除'}`;
    }
    match = /^Exceeded the rules token budget\. Full rule content \(([\d,.]+) tokens\) was replaced with a lightweight file-path pointer in context\.$/.exec(label);
    if (match) return `超出规则词元预算。完整规则内容（${match[1]} 词元）已在上下文中替换为轻量级文件路径指针。`;
    match = /^Exceeded the customization token budget \(([\d,.]+) tokens\) and was excluded from context\.$/.exec(label);
    if (match) return `超出自定义词元预算（${match[1]} 词元），已从上下文中排除。`;
    match = /^All tools in this MCP server \(([\d,.]+) tokens\) exceeded the customization budget and were excluded from context\.$/.exec(label);
    if (match) return `此 MCP 服务器中的所有工具（${match[1]} 词元）超出自定义预算，已从上下文中排除。`;
    match = /^(\d+) tools? in this MCP server \(([\d,.]+) tokens\) exceeded the customization budget and were excluded from context\.$/.exec(label);
    if (match) return `此 MCP 服务器中有 ${match[1]} 个工具（${match[2]} 词元）超出自定义预算，已从上下文中排除。`;
    match = /^Auth code for (.+)$/.exec(label);
    if (match) return `${match[1]} 的授权码`;
    match = /^Handler #(\d+)$/.exec(label);
    if (match) return `处理器 #${match[1]}`;
    match = /^Are you sure you want to delete the hook "(.+)"\?$/.exec(label);
    if (match) return `确定要删除钩子「${match[1]}」吗？`;

    // Browser cookies, Voice recordings, Running processes, and Developer flags.
    match = /^(\d+) cookies?$/.exec(label);
    if (match) return `${match[1]} 个 Cookie`;
    match = /^Delete cookies for (.+)$/.exec(label);
    if (match) return `删除 ${match[1]} 的 Cookie`;
    match = /^(\d+) calls? · ([\d.]+ MB)$/.exec(label);
    if (match) return `${match[1]} 次通话 · ${match[2]}`;
    match = /^This deletes (\d+) call recordings? \(([\d.]+ MB)\) from your machine\. You can't undo this\.$/.exec(label);
    if (match) return `这将从本机删除 ${match[1]} 条通话录音（${match[2]}），此操作无法撤销。`;
    match = /^Deleted (\d+) recordings? \(([\d.]+ MB)\)$/.exec(label);
    if (match) return `已删除 ${match[1]} 条录音（${match[2]}）`;
    match = /^Stop (\d+) selected$/.exec(label);
    if (match) return `停止所选的 ${match[1]} 项`;
    match = /^Stop (\d+) items?\?$/.exec(label);
    if (match) return `要停止这 ${match[1]} 项吗？`;
    match = /^and (\d+) more$/.exec(label);
    if (match) return `另有 ${match[1]} 项`;
    match = /^Select all in (.+)$/.exec(label);
    if (match) return `全选「${fixed(match[1])}」`;
    match = /^Reset (\d+) overrides?$/.exec(label);
    if (match) return `重置 ${match[1]} 项覆盖配置`;

    // Shortcut rows and inline keybinding recorder.
    match = /^Conflict: also assigned to (.+)$/.exec(label);
    if (match) return `冲突：同时分配给了「${match[1].split(', ').map(fixed).join('、')}」`;
    if (label.startsWith('Conflicts with "')) {
      const parts = label.split('; ').map((part) => translateConflictClause(part, fixed));
      if (parts.every(Boolean)) return parts.join('；');
    }
    if (!element.closest(shortcutRows)) return;
    match = /^(Shortcut|Remove shortcut) (.+?) for (.+)$/.exec(label);
    if (match) {
      const [, action, keys, command] = match;
      return `${action === 'Shortcut' ? '快捷键' : '移除快捷键'} ${keys}（${fixed(command)}）`;
    }
    match = /^(?:Add shortcut for (.+)|Reset (.+) to default)$/.exec(label);
    if (match) return match[1] ? `为「${fixed(match[1])}」添加快捷键` : `将「${fixed(match[2])}」恢复为默认快捷键`;
    match = /^Recording shortcut for (.+)\. Press keys to bind, Enter to save, Escape to cancel\.$/.exec(label);
    if (match) return `正在录制「${fixed(match[1])}」的快捷键。按下要绑定的组合键，按 Enter 保存，按 Escape 取消。`;
  }

  function translate(raw, element, isAttribute = false) {
    if (!raw || raw.length > 900 || !/[A-Za-z]/.test(raw)) return raw;
    const label = normalize(raw);
    let translated;
    for (const [words, scope] of scopes) {
      if (has(words, label) && element.closest(scope)) {
        translated = words[label];
        break;
      }
    }
    const inExtendedUI = translated === undefined &&
      Boolean(element.closest(settingsScope + ',' + composerScope + ',' + overlayScope));
    if (inExtendedUI && has(overlayWords, label)) {
      translated = overlayWords[label];
    }
    if (translated === undefined && inExtendedUI) {
      translated = dynamicTemplate(label, element);
    }
    if (isAttribute && translated === undefined && has(overlayWords, label)) {
      const control = element.matches(sharedUI) ||
        element.matches('input,textarea,[contenteditable],[role="img"],[data-tooltip-id]');
      if (control) translated = overlayWords[label];
    }
    if (!translated && element.closest(tests('title-menu-bar-option', 'app-logo-menu'))) {
      const version = /^Version ([\d.]+(?:[-+][\w.-]+)?)$/.exec(label);
      if (version) translated = '版本 ' + version[1];
    }
    if (!translated && element.closest('time,[role="tooltip"]')) translated = formatRelative(label);
    return translated ? preserveWhitespace(raw, translated) : raw;
  }

  function isProtected(element) {
    return !element || Boolean(element.closest(protectedContent));
  }

  function replaceText(node) {
    const element = node.parentElement;
    if (isProtected(element)) return;
    if (element.closest('[data-sidebar-row-id]')) {
      // In a conversation row, the only recognized text is its status timestamp.
      const time = element.closest('.agy-row-status') && formatRelative(normalize(node.data));
      if (time) node.data = preserveWhitespace(node.data, time);
      return;
    }
    const replacement = translate(node.data, element);
    if (replacement !== node.data) node.data = replacement;
  }

  function replaceAttributes(element) {
    // Translate hints on input controls without visiting user-entered text.
    const editableHint = element.matches('[contenteditable],textarea,input') &&
      Boolean(element.closest(settingsScope + ',' + composerScope + ',' + overlayScope)) &&
      !isProtected(element.parentElement);
    if (!editableHint && isProtected(element)) return;
    if (element.closest('[data-sidebar-row-id]') && !element.closest('.agy-row-actions')) return;
    const names = editableHint ? ['aria-label', 'placeholder', 'data-placeholder'] : attrs;
    for (const name of names) {
      const value = element.getAttribute(name);
      if (!value) continue;
      const next = translate(value, element, true);
      if (next !== value) element.setAttribute(name, next);
    }
  }

  function translateSubtree(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      replaceText(node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    replaceAttributes(node);
    if (isProtected(node)) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(child) {
        if (child.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
        replaceAttributes(child);
        return isProtected(child) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
      }
    });
    for (let text = walker.nextNode(); text; text = walker.nextNode()) replaceText(text);
  }

  const pending = new Set();
  let scheduled = false;
  function flush() {
    scheduled = false;
    const batch = new Set(pending);
    pending.clear();
    for (const node of batch) {
      if (!node.isConnected) continue;
      let ancestor = node.parentElement;
      while (ancestor && !batch.has(ancestor)) ancestor = ancestor.parentElement;
      if (!ancestor) translateSubtree(node);
    }
  }
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') pending.add(record.target);
      else if (record.type === 'attributes') {
        if (attrs.includes(record.attributeName)) replaceAttributes(record.target);
        else pending.add(record.target);
      } else {
        for (const node of record.addedNodes) pending.add(node);
      }
    }
    if (pending.size && !scheduled) {
      scheduled = true;
      setTimeout(flush, 25);
    }
  });
  const root = document.documentElement;
  if (!root) return;
  translateSubtree(root);
  observer.observe(root, {
    subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: watched
  });
}
