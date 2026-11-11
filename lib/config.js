/**
 * dsh-hand-note · where the library lives
 *
 * The note root is user-configurable, so the setting cannot live inside the
 * library itself (moving the library would move the setting with it). It goes
 * to a fixed path in the portable home — $DSH_HOME when set, else the user
 * profile — outside the library, so it survives moves and stays findable. No
 * drive letter is assumed: the defaults work on any machine, any platform.
 *
 * Resolution order: config file → DEFAULT_ROOT (and the file is written on
 * first use so the UI can show a real, editable value).
 */

import { readFileSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Portable home: $DSH_HOME when set, else the user profile. Always writable. */
const HOME = process.env.DSH_HOME?.trim() || homedir()

export const DEFAULT_ROOT = join(HOME, 'dsh随手笔记')
export const CONFIG_PATH = join(HOME, 'dsh-hand-note.json')
export const LOG_PATH = join(HOME, 'dsh-hand-note.log')
const NOTES_SUBDIR = 'notes'
const TRASH_SUBDIR = '.trash'

/**
 * Every place a config file may live, in lookup order. The desktop shell's
 * environment is not stable across launches — a normal start and a
 * post-update reload may disagree about DSH_HOME — so the root must never
 * depend on which variant happens to read the file. Every reader checks all
 * candidates before falling back to DEFAULT_ROOT; every write mirrors to all
 * of them, so they always agree.
 */
const CONFIG_CANDIDATES = [...new Set([
  CONFIG_PATH,
  join(homedir(), 'dsh-hand-note.json'),
  'E:\\dsh-tools\\dsh-hand-note.json' // 0.2.x legacy location
])]

/** @returns {{root: string, savedAt?: string, configPath: string}} */
export function readConfig() {
  for (const path of CONFIG_CANDIDATES) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8'))
      if (parsed && typeof parsed.root === 'string' && parsed.root.trim() !== '') {
        return { root: parsed.root.trim(), savedAt: parsed.savedAt, configPath: path }
      }
    } catch {
      /* missing or corrupt file — try the next known location */
    }
  }
  return { root: DEFAULT_ROOT, configPath: CONFIG_PATH }
}

/** Write the config to every known location so all readers stay in sync. */
export async function writeConfig(root) {
  const payload = { root, savedAt: new Date().toISOString() }
  const text = `${JSON.stringify(payload, null, 2)}\n`
  for (const path of CONFIG_CANDIDATES) {
    try {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, text, 'utf8')
    } catch {
      /* one location being unwritable must not break the others */
    }
  }
  return payload
}

/**
 * Copy the library from one root to another, keeping ids (file names):
 *   notes/  — recursively (sub-directories are real categories);
 *   files/  — attachments, flat (<id>--<name>);
 *   .trash/ — deleted notes, flat.
 * Best-effort per file: one unreadable file must not abort the whole move.
 * @returns {{copied: number, skipped: number, from: string, to: string}}
 */
export async function migrateLibrary(fromRoot, toRoot) {
  let copied = 0
  let skipped = 0

  const copyInto = async (fromDir, toDir, sub) => {
    let names = []
    try {
      names = await readdir(fromDir, { withFileTypes: true })
    } catch {
      return // source side does not exist — nothing to carry
    }
    await mkdir(toDir, { recursive: true })
    for (const item of names) {
      const from = join(fromDir, item.name)
      const to = join(toDir, item.name)
      if (item.isDirectory()) {
        if (sub) await copyInto(from, to, true)
        continue
      }
      if (!item.name.endsWith('.md')) continue
      try {
        await copyFile(from, to)
        copied += 1
      } catch {
        skipped += 1
      }
    }
  }

  // notes/ walks its whole tree; files/ and .trash/ are flat.
  await copyInto(join(fromRoot, NOTES_SUBDIR), join(toRoot, NOTES_SUBDIR), true)
  await copyInto(join(fromRoot, 'files'), join(toRoot, 'files'), false)
  await copyInto(join(fromRoot, TRASH_SUBDIR), join(toRoot, TRASH_SUBDIR), false)
  return { copied, skipped, from: fromRoot, to: toRoot }
}
