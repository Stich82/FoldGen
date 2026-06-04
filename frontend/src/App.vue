<template>
  <!-- Full-window glass background -->
  <div
    class="flex h-screen w-screen overflow-hidden select-none"
    :style="{ background: appBackground }"
    @keydown="onGlobalKey"
    tabindex="-1"
  >
    <!-- Animated gradient orbs for depth -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-2xl"
        :class="isLight ? 'opacity-[0.12]' : 'opacity-[0.07]'"
        style="background: var(--accent); will-change: auto"/>
      <div class="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-2xl"
        :class="isLight ? 'opacity-[0.08]' : 'opacity-[0.05]'"
        style="background: #9F7AEA"/>
    </div>

    <!-- Sidebar -->
    <Sidebar
      @import="importTemplate"
      @export="exportTemplate"
      @settings="showSettings = true"
      @help="showHelp = true"
      @new-template="createTemplate"
      @select-template="requestSelectTemplate"
      @duplicate-template="duplicateTemplate"
      @notify="(msg, icon) => notify(msg, icon)"
    />

    <!-- Main area -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- macOS title bar space -->
      <div class="titlebar-drag h-[52px] shrink-0 flex items-center px-4 border-b border-white/[0.05]">
        <div class="titlebar-no-drag ml-auto flex items-center gap-2 text-xs text-white/30">
          <span v-if="selectedName" class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full"
              :class="isDirty ? 'bg-amber-400' : 'bg-emerald-400'"/>
            {{ isDirty ? 'Modifiche non salvate' : 'Salvato' }}
          </span>
        </div>
      </div>

      <!-- Toolbar -->
      <Toolbar
        @scan="startScan"
        @move-up="doMoveUp"
        @move-down="doMoveDown"
        @promote="doPromote"
        @demote="doDemote"
        @add="openAdd"
        @rename="openRename"
        @delete="openDelete"
        @preview="showPreview = true"
      />

      <!-- Tree editor -->
      <TreeEditor
        :template-name="selectedName"
        :open-add="openAdd"
        :open-rename="openRename"
        :open-delete="openDelete"
      />

      <!-- Bottom bar -->
      <BottomBar
        @create-folders="createFolders"
        @generate-bat="generateBat"
        @generate-sh="generateSh"
      />
    </div>

    <!-- Modals -->
    <ScanDialog
      v-if="showScan"
      :source-path="scanPath"
      :nodes="scanNodes"
      @close="showScan = false"
      @save="saveScanTemplate"
    />

    <SettingsDialog
      v-if="showSettings"
      @close="showSettings = false"
    />

    <!-- Add element dialog -->
    <Teleport to="body">
      <div v-if="addDialog.visible" class="modal-overlay" @click.self="addDialog.visible = false">
        <div class="glass-strong rounded-2xl shadow-glass p-6 w-80 animate-fade-in">
          <h3 class="text-sm font-semibold mb-3">Nuovo elemento</h3>
          <div class="flex rounded-lg overflow-hidden border border-white/10 mb-4">
            <button
              v-for="opt in addTypeOptions"
              :key="opt.value"
              class="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs transition-colors duration-100"
              :class="addDialog.type === opt.value ? 'seg-active font-medium' : 'text-white/40 hover:text-white/70'"
              @click="addDialog.type = opt.value"
            >{{ opt.label }}</button>
          </div>
          <input v-model="addDialog.value" class="input-base mb-1.5" :placeholder="addPlaceholder"
            @keydown.enter="confirmAdd" @keydown.esc="addDialog.visible = false" ref="addInput"/>
          <p class="text-xs mb-4" :class="addError ? 'text-red-400' : 'text-white/40'">{{ addError || addHint }}</p>
          <div class="flex gap-2 justify-end">
            <button class="btn-ghost" @click="addDialog.visible = false">Annulla</button>
            <button class="btn-accent" :disabled="!!addError || !addDialog.value.trim()" @click="confirmAdd">Aggiungi</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Rename dialog -->
    <Teleport to="body">
      <div v-if="renameDialog.visible" class="modal-overlay" @click.self="renameDialog.visible = false">
        <div class="glass-strong rounded-2xl shadow-glass p-6 w-80 animate-fade-in">
          <h3 class="text-sm font-semibold mb-3">Rinomina</h3>
          <input v-model="renameDialog.value" class="input-base mb-1.5"
            @keydown.enter="confirmRename" @keydown.esc="renameDialog.visible = false" ref="renameInput"/>
          <p v-if="renameError" class="text-xs text-red-400 mb-3">{{ renameError }}</p>
          <div class="flex gap-2 justify-end mt-3">
            <button class="btn-ghost" @click="renameDialog.visible = false">Annulla</button>
            <button class="btn-accent" :disabled="!!renameError || !renameDialog.value.trim()" @click="confirmRename">Salva</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirmation -->
    <Teleport to="body">
      <div v-if="deleteDialog.visible" class="modal-overlay" @click.self="deleteDialog.visible = false">
        <div class="glass-strong rounded-2xl shadow-glass p-6 w-80 animate-fade-in">
          <h3 class="text-sm font-semibold mb-2">Elimina</h3>
          <p class="text-xs text-white/60 mb-4">{{ deleteDialog.label }} Usa Annulla (⌘Z) per ripristinare.</p>
          <div class="flex gap-2 justify-end">
            <button class="btn-ghost" @click="deleteDialog.visible = false">Annulla</button>
            <button class="btn-danger" @click="confirmDelete">Elimina</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ASCII tree preview -->
    <Teleport to="body">
      <div v-if="showPreview" class="modal-overlay" @click.self="showPreview = false">
        <div class="glass-strong rounded-2xl shadow-glass w-[460px] max-h-[80vh] flex flex-col animate-fade-in overflow-hidden">
          <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/10">
            <h2 class="text-base font-semibold">Anteprima struttura</h2>
            <button class="btn-ghost !p-1.5" @click="showPreview = false">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <pre class="flex-1 overflow-auto px-6 py-4 text-xs font-mono leading-5 text-white/80 whitespace-pre">{{ asciiPreview }}</pre>
          <div class="flex justify-end gap-2 px-6 py-4 border-t border-white/10">
            <button class="btn-accent" @click="copyPreview">{{ copied ? 'Copiato ✓' : 'Copia' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Generation destination confirmation -->
    <Teleport to="body">
      <div v-if="genConfirm.visible" class="modal-overlay" @click.self="genConfirm.visible = false">
        <div class="glass-strong rounded-2xl shadow-glass p-6 w-96 animate-fade-in">
          <h3 class="text-sm font-semibold mb-2">{{ genConfirm.title }}</h3>
          <p class="text-xs text-white/60 mb-2">Percorso di destinazione:</p>
          <p class="text-xs font-mono bg-white/5 rounded-lg px-3 py-2 mb-2 break-all">{{ genConfirm.path }}</p>
          <p v-if="genConfirm.note" class="text-[11px] text-amber-400/90 mb-4">⚠️ {{ genConfirm.note }}</p>
          <div v-else class="mb-2"/>
          <div class="flex gap-2 justify-end">
            <button class="btn-ghost" @click="genConfirm.visible = false">Annulla</button>
            <button class="btn-accent" @click="confirmGen">Conferma</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Unsaved changes when switching template -->
    <Teleport to="body">
      <div v-if="showSwitchDialog" class="modal-overlay">
        <div class="glass-strong rounded-2xl shadow-glass p-6 w-80 animate-fade-in">
          <h3 class="text-sm font-semibold mb-2">Modifiche non salvate</h3>
          <p class="text-xs text-white/60 mb-4">"{{ selectedName }}" ha modifiche non salvate. Vuoi salvarle prima di continuare?</p>
          <div class="flex flex-col gap-2">
            <button class="btn-accent justify-center" @click="saveAndSwitch">Salva e continua</button>
            <button class="btn-danger justify-center" @click="discardAndSwitch">Continua senza salvare</button>
            <button class="btn-ghost justify-center" @click="showSwitchDialog = false">Annulla</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Unsaved-changes on close -->
    <Teleport to="body">
      <div v-if="showCloseDialog" class="modal-overlay">
        <div class="glass-strong rounded-2xl shadow-glass p-6 w-80 animate-fade-in">
          <h3 class="text-sm font-semibold mb-2">Modifiche non salvate</h3>
          <p class="text-xs text-white/60 mb-4">Ci sono modifiche non salvate in "{{ selectedName }}". Vuoi salvarle prima di uscire?</p>
          <div class="flex flex-col gap-2">
            <button class="btn-accent justify-center" @click="saveAndQuit">Salva ed esci</button>
            <button class="btn-danger justify-center" @click="quitNow">Esci senza salvare</button>
            <button class="btn-ghost justify-center" @click="showCloseDialog = false">Annulla</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Help -->
    <Teleport to="body">
      <div v-if="showHelp" class="modal-overlay" @click.self="showHelp = false">
        <div class="glass-strong rounded-2xl shadow-glass w-96 animate-fade-in overflow-hidden">
          <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
            <h2 class="text-base font-semibold">Scorciatoie tastiera</h2>
            <button class="btn-ghost !p-1.5" @click="showHelp = false">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-6 py-4 space-y-2">
            <div v-for="[k,v] in shortcuts" :key="k" class="flex items-center justify-between text-sm">
              <span class="text-white/60">{{ v }}</span>
              <kbd class="px-2 py-0.5 rounded-md text-xs font-mono" style="background:rgba(127,127,127,0.18);border:1px solid rgba(127,127,127,0.28)">{{ k }}</kbd>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Toast ref="toast"/>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'

import Sidebar from '@/components/Sidebar.vue'
import Toolbar from '@/components/Toolbar.vue'
import TreeEditor from '@/components/TreeEditor.vue'
import BottomBar from '@/components/BottomBar.vue'
import ScanDialog from '@/components/ScanDialog.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import Toast from '@/components/Toast.vue'

import { useTemplatesStore } from '@/stores/templates'
import { useEditorStore } from '@/stores/editor'
import { useSettingsStore } from '@/stores/settings'
import {
  nodesToItems, itemsToNodes, toAsciiTree, flattenVisible,
  moveUp, moveDown, promote, demoteNode, findById,
} from '@/composables/useTree'
import type { Node } from '@/types'

import {
  ScanFolder, CreateFolders, GenerateBat, GenerateSh,
  ImportTemplate, ExportTemplate, OpenFileDialog, OpenFolderDialog, SaveFileDialog,
  ValidateName, SetDirty, QuitApp,
} from '../wailsjs/go/main/App'
import { EventsOn } from '../wailsjs/runtime/runtime'

// ─── Stores ───────────────────────────────────────────────────────────────────
const tplStore = useTemplatesStore()
const editorStore = useEditorStore()
const settingsStore = useSettingsStore()

const { selectedName, selected } = storeToRefs(tplStore)
const { tree, selectedId, isDirty } = storeToRefs(editorStore)

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await settingsStore.load()
  settingsStore.applyTheme()
  await tplStore.load()
  EventsOn('app:beforeclose', () => {
    if (editorStore.isDirty && selectedName.value) showCloseDialog.value = true
    else quitNow()
  })
})

