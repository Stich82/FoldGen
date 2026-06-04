<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Header / breadcrumb -->
    <div class="flex items-center gap-2 px-4 py-2 border-b border-white/[0.07] shrink-0">
      <svg class="w-3.5 h-3.5 text-white/30 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
      </svg>
      <span class="text-sm font-medium text-white/80 truncate min-w-0 flex-1">{{ templateName || '—' }}</span>
      <input
        v-if="tree.length"
        v-model="treeSearch"
        class="input-base !h-7 !py-1 text-xs shrink-0"
        style="width: clamp(120px, 22vw, 260px)"
        placeholder="Cerca cartelle..."
      />
      <span class="text-xs text-white/30 shrink-0">
        {{ stats.folders }} cartelle{{ stats.files ? ` · ${stats.files} file` : '' }}
        <template v-if="selectedIds.length > 1"> · {{ selectedIds.length }} selezionati</template>
      </span>
    </div>

    <!-- Tree scroll area -->
    <div
      ref="scrollEl"
      class="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1"
      @click.self="editorStore.clearSelection()"
      @keydown="onKeyDown"
      tabindex="0"
    >
      <div v-if="!tree.length" class="flex flex-col items-center justify-center h-full gap-3 text-white/25 select-none">
        <svg class="w-12 h-12 opacity-30" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
        </svg>
        <p class="text-sm">Nessun template selezionato</p>
        <p class="text-xs">Seleziona o crea un template dalla sidebar</p>
      </div>

      <TreeNode
        v-for="node in tree"
        :key="node.id"
        :node="node"
        :filter="matchSet"
        :search="treeSearch.trim().toLowerCase()"
        @select="onSelect"
        @toggle="toggleNode"
        @rename="renameNode"
        @context="openContext"
        @drag-start="onDragStart"
        @drag-over="onDragOver"
        @drag-leave="onDragLeave"
        @drop="onDrop"
      />
    </div>

    <!-- Context menu -->
    <Teleport to="body">
      <div v-if="ctx.visible" class="fixed inset-0 z-40" @click="closeContext" @contextmenu.prevent="closeContext"/>
      <div
        v-if="ctx.visible"
        class="fixed z-50 glass-strong rounded-xl shadow-glass overflow-hidden py-1 w-52 text-sm animate-fade-in"
        :style="{ top: ctx.y + 'px', left: ctx.x + 'px' }"
      >
        <template v-if="ctxSub === 'none'">
          <button v-if="!ctx.isFile" class="ctx-item" @click="act(() => props.openAdd({ mode: 'child', isFile: false, anchorId: ctx.id }))">
            <span class="ctx-ico">+</span> Aggiungi cartella figlia
          </button>
          <button v-if="!ctx.isFile" class="ctx-item" @click="act(() => props.openAdd({ mode: 'child', isFile: true, anchorId: ctx.id }))">
            <span class="ctx-ico">+</span> Aggiungi file
          </button>
          <button class="ctx-item" @click="act(() => props.openAdd({ mode: 'sibling', isFile: false, anchorId: ctx.id }))">
            <span class="ctx-ico">⤢</span> Aggiungi adiacente
          </button>
          <div class="ctx-sep"/>
          <button class="ctx-item" @click="act(() => props.openRename(ctx.id))">
            <span class="ctx-ico">✎</span> Rinomina
          </button>
          <button class="ctx-item" @click="act(() => editorStore.duplicateSelection(ctx.id))">
            <span class="ctx-ico">⧉</span> Duplica
          </button>
          <button class="ctx-item" @click="act(() => editorStore.copySelection(ctx.id))">
            <span class="ctx-ico">⧉</span> Copia
          </button>
          <button class="ctx-item" :disabled="!canPaste" @click="act(() => editorStore.paste())">
            <span class="ctx-ico">📋</span> Incolla
          </button>
          <button class="ctx-item justify-between" @click.stop="ctxSub = 'move'">
            <span><span class="ctx-ico">⤳</span> Sposta in…</span> <span class="text-white/30">›</span>
          </button>
          <button v-if="!ctx.isFile" class="ctx-item justify-between" @click.stop="ctxSub = 'color'">
            <span><span class="ctx-ico">🎨</span> Colore</span> <span class="text-white/30">›</span>
          </button>
          <div class="ctx-sep"/>
          <button class="ctx-item text-red-400 hover:!bg-red-500/10" @click="act(() => props.openDelete(targetIds(ctx.id)))">
            <span class="ctx-ico">🗑</span> Elimina
          </button>
        </template>

        <!-- Move submenu -->
        <template v-else-if="ctxSub === 'move'">
          <button class="ctx-item text-white/50" @click.stop="ctxSub = 'none'">‹ Indietro</button>
          <div class="ctx-sep"/>
          <div class="max-h-60 overflow-y-auto">
            <button class="ctx-item" @click="act(() => editorStore.moveSelectionInto(null, ctx.id))">
              <span class="ctx-ico">⌂</span> Radice (livello principale)
            </button>
            <button
              v-for="t in moveTargets"
              :key="t.id"
              class="ctx-item"
              :style="{ paddingLeft: `${12 + t.depth * 12}px` }"
              @click="act(() => editorStore.moveSelectionInto(t.id, ctx.id))"
            >
              <span class="ctx-ico">📁</span> {{ t.name }}
            </button>
            <div v-if="!moveTargets.length" class="px-4 py-2 text-xs text-white/30">Nessuna destinazione</div>
          </div>
        </template>

        <!-- Color submenu -->
        <template v-else-if="ctxSub === 'color'">
          <button class="ctx-item text-white/50" @click.stop="ctxSub = 'none'">‹ Indietro</button>
          <div class="ctx-sep"/>
          <div class="flex flex-wrap gap-1.5 px-3 py-2">
            <button
              v-for="c in PALETTE"
              :key="c"
              class="w-5 h-5 rounded-full ring-1 ring-white/20 hover:scale-110 transition-transform"
              :style="{ background: c }"
              @click="act(() => editorStore.setColor(ctx.id, c))"
            />
            <button
              class="w-5 h-5 rounded-full flex items-center justify-center text-white/60 hover:text-white"
              style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18)"
              title="Colore automatico"
              @click="act(() => editorStore.setColor(ctx.id, null))"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import TreeNode from './TreeNode.vue'
