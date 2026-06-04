<template>
  <div v-if="!filter || filter.has(node.id)">
    <!-- Row -->
    <div
      :class="rowClasses"
      :style="{ paddingLeft: `${8 + node.depth * 18}px` }"
      @click="onClick"
      @dblclick="startRename"
      @contextmenu.prevent.stop="onContext"
      @dragstart="onDragStart"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      draggable="true"
    >
      <!-- Chevron / leaf icon -->
      <button
        v-if="!node.is_file"
        class="w-4 h-4 flex items-center justify-center shrink-0 text-white/40 hover:text-white/80 transition-transform duration-150"
        :class="node.expanded ? 'rotate-90' : ''"
        @click.stop="emit('toggle', node.id)"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
        </svg>
      </button>
      <span v-else class="w-4 h-4 shrink-0"/>

      <!-- Folder / file icon -->
      <span class="w-4 h-4 shrink-0 flex items-center justify-center">
        <svg v-if="node.is_file" class="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <svg v-else class="w-3.5 h-3.5" viewBox="0 0 20 20"
          :fill="folderStyle.fill"
          :stroke="folderStyle.stroke || 'none'"
          :stroke-width="folderStyle.stroke ? 1.5 : 0">
          <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
        </svg>
      </span>

      <!-- Name / inline rename (with search-match highlight) -->
      <span v-if="!editing" class="flex-1 truncate text-[13px] leading-5">
        <template v-if="nameParts">{{ nameParts.pre }}<span class="hl-match">{{ nameParts.mid }}</span>{{ nameParts.post }}</template>
        <template v-else>{{ node.name }}</template>
      </span>
      <input
        v-else
        ref="renameRef"
        v-model="editValue"
        class="flex-1 bg-transparent border-none outline-none text-[13px] leading-5 text-white"
        @blur="commitRename"
        @keydown.enter="commitRename"
        @keydown.esc="cancelRename"
        @click.stop
      />
    </div>

    <!-- Children (recursive) — force-expanded while filtering -->
    <template v-if="!node.is_file && (node.expanded || !!filter)">
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :filter="filter"
        :search="search"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
        @rename="emit('rename', $event)"
        @context="emit('context', $event)"
        @drag-start="emit('drag-start', $event)"
        @drag-over="emit('drag-over', $event)"
        @drag-leave="emit('drag-leave', $event)"
        @drop="emit('drop', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { type TreeItem } from '@/types'
import { useEditorStore } from '@/stores/editor'
import { useSettingsStore } from '@/stores/settings'
import { depthShades } from '@/composables/useTree'

const props = defineProps<{ node: TreeItem; filter?: Set<string> | null; search?: string }>()

const emit = defineEmits<{
  (e: 'select', payload: { id: string; additive: boolean; range: boolean }): void
  (e: 'toggle', id: string): void
  (e: 'rename', payload: { id: string; name: string }): void
  (e: 'context', payload: { id: string; x: number; y: number }): void
  (e: 'drag-start', id: string): void
  (e: 'drag-over', payload: { id: string; y: number; height: number }): void
  (e: 'drag-leave', id: string): void
  (e: 'drop', id: string): void
}>()

const editorStore = useEditorStore()
const settingsStore = useSettingsStore()

// ─── Folder color ───────────────────────────────────────────────────────────
// Returns the fill/stroke for the folder glyph based on the active color mode.
// A per-node `color` override always wins (filled).
const folderStyle = computed<{ fill: string; stroke: string }>(() => {
  if (props.node.color) return { fill: props.node.color, stroke: '' }
  const s = settingsStore.settings
  const mode = s.color_mode ?? 'depth'
  if (mode === 'single') return { fill: s.single_color || '#4F8EF7', stroke: '' }
  if (mode === 'palette') {
    const pal = s.palette?.length ? s.palette : ['#4F8EF7']
    return { fill: pal[props.node.depth % pal.length], stroke: '' }
  }
  // depth-gradient mode
  const shades = depthShades(s.depth_primary || '#2563EB')
  const d = props.node.depth
  if (d <= 2) return { fill: shades[d], stroke: '' }
  return { fill: '#FFFFFF', stroke: shades[Math.min(d - 3, 2)] }
})

// ─── Search highlight ─────────────────────────────────────────────────────────
// Splits the name around the matched term so it can be highlighted.
const nameParts = computed(() => {
  const term = props.search
  if (!term) return null
  const idx = props.node.name.toLowerCase().indexOf(term)
  if (idx < 0) return null
  return {
    pre: props.node.name.slice(0, idx),
    mid: props.node.name.slice(idx, idx + term.length),
    post: props.node.name.slice(idx + term.length),
  }
})

// ─── Styling ──────────────────────────────────────────────────────────────────
const rowClasses = computed(() => {
  const base = 'tree-row'
  const sel = editorStore.isSelected(props.node.id) ? 'selected' : ''
  const drag =
    editorStore.drag.targetId === props.node.id
      ? `drag-over-${editorStore.drag.position}`
      : ''
  return [base, sel, drag].filter(Boolean).join(' ')
})

// ─── Selection + context ──────────────────────────────────────────────────────
function onClick(e: MouseEvent) {
  emit('select', { id: props.node.id, additive: e.metaKey || e.ctrlKey, range: e.shiftKey })
}

function onContext(e: MouseEvent) {
  emit('context', { id: props.node.id, x: e.clientX, y: e.clientY })
}

// ─── Drag & drop ─────────────────────────────────────────────────────────────
function onDragStart(e: DragEvent) {
  e.dataTransfer?.setData('text/plain', props.node.id)
  emit('drag-start', props.node.id)
}

function onDragOver(e: DragEvent) {
  const el = (e.currentTarget as HTMLElement)
  const rect = el.getBoundingClientRect()
  emit('drag-over', { id: props.node.id, y: e.clientY - rect.top, height: rect.height })
}

function onDragLeave() {
  emit('drag-leave', props.node.id)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  emit('drop', props.node.id)
}

// ─── Inline rename ────────────────────────────────────────────────────────────
const editing = ref(false)
const editValue = ref('')
const renameRef = ref<HTMLInputElement | null>(null)

function startRename() {
  editValue.value = props.node.name
  editing.value = true
  nextTick(() => { renameRef.value?.select() })
}

function commitRename() {
  editing.value = false
  const v = editValue.value.trim()
  if (v && v !== props.node.name) emit('rename', { id: props.node.id, name: v })
}

function cancelRename() {
  editing.value = false
}

defineExpose({ startRename })
</script>

<style scoped>
.hl-match {
  background: color-mix(in srgb, var(--accent) 45%, transparent);
  border-radius: 3px;
  padding: 0 1px;
  font-weight: 600;
}
</style>