watch(selected, (tpl) => {
  editorStore.setTree(tpl ? nodesToItems(tpl.tree) : [])
}, { immediate: true })

// Keep the Go side informed of dirty state for the close handler.
watch(isDirty, (d) => { SetDirty(d).catch(() => {}) })

// ─── Toast ────────────────────────────────────────────────────────────────────
const toast = ref<InstanceType<typeof Toast> | null>(null)
function notify(msg: string, icon = '✅') { toast.value?.show(msg, icon) }
/** Extracts a readable message from a Wails/JS rejection. */
function errMsg(e: any): string { return e?.message ?? (typeof e === 'string' ? e : String(e)) }

// ─── Template operations ──────────────────────────────────────────────────────
function createTemplate(name: string) { guardUnsaved(() => doCreateTemplate(name)) }
async function doCreateTemplate(name: string) {
  if (tplStore.list.some(t => t.template_name === name)) {
    notify(`Esiste già un template "${name}"`, '⚠️')
    tplStore.selectTemplate(name)
    return
  }
  await tplStore.save(name, [])
  tplStore.selectTemplate(name)
  notify(`Template "${name}" creato`)
}

function importTemplate() { guardUnsaved(doImportTemplate) }
async function doImportTemplate() {
  try {
    const path = await OpenFileDialog()
    if (!path) return
    const tpl = await ImportTemplate(path)
    if (!tpl.template_name) tpl.template_name = path.split(/[\\/]/).pop()?.replace(/\.json$/i, '') ?? 'Importato'
    await tplStore.save(tpl.template_name, tpl.tree)
    tplStore.selectTemplate(tpl.template_name)
    notify(`Template "${tpl.template_name}" importato`)
  } catch (e: any) { notify(errMsg(e), '❌') }
}