import { useEditorStore } from '@/stores/editor'
import { storeToRefs } from 'pinia'
import {
  findById, detach, insertBefore, insertAfter, insertInto,
  isAncestor, recalcDepths, flattenVisible, topLevelSelected,
} from '@/composables/useTree'
import type { DropPosition, TreeItem } from '@/types'

const PALETTE = ['#4F8EF7', '#A78BFA', '#34D399', '#FB923C', '#F87171', '#FBBF24', '#38BDF8', '#A3E635']

const props = defineProps<{
  templateName: string | null
  openAdd: (opts: { mode: 'child' | 'sibling'; isFile: boolean; anchorId: string | null }) => void
  openRename: (id: string) => void
  openDelete: (ids: string[]) => void
}>()

const editorStore = useEditorStore()
const { tree, stats, selectedIds, canPaste } = storeToRefs(editorStore)

const scrollEl = ref<HTMLElement | null>(null)

// ─── Tree search ──────────────────────────────────────────────────────────────
const treeSearch = ref('')

// Reset the search when switching template, otherwise a stale term keeps the
// new tree filtered (and it can look empty).
watch(() => props.templateName, () => { treeSearch.value = '' })

// Set of node ids to display: matching nodes plus all their ancestors.
// null when search is empty (no filtering).
const matchSet = computed<Set<string> | null>(() => {
  const term = treeSearch.value.trim().toLowerCase()
  if (!term) return null
  const set = new Set<string>()
  const addAncestors = (id: string) => {
    let pid = findById(tree.value, id)?.parentId ?? null
    while (pid) { set.add(pid); pid = findById(tree.value, pid)?.parentId ?? null }
  }
  const walk = (nodes: TreeItem[]) => {
    for (const n of nodes) {
      if (n.name.toLowerCase().includes(term)) { set.add(n.id); addAncestors(n.id) }
      walk(n.children)
    }
  }
  walk(tree.value)
  return set
})

// ─── Selection ──────────────────────────────────────────────────────────────
function onSelect({ id, additive, range }: { id: string; additive: boolean; range: boolean }) {
  if (range && editorStore.selectedId) {
    const visible = flattenVisible(tree.value)
    const a = visible.findIndex(n => n.id === editorStore.selectedId)
    const b = visible.findIndex(n => n.id === id)
    if (a >= 0 && b >= 0) {
      const [lo, hi] = a < b ? [a, b] : [b, a]
      editorStore.selectRange(visible.slice(lo, hi + 1).map(n => n.id))
      return
    }
  }
  if (additive) editorStore.toggleSelect(id)
  else editorStore.selectOnly(id)
}

function toggleNode(id: string) {
  const node = findById(tree.value, id)
  if (node) node.expanded = !node.expanded
}

function renameNode({ id, name }: { id: string; name: string }) {
  editorStore.renameNode(id, name)
}

// ─── Context menu ─────────────────────────────────────────────────────────────
const ctx = ref({ visible: false, x: 0, y: 0, id: '', isFile: false })
const ctxSub = ref<'none' | 'move' | 'color'>('none')

function openContext({ id, x, y }: { id: string; x: number; y: number }) {
  if (!editorStore.isSelected(id)) editorStore.selectOnly(id)
  const node = findById(tree.value, id)
  ctx.value = { visible: true, x: Math.min(x, window.innerWidth - 220), y: Math.min(y, window.innerHeight - 360), id, isFile: !!node?.is_file }
  ctxSub.value = 'none'
}

function closeContext() { ctx.value.visible = false; ctxSub.value = 'none' }

/** Runs a context action then closes the menu. */
function act(fn: () => void) { fn(); closeContext() }

