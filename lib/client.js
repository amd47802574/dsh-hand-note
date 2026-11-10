// dsh-hand-note · browser half
//
// Static bundle form required by DSH: the web shell installs a
// `window.__ModuleLoader__` facade and every plugin ships as CJS-in-a-factory.
//
//   window.__ModuleLoader__.load({ id, factory(require) => exports })
//
// Two things the guard facade enforces (both learned the hard way):
//   1. the returned plugin MUST declare `inject` — services are unreachable otherwise
//   2. slots can be declared AFTER we apply, so registration waits for them
//
// Panel model (option A: the library takes over the centre column):
//   `main` is a keyed slot; the shell renders the entry whose key equals the
//   active panel id, and the Conversation when that id is null. So we register
//   a keyed `main` entry plus sidebar entry points, and switch with
//   `layout.selectPanel(id)` / `selectPanel(null)`.

window.__ModuleLoader__.load({
  id: 'dsh-hand-note',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef } = React

    const TAG = '[kb-lite]'
    const PANEL_ID = 'hand-note'
    const API = '/_dsh/dsh-hand-note'

    /* ------------------------------------------------------------------ */
    /* styles — injected once; .kb- prefixed, host CSS variables only      */
    /* ------------------------------------------------------------------ */

    /* restyle v2 — workspace card look; tokens scoped to plugin surfaces,
       accent follows the host theme var(--accent) with a fixed fallback   */
    const CSS = `
.kb-panel,.kb-menu{
  --kb-accent:var(--accent,#6d5ef2);
  --kb-accent-ink:var(--accent-contrast,#fff);
  --kb-veil-1:rgba(127,127,140,.06);
  --kb-veil-2:rgba(127,127,140,.11);
  --kb-veil-3:rgba(127,127,140,.18);
  --kb-line:var(--border,rgba(127,127,140,.22));
  --kb-line-strong:var(--border,rgba(127,127,140,.34));
  --kb-danger:#e5484d;
  --kb-radius:12px;
  --kb-shadow:0 12px 32px rgba(15,18,34,.16),0 2px 8px rgba(15,18,34,.08);
  --kb-mono:ui-monospace,'Cascadia Code',SFMono-Regular,Menlo,Consolas,monospace;
}
.kb-panel{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--text,inherit);font:var(--font-ui,inherit);background:inherit}

/* ---- header ---- */
.kb-header{display:flex;gap:10px;align-items:center;padding:10px 14px 8px;flex:0 0 auto}
.kb-back{display:inline-flex;align-items:center;gap:4px;padding:5px 12px 5px 5px;border:0;border-radius:999px;background:transparent;color:var(--text,inherit);font:inherit;font-size:13px;font-weight:500;cursor:pointer;flex:0 0 auto;opacity:.85;transition:background 140ms ease,opacity 140ms ease}
.kb-back:hover{background:var(--kb-veil-2);opacity:1}
.kb-back-ico{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--kb-veil-2);font-size:14px;line-height:1}
.kb-search{position:relative;display:flex;align-items:center;flex:1 1 240px;min-width:160px;max-width:520px}
.kb-search>svg{position:absolute;left:11px;width:14px;height:14px;opacity:.5;pointer-events:none}
.kb-search-input{width:100%;padding:7px 30px 7px 32px;border-radius:999px;background:var(--kb-veil-1);color:inherit;font:inherit;font-size:13px;border:1px solid transparent;outline:none;transition:border-color 140ms ease,background 140ms ease,box-shadow 140ms ease}
.kb-search-input:focus{background:var(--surface,transparent);border-color:var(--kb-accent);box-shadow:0 0 0 3px rgba(109,94,242,.16);box-shadow:0 0 0 3px color-mix(in srgb,var(--kb-accent) 18%,transparent)}
.kb-search-clear{position:absolute;right:6px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:transparent;color:inherit;font-size:14px;line-height:1;cursor:pointer;opacity:.55}
.kb-search-clear:hover{opacity:1;background:var(--kb-veil-2)}
.kb-actions{display:flex;gap:6px;align-items:center;margin-left:auto;flex:0 0 auto}

/* ---- buttons ---- */
.kb-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:999px;border:1px solid var(--kb-line-strong);background:transparent;color:inherit;font:inherit;font-size:12.5px;font-weight:500;line-height:1.2;cursor:pointer;white-space:nowrap;transition:background 140ms ease,border-color 140ms ease,color 140ms ease,transform 80ms ease,box-shadow 140ms ease}
.kb-btn:hover{background:var(--kb-veil-1);border-color:var(--kb-accent)}
.kb-btn:active{transform:translateY(1px)}
.kb-btn:disabled{opacity:.45;cursor:default;transform:none}
.kb-btn.kb-primary{background:var(--kb-accent);border-color:transparent;color:var(--kb-accent-ink);box-shadow:0 2px 10px rgba(109,94,242,.32);box-shadow:0 2px 10px color-mix(in srgb,var(--kb-accent) 35%,transparent)}
.kb-btn.kb-primary:hover{background:color-mix(in srgb,var(--kb-accent) 86%,#fff);border-color:transparent}
.kb-btn svg{width:13px;height:13px;flex:0 0 auto}

/* ---- tag bar ---- */
.kb-tagbar{display:flex;gap:6px;align-items:center;padding:2px 14px 10px;flex:0 0 auto;overflow-x:auto;scrollbar-width:none}
.kb-tagbar::-webkit-scrollbar{display:none}
.kb-tagbar-label{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.45;flex:0 0 auto;margin-right:2px}
.kb-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 11px;border-radius:999px;border:1px solid var(--kb-line-strong);background:transparent;color:inherit;font:inherit;font-size:12px;line-height:1.5;cursor:pointer;white-space:nowrap;flex:0 0 auto;transition:all 140ms ease}
.kb-chip:hover{border-color:var(--kb-accent);background:var(--kb-veil-1)}
.kb-chip-on{background:var(--kb-accent);border-color:transparent;color:var(--kb-accent-ink)}
.kb-chip-on:hover{background:var(--kb-accent);opacity:.9}
.kb-chip-count{font-size:10.5px;opacity:.65;font-variant-numeric:tabular-nums}
.kb-chip-clear{border:0;background:transparent;color:var(--kb-accent);font:inherit;font-size:12px;cursor:pointer;flex:0 0 auto;padding:3px 6px;white-space:nowrap}
.kb-chip-clear:hover{text-decoration:underline}
.kb-chip-x{display:none;align-items:center;justify-content:center;width:14px;height:14px;margin-right:-3px;border-radius:50%;font-size:12px;line-height:1;opacity:.5;flex:0 0 auto}
.kb-chip:hover .kb-chip-x{display:inline-flex}
.kb-chip-x:hover{opacity:1;background:var(--kb-veil-3)}
.kb-chip-on .kb-chip-x{opacity:.75}
.kb-chip-add{border-style:dashed;opacity:.75}
.kb-chip-add:hover{opacity:1;border-style:solid;background:var(--kb-veil-1)}

/* ---- body: sidebar + editor ---- */
.kb-body{display:flex;flex:1;min-height:0;padding:0 14px 10px;gap:12px}
.kb-side{display:flex;flex-direction:column;flex:0 0 300px;width:300px;min-height:0;border:1px solid var(--kb-line);border-radius:var(--kb-radius);background:var(--kb-veil-1);overflow:hidden}
.kb-list{flex:1;min-height:0;overflow-y:auto;padding:6px}
.kb-list::-webkit-scrollbar,.kb-md::-webkit-scrollbar,.kb-ta::-webkit-scrollbar{width:8px;height:8px}
.kb-list::-webkit-scrollbar-thumb,.kb-md::-webkit-scrollbar-thumb,.kb-ta::-webkit-scrollbar-thumb{background:var(--kb-veil-3);border-radius:99px;border:2px solid transparent;background-clip:padding-box}
.kb-list::-webkit-scrollbar-track,.kb-md::-webkit-scrollbar-track,.kb-ta::-webkit-scrollbar-track{background:transparent}

/* ---- directory tree ---- */
.kb-tree-row{display:flex;align-items:center;gap:6px;padding:6px 8px;margin:1px 0;border-radius:8px;cursor:pointer;font-size:12.5px;transition:background 140ms ease;user-select:none}
.kb-tree-row:hover{background:var(--kb-veil-2)}
.kb-tree-root{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.75;margin:2px 2px 6px}
.kb-tree-root:hover{background:transparent;opacity:.9}
.kb-tree-caret{width:12px;flex:0 0 auto;opacity:.45;font-size:9px;line-height:1;text-align:center}
.kb-tree-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.kb-tree-count{font-size:10.5px;line-height:1;padding:3px 8px;border-radius:999px;background:var(--kb-veil-2);opacity:.8;flex:0 0 auto;font-variant-numeric:tabular-nums}
.kb-tree-row.kb-drop-target{outline:1.5px dashed var(--kb-accent);outline-offset:-2px;background:rgba(109,94,242,.1);background:color-mix(in srgb,var(--kb-accent) 10%,transparent)}

/* ---- note cards ---- */
.kb-item{position:relative;padding:9px 11px;margin:2px 0;cursor:pointer;border-radius:10px;border:1px solid transparent;transition:background 140ms ease,border-color 140ms ease,box-shadow 140ms ease}
.kb-item:hover{background:var(--surface,var(--kb-veil-1));border-color:var(--kb-line)}
.kb-item.kb-selected{background:var(--surface,var(--kb-veil-2));border-color:rgba(109,94,242,.45);border-color:color-mix(in srgb,var(--kb-accent) 45%,transparent);box-shadow:0 1px 6px rgba(15,18,34,.06)}
.kb-item.kb-selected::before{content:'';position:absolute;left:-1px;top:9px;bottom:9px;width:3px;border-radius:99px;background:var(--kb-accent)}
.kb-item-top{display:flex;align-items:baseline;gap:8px}
.kb-item-title{flex:1;min-width:0;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kb-item.kb-selected .kb-item-title{color:var(--kb-accent)}
.kb-item-excerpt{font-size:11.5px;opacity:.6;margin-top:3px;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.kb-item-meta{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-top:6px}
.kb-tag{font-size:10.5px;line-height:1;padding:3px 8px;border-radius:999px;background:var(--kb-veil-2);opacity:.85;white-space:nowrap}
.kb-item-badge{font-size:10.5px;line-height:1;padding:3px 8px;border-radius:999px;border:1px solid var(--kb-line-strong);opacity:.7;white-space:nowrap}
.kb-time{font-size:10.5px;opacity:.45;flex:0 0 auto;white-space:nowrap;font-variant-numeric:tabular-nums}

/* ---- editor card ---- */
.kb-editor{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;border:1px solid var(--kb-line);border-radius:var(--kb-radius);background:var(--surface,transparent);overflow:hidden}
.kb-titleinput{flex:0 0 auto;padding:14px 18px 4px;background:transparent;color:inherit;font:inherit;font-size:19px;font-weight:700;border:0;outline:none;letter-spacing:.01em}
.kb-titleinput::placeholder,.kb-ta::placeholder,.kb-input::placeholder{opacity:.4}
.kb-editor-meta{display:flex;gap:8px;align-items:center;padding:6px 18px 10px;border-bottom:1px solid var(--kb-line);flex-wrap:wrap;flex:0 0 auto}
.kb-input{background:transparent;color:inherit;font:inherit;border:1px solid var(--kb-line-strong);border-radius:8px;outline:none;transition:border-color 140ms ease,box-shadow 140ms ease;flex:1;min-width:120px;padding:5px 10px;font-size:12.5px}
.kb-input:focus{border-color:var(--kb-accent);box-shadow:0 0 0 3px rgba(109,94,242,.14);box-shadow:0 0 0 3px color-mix(in srgb,var(--kb-accent) 16%,transparent)}
.kb-tagsinput{flex:0 1 240px;min-width:120px;border-radius:999px}
.kb-seg{display:inline-flex;flex:0 0 auto;border:1px solid var(--kb-line-strong);border-radius:999px;padding:2px;gap:2px;background:var(--kb-veil-1)}
.kb-seg-btn{padding:3px 14px;border:0;border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:12px;font-weight:500;cursor:pointer;opacity:.7;transition:all 140ms ease}
.kb-seg-btn:hover{opacity:1}
.kb-seg-btn.kb-seg-on{background:var(--surface,#fff);color:var(--kb-accent);font-weight:600;opacity:1;box-shadow:0 1px 4px rgba(15,18,34,.14)}
.kb-ta{flex:1;min-height:0;padding:16px 18px;line-height:1.75;font-size:13.5px;resize:none;background:transparent;color:inherit;font-family:var(--kb-mono);border:0;outline:none}
.kb-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.kb-status{font-size:11.5px;opacity:.7;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kb-status.kb-err{color:var(--kb-danger);opacity:1;font-weight:500}

/* ---- attachments ---- */
.kb-files{display:flex;flex-direction:column;gap:6px;margin:0 18px 12px;padding:10px 12px;border:1px dashed var(--kb-line-strong);border-radius:10px;background:var(--kb-veil-1);flex:0 0 auto}
.kb-file{display:flex;align-items:center;gap:8px;font-size:12px}
.kb-file::before{content:'📎';font-size:11px;opacity:.85;flex:0 0 auto}
.kb-file-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kb-file .kb-btn{padding:3px 10px;font-size:11.5px}
.kb-file-badge{font-size:11px;opacity:.65;border:1px solid var(--kb-line-strong);border-radius:999px;padding:0 6px;white-space:nowrap}

/* ---- status bar ---- */
.kb-statusbar{display:flex;gap:12px;align-items:center;padding:6px 16px;border-top:1px solid var(--kb-line);flex:0 0 auto;background:var(--kb-veil-1);min-height:32px}
.kb-root{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:460px;cursor:pointer;border:0;background:transparent;color:inherit;font:inherit;padding:2px 6px;border-radius:6px;flex:0 0 auto}
.kb-root:hover{background:var(--kb-veil-2);opacity:1}
.kb-root-dot{width:6px;height:6px;border-radius:50%;background:var(--kb-accent);flex:0 0 auto;opacity:.9}
.kb-root-input{font-size:12px;padding:3px 9px;max-width:360px;flex:0 1 360px}
.kb-statusbar-spacer{flex:1;height:1px}

/* ---- empty states ---- */
.kb-empty{padding:26px 18px;text-align:center;opacity:.65;font-size:12.5px;line-height:1.8;white-space:pre-line}
.kb-empty-editor{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;opacity:.85;padding:30px}
.kb-empty-editor svg{width:44px;height:44px;opacity:.3;margin-bottom:8px}
.kb-empty-title{font-size:14.5px;font-weight:600;opacity:.9}
.kb-empty-sub{font-size:12px;opacity:.6;max-width:430px;white-space:normal;line-height:1.7}
.kb-empty-hint{font-size:11.5px;opacity:.55;margin-top:10px;padding:5px 13px;border:1px dashed var(--kb-line-strong);border-radius:999px}

/* ---- drag & drop ---- */
.kb-drop-active{outline:2px dashed var(--kb-accent);outline-offset:-8px}
.kb-drop-hint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(127,127,140,.12);font-size:14px;font-weight:600;pointer-events:none;z-index:6}

/* ---- sidebar icon / chat chip ---- */
.kb-icon{display:flex;align-items:center;justify-content:center;width:100%;height:100%;cursor:pointer;color:inherit}

/* ---- writeback tail ---- */
.kb-tail-btn{font-size:12px;padding:3px 10px;opacity:.85}
.kb-tail-status{font-size:12px;opacity:.7}
.kb-tail{margin:4px 0 10px;border:1px solid var(--kb-line);border-radius:var(--kb-radius);padding:12px 14px;display:flex;flex-direction:column;gap:10px;background:var(--kb-veil-1)}
.kb-tail-title{font-size:12px;font-weight:600;opacity:.85}
.kb-tail-item{display:flex;gap:9px;align-items:flex-start}
.kb-tail-check{display:flex;align-items:center;margin-top:6px;cursor:pointer;accent-color:var(--kb-accent)}
.kb-tail-fields{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0}
.kb-tail-fields .kb-input{font-size:12px;padding:4px 9px}
.kb-tail-tags{opacity:.85}
.kb-tail-md{flex:0 0 auto;border:0;padding:2px 0;margin:0;font-size:12px;line-height:1.55;opacity:.8;max-height:140px;overflow:auto}
.kb-tail-route{font-size:11px;opacity:.5}

/* ---- context menu ---- */
.kb-menu{position:fixed;z-index:10000;min-width:190px;background:var(--surface,Canvas);color:var(--text,inherit);border:1px solid var(--kb-line);border-radius:12px;box-shadow:var(--kb-shadow);padding:5px;display:flex;flex-direction:column;gap:1px;animation:kb-pop 120ms ease}
.kb-menu-item{padding:7px 11px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:12.5px;text-align:left;cursor:pointer;white-space:nowrap;width:100%;transition:background 100ms ease}
.kb-menu-item:hover{background:var(--kb-veil-2)}
.kb-menu-item.kb-menu-danger{color:var(--kb-danger)}
.kb-menu-item.kb-menu-danger:hover{background:rgba(229,72,77,.1)}
.kb-menu-sep{height:1px;margin:4px 6px;background:var(--kb-line)}
.kb-menu-input{width:100%;padding:6px 9px;font-size:12.5px;border:1px solid var(--kb-line-strong);border-radius:8px;background:transparent;color:inherit;font:inherit;outline:none}
.kb-menu-input:focus{border-color:var(--kb-accent)}

/* ---- markdown article ---- */
.kb-md{flex:1;min-height:0;overflow:auto;padding:16px 20px;font-size:13.5px;line-height:1.75;word-break:break-word}
.kb-md.kb-md-empty{opacity:.5}
.kb-md>*:first-child{margin-top:0}
.kb-md>*:last-child{margin-bottom:0}
.kb-md-h1,.kb-md-h2,.kb-md-h3,.kb-md-h4,.kb-md-h5,.kb-md-h6{line-height:1.4;margin:1.1em 0 .45em;font-weight:700;letter-spacing:.01em}
.kb-md-h1{font-size:1.45em;padding-bottom:.25em;border-bottom:1px solid var(--kb-line)}
.kb-md-h2{font-size:1.25em}
.kb-md-h3{font-size:1.1em}
.kb-md-h4,.kb-md-h5,.kb-md-h6{font-size:1em}
.kb-md-p{margin:.5em 0}
.kb-md-ul,.kb-md-ol{margin:.5em 0;padding-left:1.5em}
.kb-md-li{margin:.2em 0}
.kb-md-li::marker{color:var(--kb-accent)}
.kb-md-check{margin-right:.4em;vertical-align:-1px;accent-color:var(--kb-accent)}
.kb-md-quote{margin:.6em 0;padding:.2em 1em;border-left:3px solid var(--kb-accent);background:var(--kb-veil-1);border-radius:0 8px 8px 0;opacity:.92}
.kb-md-quote .kb-md-p{margin:.3em 0}
.kb-md-pre{margin:.6em 0;padding:.85em 1em;background:var(--kb-veil-2);border:1px solid var(--kb-line);border-radius:10px;overflow:auto;font-family:var(--kb-mono);font-size:12.5px;line-height:1.6}
.kb-md-pre .kb-md-lang{display:block;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;opacity:.5;margin-bottom:.35em}
.kb-md-pre code{background:transparent;border:0;padding:0;font-size:inherit;white-space:pre;display:block}
.kb-md-code{font-family:var(--kb-mono);font-size:.9em;background:var(--kb-veil-2);border-radius:5px;padding:.1em .4em}
.kb-md-table{border-collapse:collapse;margin:.6em 0;font-size:.95em;display:block;overflow:auto;max-width:100%}
.kb-md-table tr:nth-child(2n){background:var(--kb-veil-1)}
.kb-md-th,.kb-md-td{border:1px solid var(--kb-line);padding:.35em .7em;text-align:left}
.kb-md-th{font-weight:600;background:var(--kb-veil-2)}
.kb-md-hr{border:0;border-top:1px solid var(--kb-line);margin:1em 0}
.kb-md a{color:var(--kb-accent);text-decoration:underline;text-underline-offset:2px;word-break:break-all}

@keyframes kb-pop{from{opacity:0;transform:translateY(4px) scale(.98)}to{opacity:1;transform:none}}
`

    let stylesInstalled = false
    function installStyles() {
      if (stylesInstalled || typeof document === 'undefined') return
      stylesInstalled = true
      const el = document.createElement('style')
      el.setAttribute('data-plugin', 'dsh-hand-note')
      el.textContent = CSS
      document.head.appendChild(el)
    }

    /* ------------------------------------------------------------------ */
    /* host RPC + tiny observable store                                    */
    /* ------------------------------------------------------------------ */

    // Injected by the host half into the auth-gated index page. Absent in the
    // desktop shell, where the origin check is the fallback.
    const ACCESS_TOKEN = typeof window !== 'undefined' && typeof window.__DSH_KB_TOKEN__ === 'string'
      ? window.__DSH_KB_TOKEN__
      : ''

    const rpc = async (method, args) => {
      const headers = { 'content-type': 'application/json' }
      if (ACCESS_TOKEN) headers['x-dsh-kb-token'] = ACCESS_TOKEN
      const res = await fetch(`${API}/${method}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(args ?? {})
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload || payload.ok !== true) {
        throw new Error(payload?.error || `HTTP ${res.status}`)
      }
      return payload.data
    }

    /**
     * Mirror of the host's text/binary split. Text files become the note body;
     * everything else goes through `importFile`, which stores the bytes and
     * extracts OOXML text server-side.
     */
    const TEXT_EXT = new Set([
      '.txt', '.md', '.markdown', '.json', '.csv', '.tsv', '.log', '.yaml', '.yml',
      '.ini', '.toml', '.conf', '.xml', '.html', '.htm', '.css', '.js', '.mjs',
      '.cjs', '.ts', '.tsx', '.jsx', '.py', '.rb', '.go', '.rs', '.java', '.c',
      '.h', '.cpp', '.hpp', '.cs', '.sh', '.bat', '.ps1', '.sql', '.env'
    ])
    const isTextName = (name) => {
      const ext = /\.([^.]+)$/.exec(String(name ?? '').toLowerCase())
      return ext ? TEXT_EXT.has(ext[0]) : false
    }
    /** `storedName` is `<id>--<original>`; show only the original. */
    const displayName = (stored) => String(stored ?? '').split('--').slice(1).join('--') || String(stored ?? '')

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
      reader.onload = () => {
        const result = String(reader.result ?? '')
        resolve(result.slice(result.indexOf(',') + 1))
      }
      reader.readAsDataURL(file)
    })

    async function importDroppedFiles(files) {
      S.busy = true
      S.error = ''
      emit()
      let saved = 0
      let extracted = 0
      for (const file of files) {
        try {
          if (isTextName(file.name)) {
            const text = await file.text()
            const capped = text.length > 400000 ? `${text.slice(0, 400000)}\n\n…（内容过长已截断）` : text
            await rpc('save', {
              title: file.name.replace(/\.[^.]+$/, '') || file.name,
              body: capped,
              tags: ['导入'],
              source: 'import'
            })
          } else {
            const base64 = await fileToBase64(file)
            const result = await rpc('importFile', {
              name: file.name,
              dataBase64: base64,
              // Attach to the open note when there is one, else make its own.
              noteId: S.current?.id
            })
            if (result?.extracted) extracted += 1
            if (result?.id) {
              const full = await rpc('get', { id: result.id })
              if (full) S.current = { id: full.id, title: full.title, body: full.body, tags: full.tags, files: full.files }
            }
          }
          saved += 1
        } catch (err) {
          S.error = `${file.name}：${err?.message ?? err}`
        }
      }
      S.busy = false
      S.status = saved > 0
        ? `已导入 ${saved} 个文件${extracted > 0 ? `（${extracted} 个已抽取文本，可搜索引用）` : ''}`
        : S.status
      // The import RPC already wrote through to disk; adopt that as baseline.
      markClean()
      await Promise.all([reloadList(), reloadTags()])
      emit()
    }

    /* ------------------------------------------------------------------ */
    /* note context menu (plain DOM overlay)                                  */
    /* ------------------------------------------------------------------ */

    let noteMenu = null

    function closeNoteMenu() {
      if (noteMenu) noteMenu.remove()
      noteMenu = null
    }

    async function copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text)
        S.status = '已复制到剪贴板'
      } catch (err) {
        console.log(`${TAG} clipboard write failed:`, err?.message)
        S.status = '复制失败：浏览器拒绝了剪贴板访问'
      }
      emit()
    }

    async function noteFullText(note) {
      const full = await rpc('get', { id: note.id })
      const body = full?.body ?? note.excerpt ?? ''
      return `# ${full?.title || note.title}\n\n${body}\n`
    }

    async function removeNoteById(id) {
      const gone = await run(() => rpc('remove', { id }), '已删除')
      if (gone !== undefined) {
        if (S.current?.id === id) S.current = null
        await Promise.all([reloadList(), reloadTags()])
      }
      emit()
    }

    function openNoteMenu(note, x, y) {
      closeNoteMenu()
      noteMenu = document.createElement('div')
      noteMenu.className = 'kb-menu'

      /**
       * `keepOpen` items reuse this very element to swap in a prompt (rename
       * input, delete confirmation) — closing first would null the container
       * out from under them.
       */
      const addItem = (label, onClick, cls, keepOpen) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = cls ? `kb-menu-item ${cls}` : 'kb-menu-item'
        btn.textContent = label
        btn.addEventListener('click', () => {
          if (!keepOpen) closeNoteMenu()
          onClick()
        })
        noteMenu.appendChild(btn)
        return btn
      }
      const addSep = () => {
        const sep = document.createElement('div')
        sep.className = 'kb-menu-sep'
        noteMenu.appendChild(sep)
      }
      /** Swap the menu contents in place (rename prompt, delete confirmation). */
      const replaceMenu = (build) => {
        noteMenu.innerHTML = ''
        build()
      }

      addItem('打开', async () => {
        /** 有附件 → 系统程序打开原文件；没有附件（纯文本导入）→ 导出临时文件
         *  再交系统程序（HTML → 浏览器，其余 → .md 默认程序）。 */
        let full = null
        try { full = await rpc('get', { id: note.id }) } catch { full = null }
        const files = full?.files ?? []
        if (files.length === 1) return openStored(files[0])
        if (files.length > 1) {
          replaceMenu(() => {
            files.forEach((stored) => addItem(`打开「${displayName(stored)}」`, () => openStored(stored)))
            addSep()
            addItem('在编辑器中打开', () => openNote(note.id))
          })
          return
        }
        try {
          await rpc('openNoteExternal', { id: note.id })
          S.status = `已用系统默认程序打开「${note.title}」`
        } catch (err) {
          S.error = `打开失败：${err?.message ?? err}`
        }
        emit()
      })
      addItem('复制内容', async () => { await copyToClipboard(await noteFullText(note)) })
      addItem('剪切（复制后删除）', async () => {
        await copyToClipboard(await noteFullText(note))
        await removeNoteById(note.id)
      })
      addSep()
      addItem('重命名', () => {
        replaceMenu(() => {
          const input = document.createElement('input')
          input.className = 'kb-menu-input'
          input.value = note.title
          input.addEventListener('keydown', (ev) => {
            ev.stopPropagation()
            if (ev.key === 'Enter') commit()
            else if (ev.key === 'Escape') closeNoteMenu()
          })
          const commit = async () => {
            const next = input.value.trim()
            console.log(`${TAG} rename commit: "${note.title}" -> "${next}"`)
            closeNoteMenu()
            if (next === '' || next === note.title) {
              console.log(`${TAG} rename skipped (empty or unchanged)`)
              return
            }
            try {
              const done = await rpc('rename', { id: note.id, title: next })
              console.log(`${TAG} rename rpc returned:`, JSON.stringify(done))
              S.status = '已重命名'
              if (S.current?.id === note.id) S.current = { ...S.current, title: next }
              await Promise.all([reloadList(), reloadTags()])
            } catch (err) {
              console.log(`${TAG} rename FAILED:`, err?.message ?? err)
              S.error = `重命名失败：${err?.message ?? err}`
            }
            emit()
          }
          input.addEventListener('blur', closeNoteMenu, { once: true })
          noteMenu.appendChild(input)
          input.focus()
          input.select()
        })
      }, null, true)
      addItem('保存', async () => {
        if (S.current?.id !== note.id) await openNote(note.id)
        await saveNote()
      })
      addSep()
      addItem('删除', () => {
        replaceMenu(() => {
          const yes = document.createElement('button')
          yes.type = 'button'
          yes.className = 'kb-menu-item kb-menu-danger'
          yes.textContent = `确认删除「${note.title}」？`
          yes.addEventListener('click', () => { closeNoteMenu(); removeNoteById(note.id) })
          const no = document.createElement('button')
          no.type = 'button'
          no.className = 'kb-menu-item'
          no.textContent = '取消'
          no.addEventListener('click', closeNoteMenu)
          noteMenu.append(yes, no)
          yes.focus()
        })
      }, 'kb-menu-danger', true)

      document.body.appendChild(noteMenu)
      const rect = noteMenu.getBoundingClientRect()
      noteMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`
      noteMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`
    }

    /** Right-click on a directory: new subdirectory, rename, delete. */
    function openDirMenu(path, x, y) {
      closeNoteMenu()
      noteMenu = document.createElement('div')
      noteMenu.className = 'kb-menu'
      const addItem = (label, onClick, cls, keepOpen) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = cls ? `kb-menu-item ${cls}` : 'kb-menu-item'
        btn.textContent = label
        btn.addEventListener('click', () => {
          if (!keepOpen) closeNoteMenu()
          onClick()
        })
        noteMenu.appendChild(btn)
        return btn
      }
      const addSep = () => {
        const sep = document.createElement('div')
        sep.className = 'kb-menu-sep'
        noteMenu.appendChild(sep)
      }
      const askText = (initial, onCommit) => {
        noteMenu.innerHTML = ''
        const input = document.createElement('input')
        input.className = 'kb-menu-input'
        input.value = initial
        input.addEventListener('keydown', (ev) => {
          ev.stopPropagation()
          if (ev.key === 'Enter') {
            const value = input.value
            closeNoteMenu()
            onCommit(value)
          } else if (ev.key === 'Escape') closeNoteMenu()
        })
        noteMenu.appendChild(input)
        input.focus()
        input.select()
      }

      const total = notesUnder(path).length
      addItem('新建子目录', () => askText('', (name) => createSubDir(path, name)), null, true)

      if (path !== '') {
        addItem('重命名', () => askText(dirLeaf(path), async (next) => {
          const clean = String(next ?? '').trim()
          if (clean === '' || clean === dirLeaf(path)) return
          const parent = path.split('/').slice(0, -1).join('/')
          try {
            await rpc('renameDir', { from: path, to: parent === '' ? clean : `${parent}/${clean}` })
            S.status = '目录已重命名'
            await Promise.all([reloadDirs(), reloadList()])
          } catch (err) {
            S.error = `重命名失败：${err?.message ?? err}`
          }
          emit()
        }), null, true)
        addSep()
        addItem(`删除（将连带删除 ${total} 篇笔记）`, () => {
          noteMenu.innerHTML = ''
          const yes = document.createElement('button')
          yes.type = 'button'
          yes.className = 'kb-menu-item kb-menu-danger'
          yes.textContent = `确认删除「${dirLeaf(path)}」及其中 ${total} 篇笔记？`
          yes.addEventListener('click', async () => {
            closeNoteMenu()
            S.busy = true
            emit()
            try {
              const res = await rpc('removeDir', { dir: path, cascade: true })
              S.status = `已删除目录（连带 ${res?.removed ?? 0} 篇笔记）`
              S.expanded.delete(path)
              await Promise.all([reloadDirs(), reloadList(), reloadTags()])
            } catch (err) {
              S.error = `删除目录失败：${err?.message ?? err}`
            } finally {
              S.busy = false
              emit()
            }
          })
          const no = document.createElement('button')
          no.type = 'button'
          no.className = 'kb-menu-item'
          no.textContent = '取消'
          no.addEventListener('click', closeNoteMenu)
          noteMenu.append(yes, no)
          yes.focus()
        }, 'kb-menu-danger', true)
      }

      document.body.appendChild(noteMenu)
      const rect = noteMenu.getBoundingClientRect()
      noteMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`
      noteMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`
    }

    /** Right-click an attachment: open with the OS default program, or reveal in Explorer. */
    function openAttachmentMenu(stored, x, y) {
      closeNoteMenu()
      noteMenu = document.createElement('div')
      noteMenu.className = 'kb-menu'
      const addItem = (label, onClick, cls, keepOpen) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = cls ? `kb-menu-item ${cls}` : 'kb-menu-item'
        btn.textContent = label
        btn.addEventListener('click', () => {
          if (!keepOpen) closeNoteMenu()
          onClick()
        })
        noteMenu.appendChild(btn)
        return btn
      }
      addItem('打开', () => openStored(stored))
      addItem('定位', () => revealStored(stored))
      document.body.appendChild(noteMenu)
      const rect = noteMenu.getBoundingClientRect()
      noteMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`
      noteMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`
    }

    const S = {
      ready: false,
      notes: [],
      dirs: [],
      expanded: new Set(['']),
      query: '',
      tagFilter: [],
      tags: [],
      current: null,
      root: '',
      // Reading is the common case: open notes pre-rendered; 新建 switches to edit.
      view: 'preview',
      status: '',
      error: '',
      busy: false,
      dirty: false,
      saving: false,
      subs: new Set()
    }
    const emit = () => { for (const fn of S.subs) fn() }
    function subscribe(fn) {
      S.subs.add(fn)
      return () => S.subs.delete(fn)
    }
    /** Re-render this component on any store change. */
    function useStore() {
      const [, bump] = useState(0)
      useEffect(() => subscribe(() => bump((n) => n + 1)), [])
      return S
    }

    async function run(fn, okMessage) {
      S.busy = true
      S.error = ''
      emit()
      try {
        const result = await fn()
        if (okMessage) S.status = okMessage
        return result
      } catch (err) {
        S.error = String(err?.message ?? err)
        return undefined
      } finally {
        S.busy = false
        emit()
      }
    }

    async function reloadTags() {
      try {
        S.tags = await rpc('tags')
      } catch {
        /* the tag strip is cosmetic; never block on it */
      }
    }

    async function reloadDirs() {
      try {
        S.dirs = await rpc('listDirs')
      } catch {
        S.dirs = []
      }
    }

    /**
     * The tree is derived on every render from two flat lists — directories
     * that exist on disk (including empty ones) and notes with their `dir`.
     * Directories are the source of truth; a folder holding no note still shows.
     */
    function childDirsOf(path) {
      const prefix = path === '' ? '' : `${path}/`
      return S.dirs.filter((d) => {
        if (prefix === '') return !d.includes('/')
        if (!d.startsWith(prefix)) return false
        return !d.slice(prefix.length).includes('/')
      })
    }
    const notesIn = (path) => S.notes.filter((n) => (n.dir || '') === path)
    const dirName = (path) => (path === '' ? '全部笔记' : path.split('/').pop())
    const dirLeaf = (path) => (path === '' ? '' : path.split('/').pop())

    function toggleDir(path) {
      if (S.expanded.has(path)) {
        // Collapsing the root would hide the library entirely.
        if (path !== '') S.expanded.delete(path)
      } else {
        S.expanded.add(path)
      }
      emit()
    }

    /** Notes directly inside a directory (root: everything). */
    function notesUnder(path) {
      if (path === '') return S.notes
      const prefix = `${path}/`
      return S.notes.filter((n) => (n.dir || '') === path || (n.dir || '').startsWith(prefix))
    }

    async function reloadList() {
      const data = await run(() =>
        S.query.trim() === ''
          ? rpc('list', { tags: S.tagFilter })
          : rpc('search', { query: S.query, tags: S.tagFilter })
      )
      if (Array.isArray(data)) S.notes = data
      return data
    }

    async function openNote(id) {
      // Leaving a dirty note: persist it before loading the next one.
      if (dirtySince !== 0) await flushSave()
      const note = await run(() => rpc('get', { id }))
      if (note) {
        S.current = { id: note.id, title: note.title, body: note.body, tags: note.tags, files: note.files ?? [] }
        markClean()
        S.status = ''
      }
      emit()
    }

    async function openStored(stored) {
      try {
        /** 首选 dsh 内建 host.openPath（Electron shell，at-file 同款，能真正拉起默认程序）；
         *  拿不到 connection 时退回宿主 cmd start。 */
        let connection = null
        try { connection = kbCtx?.get?.('connection') ?? null } catch { connection = null }
        if (connection?.api?.host?.openPath) {
          const pathRes = await rpc('attachmentPath', { stored })
          const path = pathRes?.path
          if (!path) throw new Error('无法解析附件磁盘路径')
          const res = await connection.api.host.openPath({ path })
          if (!res?.result?.ok) throw new Error(res?.result?.error?.message ?? 'host.openPath 失败')
        } else {
          const res = await rpc('openAttachment', { stored })
          if (!res?.ok) throw new Error(res?.error ?? '未知原因')
        }
        S.status = `已用系统默认程序打开「${displayName(stored)}」`
      } catch (err) {
        S.error = `打开失败：${err?.message ?? err}`
      }
      emit()
    }

    async function revealStored(stored) {
      try {
        let connection = null
        try { connection = kbCtx?.get?.('connection') ?? null } catch { connection = null }
        if (connection?.api?.host?.showItemInFolder) {
          const pathRes = await rpc('attachmentPath', { stored })
          if (pathRes?.path) {
            await connection.api.host.showItemInFolder({ path: pathRes.path })
            S.status = `已在资源管理器中定位「${displayName(stored)}」`
            emit()
            return
          }
        }
        await rpc('revealAttachment', { stored })
        S.status = `已在资源管理器中定位「${displayName(stored)}」`
      } catch (err) {
        S.error = `定位失败：${err?.message ?? err}`
      }
      emit()
    }

    /* autosave:begin ---------------------------------------------------- */
    /**
     * Auto-save: every edit marks the store dirty and a debounce (see touch)
     * flushes it to disk; switching notes, closing the panel and window
     * teardown flush as well. The manual 保存 button / Ctrl+S remain as an
     * explicit flush. Snapshot-based: a flush whose content already matches
     * the last persisted state is a no-op.
     */
    let saveTimer = null
    let saveInFlight = false
    let saveQueued = false
    let saveQueuedManual = false
    let dirtySince = 0
    let lastSnapshot = ''
    let saveFailures = 0

    const snapshotOf = (c) => JSON.stringify([
      c?.id ?? '', c?.title ?? '', c?.body ?? '', c?.tags ?? [], c?.files ?? []
    ])

    function markClean() {
      dirtySince = 0
      S.dirty = false
      if (S.current) lastSnapshot = snapshotOf(S.current)
    }

    function markDirty() {
      if (dirtySince === 0) dirtySince = Date.now()
      S.dirty = true
    }

    function scheduleSave(delay = 900) {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => { saveTimer = null; void flushSave() }, delay)
    }

    /** Persist pending edits now (note switch, panel close, teardown). */
    async function flushSave() {
      if (!S.current || dirtySince === 0) return
      // Wait out an in-flight save first so nothing is captured half-saved.
      while (saveInFlight) await new Promise((resolve) => setTimeout(resolve, 40))
      if (snapshotOf(S.current) === lastSnapshot) {
        dirtySince = 0
        S.dirty = false
        return
      }
      await saveNote()
    }

    async function saveNote(opts = {}) {
      const manual = opts?.manual === true
      const cur = S.current
      if (!cur) return
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
      if (saveInFlight) {
        saveQueued = true
        // a manual request upgrades the queued rerun (status text + no shortcut)
        saveQueuedManual = saveQueuedManual || manual
        return
      }
      if (!manual && snapshotOf(cur) === lastSnapshot) {
        dirtySince = 0
        S.dirty = false
        return
      }
      saveInFlight = true
      S.saving = true
      S.error = ''
      emit()
      try {
        const saved = await rpc('save', {
          id: cur.id || undefined,
          title: cur.title,
          body: cur.body,
          tags: cur.tags,
          files: cur.files
        })
        // Edits made while the request was in flight must win over the
        // snapshot that was just written.
        const live = S.current
        const sameNote = Boolean(live && (live === cur || (cur.id !== '' && live.id === cur.id)))
        lastSnapshot = snapshotOf({ ...cur, id: saved.id, files: saved.files ?? cur.files })
        if (sameNote) {
          S.current = { ...live, id: saved.id, files: saved.files ?? live.files }
          const stillDirty = snapshotOf(S.current) !== lastSnapshot
          dirtySince = stillDirty ? Date.now() : 0
          S.dirty = stillDirty
          if (stillDirty) scheduleSave(400)  // trailing flush for mid-flight edits
        }
        const d = new Date()
        const pad = (n) => String(n).padStart(2, '0')
        S.status = manual
          ? '已保存'
          : `已自动保存 ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        saveFailures = 0
      } catch (err) {
        saveFailures += 1
        S.error = `保存失败：${err?.message ?? err}`
        // A few quiet retries for autosave; manual saves surface as-is and
        // any further edit re-arms the timer regardless.
        if (!manual && saveFailures < 3) scheduleSave(5000)
      } finally {
        saveInFlight = false
        S.saving = false
        emit()
      }
      if (saveQueued) {
        saveQueued = false
        const queuedManual = saveQueuedManual
        saveQueuedManual = false
        await saveNote({ manual: queuedManual })
      }
      await Promise.all([reloadList(), reloadTags()])
      emit()
    }
    /* autosave:end ------------------------------------------------------ */

    async function newNote() {
      // Persist the previous note before abandoning it.
      if (S.current && dirtySince !== 0) await flushSave()
      S.current = { id: '', title: '', body: '', tags: [] }
      S.view = 'edit'
      markClean()
      S.status = '新建笔记：填好标题后保存'
      emit()
    }

    function toggleTag(tag) {
      const at = S.tagFilter.indexOf(tag)
      if (at === -1) S.tagFilter.push(tag)
      else S.tagFilter.splice(at, 1)
      emit()
      reloadList()
    }

    const hostHint = (err) =>
      /unknown method/i.test(String(err?.message ?? err))
        ? '（宿主侧未加载新接口 —— 完全退出并重启 dsh 后可用）'
        : ''

    /** 小浮层输入：自定义新标签（可提前建好，之后随时加进笔记）。 */
    function promptAddTag(x, y) {
      closeNoteMenu()
      noteMenu = document.createElement('div')
      noteMenu.className = 'kb-menu'
      const input = document.createElement('input')
      input.className = 'kb-menu-input'
      input.placeholder = '新标签名（逗号可批量），回车确认'
      input.addEventListener('keydown', async (ev) => {
        ev.stopPropagation()
        if (ev.key === 'Escape') { closeNoteMenu(); return }
        if (ev.key !== 'Enter') return
        const name = input.value.trim()
        if (name === '') return
        closeNoteMenu()
        try {
          const res = await rpc('addTag', { name })
          const added = res?.added ?? []
          S.status = added.length > 0 ? `已添加标签：${added.join('、')}` : '标签已存在'
          await reloadTags()
        } catch (err) {
          S.error = `添加标签失败：${err?.message ?? err}${hostHint(err)}`
        }
        emit()
      })
      noteMenu.appendChild(input)
      document.body.appendChild(noteMenu)
      const rect = noteMenu.getBoundingClientRect()
      noteMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`
      noteMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`
      input.focus()
    }

    /** 删除标签：先确认，再从标签栏与所有笔记中一并移除。 */
    function confirmRemoveTag(tag, count, x, y) {
      closeNoteMenu()
      noteMenu = document.createElement('div')
      noteMenu.className = 'kb-menu'
      const add = (label, cls, fn) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = cls ? `kb-menu-item ${cls}` : 'kb-menu-item'
        btn.textContent = label
        btn.addEventListener('click', () => { closeNoteMenu(); fn() })
        noteMenu.appendChild(btn)
      }
      add(`删除标签「${tag}」${count > 0 ? `（从 ${count} 篇笔记移除）` : ''}`, 'kb-menu-danger', async () => {
        S.busy = true
        emit()
        try {
          const res = await rpc('removeTag', { name: tag })
          S.status = `已删除标签「${tag}」${res?.removedFromNotes ? `（${res.removedFromNotes} 篇笔记已更新）` : ''}`
          if (S.tagFilter.includes(tag)) S.tagFilter = S.tagFilter.filter((t) => t !== tag)
          await Promise.all([reloadTags(), reloadList()])
        } catch (err) {
          S.error = `删除标签失败：${err?.message ?? err}${hostHint(err)}`
        } finally {
          S.busy = false
          emit()
        }
      })
      add('取消', null, () => {})
      document.body.appendChild(noteMenu)
      const rect = noteMenu.getBoundingClientRect()
      noteMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`
      noteMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`
    }

    function touch(patch) {
      S.current = { ...S.current, ...patch }
      markDirty()
      scheduleSave()
      emit()
    }

    /* ------------------------------------------------------------------ */
    /* markdown — zero-dependency renderer producing React elements        */
    /* (no innerHTML anywhere: every token becomes a real element, so note */
    /*  content can never inject markup into the shell)                    */
    /* md:begin                                                           */
    /* ------------------------------------------------------------------ */

    const MD_FENCE_RE = /^\s*(`{3,}|~{3,})\s*(\S*)\s*$/
    const MD_HEADING_RE = /^(#{1,6})\s+(.+)$/
    const MD_HR_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/
    const MD_LIST_RE = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/
    const MD_TASK_RE = /^\[([ xX])\]\s*/

    const mdIndentOf = (line) => (/^\s*/.exec(line)[0] ?? '').length

    /** Strip the smallest common leading indent (nested list content). */
    function mdDedent(lines) {
      let min = Infinity
      for (const l of lines) {
        if (!/^\s*$/.test(l)) min = Math.min(min, mdIndentOf(l))
      }
      if (!Number.isFinite(min)) min = 0
      return lines.map((l) => l.slice(Math.min(min, mdIndentOf(l))))
    }

    /** Split a table row into trimmed cells, honouring `\|`. */
    function mdSplitRow(line) {
      let s = String(line).trim()
      if (s.startsWith('|')) s = s.slice(1)
      if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
      const cells = []
      let cur = ''
      for (let i = 0; i < s.length; i += 1) {
        if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i += 1; continue }
        if (s[i] === '|') { cells.push(cur.trim()); cur = ''; continue }
        cur += s[i]
      }
      cells.push(cur.trim())
      return cells
    }

    function mdIsTableSep(line) {
      if (!line || !line.includes('-') || !line.includes('|')) return false
      const cells = mdSplitRow(line)
      return cells.length >= 2 && cells.every((c) => /^:?-{2,}:?$/.test(c))
    }

    /** Inline markdown → array of React nodes / strings. */
    function mdInline(src) {
      const nodes = []
      let text = ''
      const flush = () => { if (text !== '') { nodes.push(text); text = '' } }
      const s = String(src ?? '')
      let i = 0
      while (i < s.length) {
        const ch = s[i]
        if (ch === '`') {
          const run = (/`+/.exec(s.slice(i)) ?? ['`'])[0]
          const end = s.indexOf(run, i + run.length)
          if (end !== -1) {
            flush()
            nodes.push(h('code', { className: 'kb-md-code', key: `c${nodes.length}` },
              s.slice(i + run.length, end).replace(/^ | $/g, '')))
            i = end + run.length
            continue
          }
          text += ch; i += 1; continue
        }
        if (ch === '*') {
          if (s[i + 1] === '*') {
            const end = s.indexOf('**', i + 2)
            if (end > i + 2) {
              flush()
              nodes.push(h('strong', { key: `b${nodes.length}` }, ...mdInline(s.slice(i + 2, end))))
              i = end + 2
              continue
            }
            text += '**'; i += 2; continue
          }
          const end = s.indexOf('*', i + 1)
          if (end > i + 1 && s[i + 1] !== ' ' && s[end - 1] !== ' ') {
            flush()
            nodes.push(h('em', { key: `i${nodes.length}` }, ...mdInline(s.slice(i + 1, end))))
            i = end + 1
            continue
          }
          text += ch; i += 1; continue
        }
        if (ch === '~' && s[i + 1] === '~') {
          const end = s.indexOf('~~', i + 2)
          if (end > i + 2) {
            flush()
            nodes.push(h('del', { key: `d${nodes.length}` }, ...mdInline(s.slice(i + 2, end))))
            i = end + 2
            continue
          }
          text += ch; i += 1; continue
        }
        if (ch === '!' && s[i + 1] === '[') {
          const close = s.indexOf(']', i + 2)
          if (close !== -1 && s[close + 1] === '(') {
            const closeP = s.indexOf(')', close + 2)
            if (closeP !== -1) {
              const url = s.slice(close + 2, closeP).trim().split(/\s+/)[0]
              const alt = s.slice(i + 2, close)
              flush()
              nodes.push(h('a', {
                className: 'kb-md-a', key: `img${nodes.length}`,
                href: url, target: '_blank', rel: 'noreferrer noopener', title: alt
              }, `🖼 ${alt || url}`))
              i = closeP + 1
              continue
            }
          }
          text += ch; i += 1; continue
        }
        if (ch === '[') {
          const close = s.indexOf(']', i + 1)
          if (close !== -1 && s[close + 1] === '(') {
            const closeP = s.indexOf(')', close + 2)
            if (closeP !== -1) {
              const url = s.slice(close + 2, closeP).trim().split(/\s+/)[0]
              const label = s.slice(i + 1, close)
              flush()
              nodes.push(h('a', {
                className: 'kb-md-a', key: `a${nodes.length}`,
                href: url, target: '_blank', rel: 'noreferrer noopener'
              }, ...(label ? mdInline(label) : [url])))
              i = closeP + 1
              continue
            }
          }
          text += ch; i += 1; continue
        }
        if (ch === 'h' && (i === 0 || /[\s(]/.test(s[i - 1]))) {
          const m = (/^https?:\/\/[^\s<>"'）)\]]+/.exec(s.slice(i)) ?? [])[0]
          if (m) {
            const url = m.replace(/[.,;:!?)\]」』】。，；！？、]+$/, '')
            flush()
            nodes.push(h('a', {
              className: 'kb-md-a', key: `l${nodes.length}`,
              href: url, target: '_blank', rel: 'noreferrer noopener'
            }, url))
            i += url.length
            continue
          }
        }
        text += ch; i += 1
      }
      flush()
      return nodes
    }

    /** One paragraph = several source lines joined with <br/>. */
    function mdInlineLines(lines, keyBase) {
      const out = []
      lines.forEach((line, idx) => {
        if (idx > 0) out.push(h('br', { key: `${keyBase}br${idx}` }))
        out.push(...mdInline(line))
      })
      return out
    }

    function mdTaskItem(text) {
      const m = MD_TASK_RE.exec(text)
      if (!m) return null
      return { done: m[1] !== ' ', rest: text.slice(m[0].length) }
    }

    /** Block-level parse: line array → React nodes. */
    function mdBlocks(lines, keyBase = 'b') {
      const out = []
      let i = 0
      const n = lines.length
      const key = () => `${keyBase}${out.length}`
      while (i < n) {
        const line = lines[i]
        if (/^\s*$/.test(line)) { i += 1; continue }

        const fenceM = MD_FENCE_RE.exec(line)
        if (fenceM) {
          const openCh = fenceM[1][0]
          const openLen = fenceM[1].length
          const closeRe = new RegExp(`^\\s*\\${openCh}{${openLen},}\\s*$`)
          const buf = []
          i += 1
          while (i < n && !closeRe.test(lines[i])) { buf.push(lines[i]); i += 1 }
          i += 1 // consume the closing fence (or run past EOF)
          while (buf.length > 0 && /^\s*$/.test(buf[buf.length - 1])) buf.pop()
          out.push(h('pre', { className: 'kb-md-pre', key: key() },
            fenceM[2] ? h('span', { className: 'kb-md-lang', key: 'lang' }, fenceM[2]) : null,
            h('code', { key: 'code' }, buf.join('\n'))
          ))
          continue
        }

        const headM = MD_HEADING_RE.exec(line)
        if (headM) {
          const lvl = headM[1].length
          const textH = headM[2].replace(/\s+#+\s*$/, '')
          out.push(h(`h${lvl}`, { className: `kb-md-h${lvl}`, key: key() }, ...mdInline(textH)))
          i += 1
          continue
        }

        if (MD_HR_RE.test(line)) {
          out.push(h('hr', { className: 'kb-md-hr', key: key() }))
          i += 1
          continue
        }

        if (/^\s*>/.test(line)) {
          const buf = []
          while (i < n && /^\s*>/.test(lines[i])) {
            buf.push(lines[i].replace(/^\s*>\s?/, ''))
            i += 1
          }
          out.push(h('blockquote', { className: 'kb-md-quote', key: key() },
            ...mdBlocks(buf, `${key}q`)))
          continue
        }

        if (line.includes('|') && i + 1 < n && mdIsTableSep(lines[i + 1])) {
          const header = mdSplitRow(line)
          const aligns = mdSplitRow(lines[i + 1]).map((c) => {
            const left = c.startsWith(':')
            const right = c.endsWith(':')
            return left && right ? 'center' : right ? 'right' : 'left'
          })
          i += 2
          const rows = []
          while (i < n && lines[i].includes('|') && !/^\s*$/.test(lines[i]) && !MD_FENCE_RE.test(lines[i])) {
            rows.push(mdSplitRow(lines[i]))
            i += 1
          }
          const cell = (txt, ci, Tag, cls, rk) => h(Tag, {
            className: cls, key: `${rk}c${ci}`,
            style: { textAlign: aligns[ci] ?? 'left' }
          }, ...mdInline(txt))
          out.push(h('table', { className: 'kb-md-table', key: key() },
            h('thead', { key: 'th' },
              h('tr', { key: 'thr' }, ...header.map((c, ci) => cell(c, ci, 'th', 'kb-md-th', 'th')))),
            h('tbody', { key: 'tb' },
              ...rows.map((r, ri) => h('tr', { key: `tr${ri}` },
                ...header.map((_, ci) => cell(r[ci] ?? '', ci, 'td', 'kb-md-td', `tr${ri}`)))))
          ))
          continue
        }

        const listM = MD_LIST_RE.exec(line)
        if (listM) {
          const baseIndent = listM[1].length
          // A list keeps one marker family: "- a" then "1. b" starts a NEW list.
          const listOrdered = /\d/.test(listM[2][0])
          const items = []
          while (i < n) {
            const cur = lines[i]
            if (/^\s*$/.test(cur)) {
              const nxt = lines[i + 1] ?? ''
              const nm = MD_LIST_RE.exec(nxt)
              if (nm && mdIndentOf(nxt) >= baseIndent && /\d/.test(nm[2][0]) === listOrdered) { i += 1; continue }
              break
            }
            const m = MD_LIST_RE.exec(cur)
            if (m) {
              if (m[1].length < baseIndent) break
              if (m[1].length === baseIndent) {
                if (/\d/.test(m[2][0]) !== listOrdered) break
                items.push({ ordered: listOrdered, text: m[3], cont: [] })
                i += 1
                continue
              }
              // deeper indent: nested list / item continuation
              items[items.length - 1].cont.push(cur)
              i += 1
              continue
            }
            if (items.length === 0) break
            items[items.length - 1].cont.push(cur)
            i += 1
          }
          out.push(h(listOrdered ? 'ol' : 'ul',
            { className: listOrdered ? 'kb-md-ol' : 'kb-md-ul', key: key() },
            ...items.map((it, idx) => {
              const kids = []
              const task = mdTaskItem(it.text)
              if (task) {
                kids.push(h('input', {
                  className: 'kb-md-check', key: 'chk', type: 'checkbox',
                  checked: task.done, disabled: true
                }))
              }
              const body = task ? task.rest : it.text
              if (body !== '') kids.push(...mdInline(body))
              if (it.cont.length > 0) {
                kids.push(...mdBlocks(mdDedent(it.cont), `${key}L${idx}`))
              }
              return h('li', { className: 'kb-md-li', key: `li${idx}` }, ...kids)
            })
          ))
          continue
        }

        // paragraph: gather until a blank line or another block starter
        const buf = [line]
        i += 1
        while (i < n) {
          const cur = lines[i]
          if (/^\s*$/.test(cur) || MD_FENCE_RE.test(cur) || MD_HEADING_RE.test(cur)
            || MD_HR_RE.test(cur) || /^\s*>/.test(cur) || MD_LIST_RE.test(cur)
            || (cur.includes('|') && i + 1 < n && mdIsTableSep(lines[i + 1]))) break
          buf.push(cur)
          i += 1
        }
        out.push(h('p', { className: 'kb-md-p', key: key() }, ...mdInlineLines(buf, `${key}p`)))
      }
      return out
    }

    /** Rendered note body; falls back to raw <pre> if parsing ever throws. */
    function MarkdownView(props) {
      const body = String(props.body ?? '')
      const nodes = React.useMemo(() => {
        const lines = body.replace(/\r\n?/g, '\n').split('\n')
        try {
          return mdBlocks(lines, 'md')
        } catch (err) {
          console.warn('[kb-lite] markdown render failed, showing raw', err?.message)
          return [h('pre', { className: 'kb-md-pre', key: 'raw' }, body)]
        }
      }, [body])
      return h('div', { className: props.className ? `kb-md ${props.className}` : 'kb-md' }, ...nodes)
    }

    /* md:end ------------------------------------------------------------ */

    /* ------------------------------------------------------------------ */
    /* components                                                          */
    /* ------------------------------------------------------------------ */

    function formatTime(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return ''
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    /** Compact relative time for list rows; the full stamp stays in the tooltip. */
    function humanTime(iso) {
      if (!iso) return ''
      const t = new Date(iso).getTime()
      if (Number.isNaN(t)) return ''
      const min = Math.floor((Date.now() - t) / 60000)
      if (min < 1) return '刚刚'
      if (min < 60) return `${min} 分钟前`
      const hr = Math.floor(min / 60)
      if (hr < 24) return `${hr} 小时前`
      const day = Math.floor(hr / 24)
      if (day === 1) return '昨天'
      if (day < 7) return `${day} 天前`
      const d = new Date(iso)
      const pad = (n) => String(n).padStart(2, '0')
      const year = d.getFullYear() === new Date().getFullYear() ? '' : `${d.getFullYear()}-`
      return `${year}${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }

    /** Tiny stroke icon set (currentColor, 24-grid). */
    const Ico = {
      search: () => h('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round'
      }, h('circle', { cx: 11, cy: 11, r: 7 }), h('path', { d: 'm20 20-3.5-3.5' })),
      plus: () => h('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 2.2, strokeLinecap: 'round'
      }, h('path', { d: 'M12 5v14M5 12h14' })),
      folder: () => h('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round'
      }, h('path', { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }))
    }

    function NoteRow(props) {
      const note = props.note
      const fileCount = (note.files ?? []).length
      return h('div', {
        className: `kb-item${props.selected ? ' kb-selected' : ''}`,
        style: { marginLeft: `${(props.depth ?? 0) * 10}px` },
        onClick: props.onClick,
        draggable: true,
        onDragStart: (ev) => {
          ev.dataTransfer.setData('text/plain', note.id)
          ev.dataTransfer.effectAllowed = 'move'
        },
        onContextMenu: (ev) => {
          ev.preventDefault()
          openNoteMenu(props.note, ev.clientX, ev.clientY)
        }
      },
        h('div', { className: 'kb-item-top' },
          h('div', { className: 'kb-item-title', title: note.title || '未命名笔记' },
            note.title || '未命名笔记'),
          h('span', { className: 'kb-time', title: formatTime(note.updated) }, humanTime(note.updated))
        ),
        note.excerpt ? h('div', { className: 'kb-item-excerpt' }, note.excerpt) : null,
        ((note.tags ?? []).length > 0 || fileCount > 0)
          ? h('div', { className: 'kb-item-meta' },
              ...(note.tags ?? []).slice(0, 4).map((t) => h('span', { key: t, className: 'kb-tag' }, t)),
              fileCount > 0 ? h('span', { className: 'kb-item-badge' }, `${fileCount} 附件`) : null
            )
          : null
      )
    }

        /**
     * One directory row plus, when expanded, its sub-directories and notes.
     * Dropping a note row onto a directory row moves it there.
     */
    function DirNode(props) {
      const s = useStore()
      const path = props.path
      const depth = props.depth ?? 0
      const open = s.expanded.has(path)
      const kids = childDirsOf(path)
      const notes = notesIn(path)
      const total = notesUnder(path).length

      return h('div', null,
        h('div', {
          className: `kb-tree-row${path === '' ? ' kb-tree-root' : ''}`,
          style: { paddingLeft: `${8 + depth * 14}px` },
          title: path === '' ? '根目录' : path,
          onClick: () => toggleDir(path),
          onDragOver: (ev) => {
            ev.preventDefault()
            ev.dataTransfer.dropEffect = 'move'
            ev.currentTarget.classList.add('kb-drop-target')
          },
          onDragLeave: (ev) => ev.currentTarget.classList.remove('kb-drop-target'),
          onDrop: async (ev) => {
            ev.preventDefault()
            ev.currentTarget.classList.remove('kb-drop-target')
            const id = ev.dataTransfer.getData('text/plain')
            if (!id || notes.some((n) => n.id === id)) return
            S.busy = true
            emit()
            try {
              await rpc('moveNote', { id, dir: path })
              S.status = `已移动到「${dirName(path)}」`
              S.expanded.add(path)
              await Promise.all([reloadList(), reloadDirs(), reloadTags()])
            } catch (err) {
              S.error = `移动失败：${err?.message ?? err}`
            } finally {
              S.busy = false
              emit()
            }
          },
          onContextMenu: (ev) => {
            ev.preventDefault()
            openDirMenu(path, ev.clientX, ev.clientY)
          }
        },
          h('span', { className: 'kb-tree-caret' }, kids.length + notes.length > 0 ? (open ? '▾' : '▸') : '·'),
          h('span', { className: 'kb-tree-name' }, dirName(path)),
          h('span', { className: 'kb-tree-count' }, String(total))
        ),
        open
          ? h('div', null,
              ...kids.map((k) => h(DirNode, { key: k, path: k, depth: depth + 1 })),
              ...notes.map((n) =>
                h(NoteRow, {
                  key: n.id,
                  note: n,
                  depth: depth + 1,
                  selected: s.current?.id === n.id,
                  onClick: () => openNote(n.id)
                })
              )
            )
          : null
      )
    }

    /** Create a subdirectory of `parent`; empty name becomes 新目录, deduped. */
    async function createSubDir(parent, name) {
      const base = String(name ?? '').trim() || '新目录'
      const scope = S.dirs.filter((d) => (parent === '' ? true : d.startsWith(`${parent}/`)))
      const taken = new Set(scope.map((d) => d.split('/').pop()))
      let finalName = base
      let counter = 2
      while (taken.has(finalName)) finalName = `${base} ${counter++}`
      const target = parent === '' ? finalName : `${parent}/${finalName}`
      try {
        await rpc('mkdirDir', { dir: target })
        S.expanded.add(parent)
        S.status = `已创建目录「${finalName}」`
        await reloadDirs()
      } catch (err) {
        S.error = `创建目录失败：${err?.message ?? err}`
      }
      emit()
    }

    function Editor() {
      const s = useStore()
      const cur = s.current
      // 'edit' shows the raw textarea, 'preview' renders the body as markdown.
      // The choice lives on the store so it survives switching notes.
      const view = s.view === 'preview' ? 'preview' : 'edit'

      useEffect(() => {
        const onKey = (ev) => {
          if ((ev.ctrlKey || ev.metaKey) && String(ev.key).toLowerCase() === 's') {
            ev.preventDefault()
            saveNote({ manual: true })
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [])

      if (!cur) {
        return h('div', { className: 'kb-empty kb-empty-editor' },
          h('svg', {
            viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
            strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round'
          },
            h('path', { d: 'M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z' }),
            h('path', { d: 'M14 2v4h4' }),
            h('path', { d: 'M8.5 12.5h7M8.5 16h5' })
          ),
          h('div', { className: 'kb-empty-title' }, '从左侧选一篇笔记，或点右上「新建笔记」'),
          h('div', { className: 'kb-empty-sub' },
            `库位置 ${s.root || '…'} —— 每篇一个 .md，可直接用外部编辑器改`),
          h('div', { className: 'kb-empty-hint' }, '把文件拖进窗口即可导入')
        )
      }

      return h('div', { className: 'kb-editor' },
        h('input', {
          className: 'kb-titleinput',
          placeholder: '标题',
          value: cur.title,
          onChange: (ev) => touch({ title: ev.target.value })
        }),
        h('div', { className: 'kb-editor-meta' },
          h('input', {
            className: 'kb-input kb-tagsinput',
            placeholder: '标签，用逗号分隔',
            value: (cur.tags ?? []).join(', '),
            onChange: (ev) => touch({ tags: ev.target.value.split(',') })
          }),
          h('button', {
            className: 'kb-btn kb-primary kb-save',
            title: '立即保存（平时停笔约 1 秒自动保存，Ctrl+S 随时可用）',
            onClick: () => saveNote({ manual: true }),
            disabled: s.busy
          }, cur.id ? '保存 · Ctrl+S' : '创建'),
          h('div', { className: 'kb-seg' },
            h('button', {
              className: `kb-seg-btn${view === 'edit' ? ' kb-seg-on' : ''}`,
              title: '编辑 Markdown 源文',
              onClick: () => { S.view = 'edit'; emit() }
            }, '编辑'),
            h('button', {
              className: `kb-seg-btn${view === 'preview' ? ' kb-seg-on' : ''}`,
              title: '渲染 Markdown 预览',
              onClick: () => { S.view = 'preview'; emit() }
            }, '预览')
          )
        ),
        view === 'preview'
          ? (String(cur.body ?? '').trim() !== ''
              ? h(MarkdownView, { body: cur.body })
              : h('div', { className: 'kb-md kb-md-empty' }, '（正文为空 —— 点「编辑」写点什么）'))
          : h('textarea', {
              className: 'kb-ta',
              placeholder: '正文（Markdown）',
              value: cur.body,
              onChange: (ev) => touch({ body: ev.target.value })
            }),
        (cur.files ?? []).length > 0
          ? h('div', { className: 'kb-files' },
              ...cur.files.map((stored) =>
                h('div', {
                  className: 'kb-file',
                  key: stored,
                  onContextMenu: (ev) => { ev.preventDefault(); openAttachmentMenu(stored, ev.clientX, ev.clientY) }
                },
                  h('span', { className: 'kb-file-name', title: displayName(stored) }, displayName(stored)),
                  h('button', {
                    className: 'kb-btn',
                    title: '用系统默认程序打开（Word / Excel / PDF 阅读器…），也可右键此文件选择「打开」',
                    onClick: () => openStored(stored)
                  }, '打开'),
                  h('button', {
                    className: 'kb-btn',
                    title: '在资源管理器中定位',
                    onClick: () => revealStored(stored)
                  }, '定位')
                )
              )
            )
          : null
      )
    }

    function KBPanel(props) {
      const s = useStore()
      const [dragging, setDragging] = useState(false)
      const [editingRoot, setEditingRoot] = useState(false)
      const [rootDraft, setRootDraft] = useState('')

      useEffect(() => {
        if (S.ready) return
        S.ready = true
        rpc('ping', {})
          .then((d) => { S.root = d?.stats?.root ?? ''; emit() })
          .catch(() => {})
        reloadDirs()
        reloadList().then(() => reloadTags())
      }, [])

      /** Drop any file(s) onto the library: text inlines, binaries attach. */
      const onDrop = async (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        setDragging(false)
        const files = [...(ev.dataTransfer?.files ?? [])]
        if (files.length === 0) return
        await importDroppedFiles(files)
      }

      const applyRoot = async () => {
        const next = rootDraft.trim()
        if (next === '') return
        setEditingRoot(false)
        S.busy = true
        emit()
        try {
          const data = await rpc('configure', { root: next, migrate: true })
          S.root = data?.stats?.root ?? next
          S.status = `库位置已改为 ${S.root}，旧笔记已复制过去`
          S.current = null
          await Promise.all([reloadList(), reloadTags()])
        } catch (err) {
          S.error = String(err?.message ?? err)
        } finally {
          S.busy = false
          emit()
        }
      }

      return h('div', {
        className: `kb-panel${dragging ? ' kb-drop-active' : ''}`,
        onDragOver: (ev) => { ev.preventDefault(); if (!dragging) setDragging(true) },
        onDragLeave: (ev) => { if (ev.currentTarget === ev.target) setDragging(false) },
        onDrop
      },
        h('div', { className: 'kb-header' },
          h('button', {
            className: 'kb-back',
            title: '回到聊天',
            onClick: () => props?.onClose?.()
          },
            h('span', { className: 'kb-back-ico' }, '‹'),
            '聊天'
          ),
          h('div', { className: 'kb-search' },
            Ico.search(),
            h('input', {
              className: 'kb-search-input',
              placeholder: '搜索标题 / 正文 / 标签…',
              value: s.query,
              onChange: (ev) => { S.query = ev.target.value; emit() },
              onKeyDown: (ev) => { if (ev.key === 'Enter') reloadList() }
            }),
            s.query
              ? h('button', {
                  className: 'kb-search-clear',
                  title: '清空搜索',
                  onClick: () => { S.query = ''; emit(); reloadList() }
                }, '×')
              : null
          ),
          h('div', { className: 'kb-actions' },
            h('button', {
              className: 'kb-btn',
              title: '清空搜索与标签筛选',
              onClick: () => { S.query = ''; S.tagFilter = []; emit(); reloadList() }
            }, '清空'),
            h('button', {
              className: 'kb-btn kb-primary',
              title: '新建一篇笔记',
              onClick: newNote
            }, Ico.plus(), '新建笔记')
          )
        ),
        s.tags.length > 0
          ? h('div', { className: 'kb-tagbar' },
              h('span', { className: 'kb-tagbar-label' }, '标签'),
              ...s.tags.slice(0, 18).map((t) =>
                h('button', {
                  key: t.tag,
                  className: `kb-chip${s.tagFilter.includes(t.tag) ? ' kb-chip-on' : ''}`,
                  title: `按「${t.tag}」筛选 · 悬停点 × 删除此标签`,
                  onClick: () => toggleTag(t.tag)
                },
                  t.tag,
                  t.count > 0 ? h('span', { className: 'kb-chip-count' }, String(t.count)) : null,
                  h('span', {
                    className: 'kb-chip-x',
                    title: '删除此标签（从所有笔记中移除）',
                    onClick: (ev) => {
                      ev.stopPropagation()
                      confirmRemoveTag(t.tag, t.count, ev.clientX, ev.clientY)
                    }
                  }, '×')
                )
              ),
              h('button', {
                className: 'kb-chip kb-chip-add',
                title: '自定义新标签：可提前建好，之后随时加进笔记',
                onClick: (ev) => promptAddTag(ev.clientX, ev.clientY)
              }, '＋ 标签'),
              s.tagFilter.length > 0
                ? h('button', {
                    className: 'kb-chip-clear',
                    title: '清除全部筛选',
                    onClick: () => { S.tagFilter = []; emit(); reloadList() }
                  }, '清除筛选')
                : null
            )
          : null,
        h('div', { className: 'kb-body' },
          h('div', { className: 'kb-side' },
            h('div', { className: 'kb-list' },
              s.dirs.length === 0 && s.notes.length === 0
                ? h('div', { className: 'kb-empty' },
                    s.busy ? '加载中…' : '还没有笔记\n点右上「新建笔记」，或把文件直接拖进来')
                : s.notes.map((n) =>
                    h(NoteRow, {
                      key: n.id,
                      note: n,
                      depth: 0,
                      selected: s.current?.id === n.id,
                      onClick: () => openNote(n.id)
                    })
                  )
            )
          ),
          h(Editor, null)
        ),
        h('div', { className: 'kb-statusbar' },
          editingRoot
            ? h('span', { className: 'kb-status' }, '新位置：')
            : h('button', {
                className: 'kb-root',
                title: s.root,
                onClick: () => { setRootDraft(s.root || ''); setEditingRoot(true) }
              },
                h('span', { className: 'kb-root-dot' }),
                `库位置 ${s.root || '…'} · 点击更改`),
          editingRoot
            ? h('input', {
                className: 'kb-input kb-root-input',
                value: rootDraft,
                placeholder: '例如 D:/我的笔记',
                onChange: (ev) => setRootDraft(ev.target.value),
                onKeyDown: (ev) => { if (ev.key === 'Enter') applyRoot() }
              })
            : null,
          editingRoot
            ? h('button', { className: 'kb-btn kb-primary', onClick: applyRoot, disabled: s.busy }, '保存并迁移')
            : null,
          editingRoot
            ? h('button', { className: 'kb-btn', onClick: () => setEditingRoot(false) }, '取消')
            : h('span', { className: 'kb-status' }, '把文件拖进窗口即可导入'),
          s.error ? h('span', { className: 'kb-status kb-err' }, s.error) : null,
          !editingRoot && !s.error && s.status ? h('span', { className: 'kb-status' }, s.status) : null,
          h('span', { className: 'kb-statusbar-spacer' }),
          s.busy ? h('span', { className: 'kb-status' }, '处理中…') : null
        ),
        dragging ? h('div', { className: 'kb-drop-hint' }, '松手即可导入为笔记') : null
      )
    }

    function KBIcon(props) {
      const size = props?.size ?? 16
      return h('div', { className: 'kb-icon', title: '随手笔记' },
        h('svg', {
          width: size,
          height: size,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        },
          h('path', { d: 'M2.5 3.2c0-.5.4-.9.9-.9h4.2c.5 0 .9.4.9.9v9.6c0 .5-.4.9-.9.9H3.4c-.5 0-.9-.4-.9-.9z' }),
          h('path', { d: 'M9.5 3.2c0-.5.4-.9.9-.9h2.2c.5 0 .9.4.9.9v9.6c0 .5-.4.9-.9.9h-2.2c-.5 0-.9-.4-.9-.9z' })
        )
      )
    }

    /**
     * Turn-tail occupant: one button per finished turn. Clicking runs the host
     * extraction (nothing is written), then offers an editable checklist and
     * only `save`s what the user kept checked.
     * phase: idle → loading → review | empty → writing → done
     */
    function WritebackTail(props) {
      const [phase, setPhase] = useState('idle')
      const [candidates, setCandidates] = useState([])
      const [edits, setEdits] = useState({})
      const [route, setRoute] = useState('')
      const [error, setError] = useState('')
      const [written, setWritten] = useState(0)
      // Attachment-scoped writeback: ask the host whether this turn carried a
      // user attachment. Until we know, render nothing; a plain text turn never
      // shows the button, so it cannot trigger a writeback at all.
      const [visible, setVisible] = useState(null)
      useEffect(() => {
        let alive = true
        rpc('has-attachment', { turn: props?.turn, seq: props?.seq })
          .then((val) => { if (alive) setVisible(val !== false) })
          .catch(() => { if (alive) setVisible(true) }) // fail open — never hide a real one
        return () => { alive = false }
      }, [props?.turn, props?.seq])

      if (visible === false) return null

      const run = async () => {
        setPhase('loading')
        setError('')
        try {
          const data = await rpc('extract', { turn: props?.turn, seq: props?.seq })
          if (!Array.isArray(data?.candidates) || data.candidates.length === 0) {
            setError(data?.skipped ? '本轮没有附件，无需回写' : '')
            setPhase('empty')
            return
          }
          const init = {}
          data.candidates.forEach((c, i) => {
            init[i] = { checked: true, title: c.title, tags: (c.tags ?? []).join(', ') }
          })
          setCandidates(data.candidates)
          setEdits(init)
          setRoute(`${data.route?.provider ?? ''}/${data.route?.model ?? ''}`)
          setPhase('review')
        } catch (err) {
          setError(String(err?.message ?? err))
          setPhase('idle')
        }
      }

      const confirm = async () => {
        setPhase('writing')
        let count = 0
        for (let i = 0; i < candidates.length; i += 1) {
          const edit = edits[i]
          if (!edit?.checked) continue
          try {
            await rpc('save', {
              title: edit.title,
              body: candidates[i].body,
              tags: edit.tags,
              source: 'conversation'
            })
            count += 1
          } catch (err) {
            setError(`第 ${i + 1} 条写入失败：${err?.message ?? err}`)
          }
        }
        setWritten(count)
        setPhase('done')
      }

      const patch = (i, part) => setEdits({ ...edits, [i]: { ...edits[i], ...part } })

      if (phase === 'idle') {
        return h('button', {
          className: 'kb-btn kb-tail-btn',
          title: '用 AI 从这一轮抽取可复用的知识点，确认后存入随手笔记',
          onClick: run
        }, error ? `重试抽取${error ? `（${error.slice(0, 60)}）` : ''}` : '存入随手笔记')
      }
      if (phase === 'loading') return h('span', { className: 'kb-tail-status' }, 'AI 抽取中…')
      if (phase === 'empty') return h('span', { className: 'kb-tail-status' }, error || '这一轮没有值得保存的知识点')
      if (phase === 'writing') return h('span', { className: 'kb-tail-status' }, '写入中…')
      if (phase === 'done') {
        return h('span', { className: 'kb-tail-status' },
          `已写入 ${written} 条` + (error ? `（${error}）` : '') + ' — 打开左栏「随手笔记」查看')
      }

      return h('div', { className: 'kb-tail' },
        h('div', { className: 'kb-tail-title' }, `AI 找到 ${candidates.length} 条候选：`),
        ...candidates.map((c, i) =>
          h('div', { className: 'kb-tail-item', key: i },
            h('label', { className: 'kb-tail-check' },
              h('input', {
                type: 'checkbox',
                checked: edits[i]?.checked ?? false,
                onChange: (ev) => patch(i, { checked: ev.target.checked })
              })
            ),
            h('div', { className: 'kb-tail-fields' },
              h('input', {
                className: 'kb-input',
                value: edits[i]?.title ?? '',
                placeholder: '标题',
                onChange: (ev) => patch(i, { title: ev.target.value })
              }),
              h('input', {
                className: 'kb-input kb-tail-tags',
                value: edits[i]?.tags ?? '',
                placeholder: '标签（逗号分隔）',
                onChange: (ev) => patch(i, { tags: ev.target.value })
              }),
              h(MarkdownView, { body: c.body, className: 'kb-tail-md' })
            )
          )
        ),
        h('div', { className: 'kb-row' },
          h('button', { className: 'kb-btn kb-primary', onClick: confirm }, '写入选中的'),
          h('button', { className: 'kb-btn', onClick: () => setPhase('idle') }, '取消'),
          h('span', { className: 'kb-tail-route' }, route)
        )
      )
    }

    /* ------------------------------------------------------------------ */
    /* plugin                                                              */
    /* ------------------------------------------------------------------ */

    exports.name = 'dsh-hand-note'
    /** Captured in apply(); lets helpers reach dsh services (connection…). */
    let kbCtx = null
    // Cordis service declaration — `ctx.slots` / `ctx.layout` are unreachable
    // without it (the guard facade whitelists nothing else).
    exports.inject = ['slots', 'layout', 'connection']

    exports.apply = (ctx) => {
      kbCtx = ctx
      installStyles()
      // Dismiss the note menu the way every desktop app does.
      window.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') closeNoteMenu()
      })
      document.addEventListener('mousedown', (ev) => {
        if (noteMenu && !noteMenu.contains(ev.target)) closeNoteMenu()
      })
      // Best-effort persist on teardown (app quit / page reload): the debounce
      // timer may never fire again, so beacon the dirty state to the RPC route.
      window.addEventListener('beforeunload', () => {
        if (!S.current || dirtySince === 0 || snapshotOf(S.current) === lastSnapshot) return
        try {
          const c = S.current
          const blob = new Blob([JSON.stringify({
            id: c.id || undefined, title: c.title, body: c.body, tags: c.tags, files: c.files
          })], { type: 'application/json' })
          navigator.sendBeacon(`${API}/save`, blob)
        } catch { /* best effort only */ }
      })

      const pick = (name) => ctx?.[name] ?? (typeof ctx?.get === 'function' ? ctx.get(name) : null)
      const slots = pick('slots')
      const layout = pick('layout')
      if (!slots || typeof slots.register !== 'function') {
        console.warn(`${TAG} no slots service — cannot mount`)
        return
      }
      console.log(`${TAG} apply; layout =`, Boolean(layout))

      const closePanel = () => {
        // Switching back to chat: persist pending edits before the panel unmounts.
        void flushSave()
        try {
          if (layout && typeof layout.selectPanel === 'function') {
            layout.selectPanel(null)
            return
          }
        } catch (err) {
          console.warn(`${TAG} selectPanel(null) failed`, err)
        }
        S.status = '无法返回聊天：layout 服务不可用'
        emit()
      }

      /**
       * Register into `name` once it is declared. The shell declares the
       * sidebar/conversation seats after plugins apply, so a direct register
       * throws "not declared"; `subscribe` is documented to accept subscriptions
       * ahead of declaration, and a short poll covers the gap around it.
       *
       * `optionVariants` is tried in order: the published 0.2.0-rc.2 types and
       * the running shell disagree about `conversation.chat.turnTail`
       * (types say chain-with-select, the shell validates it as a list needing
       * an id), so we carry both shapes rather than betting on one.
       */
      const registerWhenReady = (name, optionVariants, component) => {
        let done = false
        let lastError = null
        const attempt = () => {
          if (done) return true
          for (const options of optionVariants) {
            try {
              slots.register({ name, ...options }, component)
              done = true
              console.log(`${TAG} registered ${name}`)
              return true
            } catch (err) {
              lastError = err
            }
          }
          return false
        }
        if (attempt()) return
        if (typeof slots.subscribe === 'function') {
          const off = slots.subscribe(name, () => {
            if (attempt() && typeof off === 'function') off()
          })
        }
        let tries = 0
        const timer = window.setInterval(() => {
          tries += 1
          if (attempt()) {
            window.clearInterval(timer)
            return
          }
          if (tries >= 25) {
            window.clearInterval(timer)
            // Surface why: a malformed option shape would otherwise fail
            // silently forever.
            console.log(`${TAG} GIVE UP registering ${name} after ${tries} polls; last error:`, lastError?.message ?? lastError)
          }
        }, 400)
      }

      // 1. the library itself, as a centre-column panel
      registerWhenReady('main', [{ key: PANEL_ID }], () => h(KBPanel, { onClose: closePanel }))
      // 2. ONE sidebar entry, rendered by the shell exactly like its other
      //    panel rows (icon + label, full width). A second launcher at the
      //    sidebar foot was redundant and rendered as a cramped vertical chip,
      //    so it is gone.
      registerWhenReady('sidebar.panellist', [{ id: PANEL_ID, order: 40, label: '随手笔记' }], KBIcon)
      // 4. per-turn extraction entry at the end of each completed turn.
      //    `conversation.chat.turnTail` is a CHAIN slot, so it needs `select`;
      //    returning a truthy match claims every turn (we render our own
      //    single button rather than composing into someone else's selector).
      registerWhenReady('conversation.chat.turnTail', [
        { id: 'kb-writeback', select: () => true, priority: 5 },
        { select: () => true, priority: 5 },
        { id: 'kb-writeback', priority: 5 }
      ], WritebackTail)

      // Warm the channel so the first open feels instant.
      rpc('ping', {})
        .then((data) => console.log(`${TAG} rpc ok; notes =`, data?.stats?.count))
        .catch((err) => console.log(`${TAG} rpc FAILED: ${err?.message}`))
    }

    return exports
  }
})