function duplicateTemplate(name: string) {
  guardUnsaved(async () => {
    try {
      await tplStore.duplicate(name)
      notify('Template duplicato')
    } catch (e: any) { notify(errMsg(e), '❌') }
  })
}

async function exportTemplate() {
  if (!selectedName.value) return
  try {
    const path = await SaveFileDialog(selectedName.value)
    if (!path) return
    await ExportTemplate(selectedName.value, path, itemsToNodes(tree.value) as any)
    notify('Template esportato')
  } catch (e: any) { notify(errMsg(e), '❌') }
}

// ─── Scan ────────────────────────────────────────────────────────────────────
const showScan = ref(false)
const scanPath = ref('')
const scanNodes = ref<Node[]>([])
const { settings } = storeToRefs(settingsStore)

const isLight = computed(() => settings.value.theme === 'light')
const appBackground = computed(() =>
  isLight.value
    ? 'linear-gradient(135deg, #F5F5F7 0%, #E8E8ED 50%, #F0F0F5 100%)'
    : 'linear-gradient(135deg, #0d0d12 0%, #111318 50%, #0f0f16 100%)'
)

function countNodes(ns: Node[]): number {
  return ns.reduce((s, n) => s + 1 + countNodes(n.children ?? []), 0)
}

async function startScan() {
  try {
    const path = await OpenFolderDialog()
    if (!path) return
    scanPath.value = path
    scanNodes.value = await ScanFolder(path, settings.value.scan_hidden, settings.value.scan_max_depth)
    showScan.value = true
    if (countNodes(scanNodes.value) >= 5000) {
      notify('Cartella molto grande: la scansione è stata troncata (~5000 elementi)', '⚠️')
    }
  } catch (e: any) { notify(errMsg(e), '❌') }
}