/** Ids affected by an action: the whole selection if the target is part of it. */
function targetIds(id: string): string[] {
  return editorStore.isSelected(id) ? editorStore.selectionRoots() : [id]
}

// Candidate folders for "Sposta in…": every folder that is not part of the
// moving selection nor a descendant of it.
const moveTargets = computed(() => {
  const moving = targetIds(ctx.value.id)
  const out: { id: string; name: string; depth: number }[] = []
  const walk = (nodes: TreeItem[]) => {
    for (const n of nodes) {
      if (n.is_file) continue
      const blocked = moving.includes(n.id) || moving.some(mid => isAncestor(tree.value, mid, n.id))
      if (!blocked) out.push({ id: n.id, name: n.name, depth: n.depth })
      walk(n.children)
    }
  }
  walk(tree.value)
  return out
})

// ─── Keyboard navigation ──────────────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  if (!editorStore.selectedId) return
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault()
    navigateTree(e.key === 'ArrowUp' ? -1 : 1)
  }
  if (e.key === 'ArrowLeft') {
    const node = findById(tree.value, editorStore.selectedId)
    if (node && node.expanded) { e.preventDefault(); node.expanded = false }
    else if (node?.parentId) { e.preventDefault(); editorStore.selectOnly(node.parentId) }
  }
  if (e.key === 'ArrowRight') {
    const node = findById(tree.value, editorStore.selectedId)
    if (node && !node.is_file) { e.preventDefault(); node.expanded = true }
  }
}

function navigateTree(dir: 1 | -1) {
  const allVisible = flattenVisible(tree.value)
  const idx = allVisible.findIndex(n => n.id === editorStore.selectedId)
  const next = allVisible[idx + dir]
  if (next) editorStore.selectOnly(next.id)
}

// ─── Drag & Drop (with multi-select + spring-loaded folders) ──────────────────
let springTimer: ReturnType<typeof setTimeout> | null = null
let springId: string | null = null

function clearSpring() {
  if (springTimer) { clearTimeout(springTimer); springTimer = null }
  springId = null
}

function onDragStart(id: string) {
  if (!editorStore.isSelected(id)) editorStore.selectOnly(id)
  editorStore.drag = { sourceId: id, targetId: null, position: 'into' }
}

function onDragOver({ id, y, height }: { id: string; y: number; height: number }) {
  if (id === editorStore.drag.sourceId) return
  if (isAncestor(tree.value, editorStore.drag.sourceId!, id)) return

  let pos: DropPosition
  if (y < height * 0.25) pos = 'before'
  else if (y > height * 0.75) pos = 'after'
  else pos = 'into'

  editorStore.drag.targetId = id
  editorStore.drag.position = pos

  // Spring-loaded: hovering "into" a collapsed folder auto-expands it.
  const node = findById(tree.value, id)
  if (pos === 'into' && node && !node.is_file && !node.expanded) {
    if (springId !== id) {
      clearSpring()
      springId = id
      springTimer = setTimeout(() => {
        const n = findById(tree.value, id)
        if (n && !n.is_file) n.expanded = true
        clearSpring()
      }, 600)
    }
  } else {
    clearSpring()
  }
}

function onDragLeave(id: string) {
  if (editorStore.drag.targetId === id) editorStore.drag.targetId = null
  if (springId === id) clearSpring()
}

function onDrop(dropTargetId: string) {
  clearSpring()
  const { sourceId, targetId, position } = editorStore.drag
  const resetDrag = () => { editorStore.drag = { sourceId: null, targetId: null, position: 'into' } }
  if (!sourceId || !targetId) { resetDrag(); return }

  // Determine the moving set: whole selection when dragging a selected item.
  const moving = editorStore.isSelected(sourceId)
    ? topLevelSelected(tree.value, editorStore.selectedIds)
    : [sourceId]

  if (moving.includes(targetId) || moving.some(mid => isAncestor(tree.value, mid, targetId))) {
    resetDrag(); return
  }

  editorStore.pushUndo()
  const nodes = moving.map(id => detach(tree.value, id)).filter((n): n is TreeItem => !!n)

  if (position === 'into') {
    for (const n of nodes) insertInto(tree.value, targetId, n)
  } else if (position === 'before') {
    for (const n of nodes) insertBefore(tree.value, targetId, n)
  } else {
    let ref = targetId
    for (const n of nodes) { insertAfter(tree.value, ref, n); ref = n.id }
  }

  recalcDepths(tree.value)
  editorStore.selectRange(nodes.map(n => n.id))
  resetDrag()
}
</script>

<style scoped>
.ctx-item { @apply w-full flex items-center gap-2 text-left px-4 py-1.5 transition; }
.ctx-item:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 22%, transparent); }
.ctx-item:disabled { opacity: 0.4; pointer-events: none; }
.ctx-ico { @apply inline-block w-4 text-center text-white/50 shrink-0; }
.ctx-sep { @apply h-px my-1 mx-2; background: rgba(127,127,127,0.2); }
</style>