async function saveScanTemplate(name: string, nodes: Node[]) {
  await tplStore.save(name, nodes)
  tplStore.selectTemplate(name)
  showScan.value = false
  notify(`Template "${name}" salvato dalla scansione`)
}

// ─── Reorder (toolbar arrows, operate on the anchor) ──────────────────────────
// Only record undo / mark dirty when the move actually happens.
function doMoveUp() { const id = selectedId.value; if (id) editorStore.reorder(t => moveUp(t, id)) }
function doMoveDown() { const id = selectedId.value; if (id) editorStore.reorder(t => moveDown(t, id)) }
function doPromote() { const id = selectedId.value; if (id) editorStore.reorder(t => promote(t, id)) }
function doDemote() { const id = selectedId.value; if (id) editorStore.reorder(t => demoteNode(t, id)) }

// ─── Add dialog ───────────────────────────────────────────────────────────────
type AddType = 'child-folder' | 'sibling' | 'child-file'
const addTypeOptions: { value: AddType; label: string }[] = [
  { value: 'child-folder', label: 'Figlia' },
  { value: 'sibling', label: 'Adiacente' },
  { value: 'child-file', label: 'File' },
]
const addDialog = ref({ visible: false, value: '', type: 'child-folder' as AddType, anchorId: null as string | null })
const addInput = ref<HTMLInputElement | null>(null)
const addError = ref('')

const addHint = computed(() => {
  const root = !addDialog.value.anchorId
  switch (addDialog.value.type) {
    case 'child-folder': return root ? 'La cartella verrà aggiunta alla radice' : 'La cartella verrà aggiunta come figlia della selezione'
    case 'sibling': return root ? 'Verrà aggiunta alla radice' : "Verrà aggiunta dopo l'elemento selezionato, allo stesso livello"
    case 'child-file': return root ? 'Il file verrà creato alla radice' : "Il file verrà creato all'interno della selezione"
  }
})
const addPlaceholder = computed(() => addDialog.value.type === 'child-file' ? 'es. README.md' : 'es. NomeCartella')

function openAdd(opts: { mode: 'child' | 'sibling'; isFile: boolean; anchorId: string | null }) {
  const type: AddType = opts.mode === 'sibling' ? 'sibling' : (opts.isFile ? 'child-file' : 'child-folder')
  addDialog.value = { visible: true, value: '', type, anchorId: opts.anchorId ?? selectedId.value }
  addError.value = ''
  nextTick(() => addInput.value?.focus())
}

watch(() => addDialog.value.value, async (v) => { addError.value = await validate(v) })

async function confirmAdd() {
  const name = addDialog.value.value.trim()
  if (!name || addError.value) return
  editorStore.addNode({
    name,
    isFile: addDialog.value.type === 'child-file',
    mode: addDialog.value.type === 'sibling' ? 'sibling' : 'child',
    anchorId: addDialog.value.anchorId,
  })
  addDialog.value.visible = false
}

// ─── Rename dialog ──────────────────────────────────────────────────────────────
const renameDialog = ref({ visible: false, value: '', id: '' })
const renameInput = ref<HTMLInputElement | null>(null)
const renameError = ref('')

function openRename(id: string) {
  const node = findById(tree.value, id)
  if (!node) return
  renameDialog.value = { visible: true, value: node.name, id }
  renameError.value = ''
  nextTick(() => renameInput.value?.select())
}
watch(() => renameDialog.value.value, async (v) => { renameError.value = await validate(v) })

function confirmRename() {
  const name = renameDialog.value.value.trim()
  if (!name || renameError.value) { return }
  editorStore.renameNode(renameDialog.value.id, name)
  renameDialog.value.visible = false
}

// ─── Delete dialog ────────────────────────────────────────────────────────────
const deleteDialog = ref({ visible: false, label: '' })
function openDelete(ids: string[]) {
  if (!ids.length) return
  const label = ids.length === 1
    ? `Eliminare "${findById(tree.value, ids[0])?.name ?? ''}"?`
    : `Eliminare ${ids.length} elementi?`
  deleteDialog.value = { visible: true, label }
}
function confirmDelete() {
  editorStore.removeSelection()
  deleteDialog.value.visible = false
}

// ─── Live name validation ───────────────────────────────────────────────────────
async function validate(name: string): Promise<string> {
  const v = name.trim()
  if (!v) return ''
  try {
    const res = await ValidateName(v) as unknown as [boolean, string]
    return res[0] ? '' : res[1]
  } catch { return '' }
}

// ─── ASCII preview ──────────────────────────────────────────────────────────────
const showPreview = ref(false)
const copied = ref(false)
const asciiPreview = computed(() =>
  tree.value.length ? toAsciiTree(tree.value, selectedName.value ?? undefined) : '(vuoto)'
)
async function copyPreview() {
  try { await navigator.clipboard.writeText(asciiPreview.value); copied.value = true; setTimeout(() => copied.value = false, 1500) } catch {}
}

// ─── Generate (with destination confirmation) ─────────────────────────────────
const genConfirm = ref<{ visible: boolean; title: string; path: string; note: string; action: () => void }>({
  visible: false, title: '', path: '', note: '', action: () => {},
})

/** Joins a base path and a name using the separator already in use (so the
 *  preview shows consistent slashes on both Windows and Unix). */
function joinPath(base: string, name: string): string {
  const sep = base.includes('\\') && !base.includes('/') ? '\\' : '/'
  return `${base.replace(/[\\/]+$/, '')}${sep}${name}`
}

function createFolders(projectName: string, outputPath: string) {
  if (!projectName.trim() || !outputPath.trim()) return
  genConfirm.value = {
    visible: true, title: 'Creare le cartelle?', path: joinPath(outputPath, projectName),
    note: 'Eventuali file con lo stesso nome verranno sovrascritti.',
    action: () => runCreateFolders(projectName, outputPath),
  }
}
function generateBat(projectName: string, outputPath: string) {
  if (!projectName.trim() || !outputPath.trim()) return
  genConfirm.value = {
    visible: true, title: 'Generare lo script .bat?', path: joinPath(outputPath, `create_${projectName}.bat`),
    note: '', action: () => runGenerate('bat', projectName, outputPath),
  }
}
function generateSh(projectName: string, outputPath: string) {
  if (!projectName.trim() || !outputPath.trim()) return
  genConfirm.value = {
    visible: true, title: 'Generare lo script .sh?', path: joinPath(outputPath, `create_${projectName}.sh`),
    note: '', action: () => runGenerate('sh', projectName, outputPath),
  }
}
function confirmGen() { const a = genConfirm.value.action; genConfirm.value.visible = false; a() }

async function runCreateFolders(projectName: string, outputPath: string) {
  try {
    await CreateFolders(projectName, outputPath, itemsToNodes(tree.value) as any)
    notify(`Cartelle create in "${joinPath(outputPath, projectName)}"`, '📁')
  } catch (e: any) { notify(errMsg(e), '❌') }
}
async function runGenerate(kind: 'bat' | 'sh', projectName: string, outputPath: string) {
  try {
    const fn = kind === 'bat' ? GenerateBat : GenerateSh
    const path = await fn(projectName, outputPath, itemsToNodes(tree.value) as any)
    notify(`File .${kind} creato: ${path}`, '📄')
  } catch (e: any) { notify(errMsg(e), '❌') }
}

// ─── Modals ───────────────────────────────────────────────────────────────────
const showSettings = ref(false)
const showHelp = ref(false)

const shortcuts: [string, string][] = [
  ['⌘S', 'Salva template'],
  ['⌘O', 'Scansiona cartella'],
  ['⌘N', 'Aggiungi elemento'],
  ['⌘C / ⌘V', 'Copia / Incolla'],
  ['⌘D', 'Duplica'],
  ['⌘Z / ⌘Y', 'Annulla / Ripeti'],
  ['⌘A', 'Seleziona tutto'],
  ['F2', 'Rinomina'],
  ['Del', 'Elimina'],
  ['Alt+↑ ↓', 'Sposta su / giù'],
  ['Alt+← →', 'Promuovi / Depromuovi'],
  ['⇧/⌘ + click', 'Selezione multipla'],
]

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
function onGlobalKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement
  const inEditable = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable
  const cmd = e.metaKey || e.ctrlKey

  // Escape closes the top-most dismissable modal.
  if (e.key === 'Escape') {
    if (genConfirm.value.visible) { genConfirm.value.visible = false; return }
    if (showPreview.value) { showPreview.value = false; return }
    if (showHelp.value) { showHelp.value = false; return }
    if (showSwitchDialog.value) { showSwitchDialog.value = false; return }
    if (deleteDialog.value.visible) { deleteDialog.value.visible = false; return }
  }

  if (cmd && e.key === 's') { e.preventDefault(); saveCurrentTemplate(); return }
  if (cmd && e.key === 'o') { e.preventDefault(); startScan(); return }
  if (inEditable) return

  if (cmd && e.key === 'a') { e.preventDefault(); editorStore.selectRange(flattenVisible(tree.value).map(n => n.id)) }
  else if (cmd && e.key === 'n') { e.preventDefault(); openAdd({ mode: 'child', isFile: false, anchorId: selectedId.value }) }
  else if (cmd && e.key === 'c') { e.preventDefault(); editorStore.copySelection() }
  else if (cmd && e.key === 'v') { e.preventDefault(); editorStore.paste() }
  else if (cmd && e.key === 'd') { e.preventDefault(); editorStore.duplicateSelection() }
  else if (cmd && e.key === 'z') { e.preventDefault(); editorStore.undo() }
  else if (cmd && e.key === 'y') { e.preventDefault(); editorStore.redo() }
  else if (e.key === 'F2' && selectedId.value) { e.preventDefault(); openRename(selectedId.value) }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && editorStore.hasSelection) { e.preventDefault(); openDelete(editorStore.selectionRoots()) }
  else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); doMoveUp() }
  else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); doMoveDown() }
  else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); doPromote() }
  else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); doDemote() }
}

async function saveCurrentTemplate(): Promise<boolean> {
  if (!selectedName.value) return true
  try {
    await tplStore.save(selectedName.value, itemsToNodes(tree.value))
    editorStore.markClean()
    notify('Template salvato')
    return true
  } catch (e: any) { notify(errMsg(e), '❌'); return false }
}

// ─── Close handling ─────────────────────────────────────────────────────────────
const showCloseDialog = ref(false)
async function saveAndQuit() { if (await saveCurrentTemplate()) quitNow() }
function quitNow() { showCloseDialog.value = false; QuitApp().catch(() => {}) }

// ─── Unsaved-changes guard ─────────────────────────────────────────────────────
// Any action that would replace the current editor tree (switch / new / import /
// duplicate) goes through this guard so unsaved work is never silently lost.
const showSwitchDialog = ref(false)
const pendingAction = ref<null | (() => void | Promise<void>)>(null)

function guardUnsaved(action: () => void | Promise<void>) {
  if (isDirty.value && selectedName.value) {
    pendingAction.value = action
    showSwitchDialog.value = true
  } else {
    action()
  }
}
async function runPending() {
  const a = pendingAction.value
  pendingAction.value = null
  showSwitchDialog.value = false
  if (a) await a()
}
async function saveAndSwitch() { await saveCurrentTemplate(); await runPending() }
function discardAndSwitch() { runPending() }

function requestSelectTemplate(name: string) {
  if (name === selectedName.value) return
  guardUnsaved(() => tplStore.selectTemplate(name))
}
</script>
