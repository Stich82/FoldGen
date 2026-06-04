<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="glass-strong rounded-2xl shadow-glass w-[520px] max-h-[80vh] flex flex-col animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
        <div>
          <h2 class="text-base font-semibold">Scansione cartella</h2>
          <p class="text-xs text-white/40 mt-0.5 truncate max-w-[380px]">{{ sourcePath }}</p>
        </div>
        <button class="btn-ghost !p-1.5" @click="emit('close')">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="flex items-center gap-2 px-6 py-3 shrink-0 flex-wrap">
        <button class="btn-ghost text-xs" @click="selectAll(true)">Seleziona tutto</button>
        <button class="btn-ghost text-xs" @click="selectAll(false)">Deseleziona tutto</button>
        <label class="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer ml-1 select-none">
          <input type="checkbox" v-model="foldersOnly" class="accent-[var(--accent)] w-3.5 h-3.5"/> Solo cartelle
        </label>
        <button class="btn-ghost text-xs" title="Copia l'albero come testo (indice file)" @click="copyPreview">
          {{ copied ? 'Copiato ✓' : 'Copia anteprima' }}
        </button>
        <span class="ml-auto text-xs text-white/30">{{ checkedCount }} selezionate</span>
      </div>

      <!-- Tree -->
      <div class="flex-1 overflow-y-auto px-4 pb-2">
        <ScanNode
          v-for="node in scanTree"
          :key="node.id"
          :node="node"
          @toggle="toggleCheck"
          @expand="toggleExpand"
        />
      </div>

      <!-- Footer -->
      <div class="shrink-0 border-t border-white/10 px-6 py-4">
        <label class="block text-[10px] text-white/30 font-medium mb-1.5 uppercase tracking-wider">Nome template</label>
        <div class="flex gap-2">
          <input v-model="templateName" class="input-base text-sm" placeholder="Nome del template..." @keydown.enter="save"/>
          <button class="btn-accent shrink-0" :disabled="!templateName.trim()" @click="save">
            Salva template
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Node } from '@/types'

interface ScanItem {
  id: string
  name: string
  is_file: boolean
  checked: boolean
  expanded: boolean
  depth: number
  parentId: string | null
  children: ScanItem[]
}

const props = defineProps<{ sourcePath: string; nodes: Node[] }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', name: string, nodes: Node[]): void
}>()

const templateName = ref(props.sourcePath.split(/[\\/]/).pop() ?? '')
const foldersOnly = ref(true)   // by default only folders go into the template
const copied = ref(false)

let _ctr = 0
function buildScanTree(nodes: Node[], depth = 0, parentId: string | null = null): ScanItem[] {
  return (nodes ?? []).map(n => {
    const id = `s${++_ctr}`
    return {
      id,
      name: n.name,
      is_file: !!n.is_file,
      checked: true,
      expanded: depth < 1,
      depth,
      parentId,
      children: buildScanTree(n.children ?? [], depth + 1, id),
    }
  })
}

const scanTree = ref<ScanItem[]>(buildScanTree(props.nodes))

const checkedCount = computed(() => {
  let count = 0
  const walk = (items: ScanItem[]) => { for (const i of items) { if (i.checked) count++; walk(i.children) } }
  walk(scanTree.value)
  return count
})

function selectAll(val: boolean) {
  const walk = (items: ScanItem[]) => { for (const i of items) { i.checked = val; walk(i.children) } }
  walk(scanTree.value)
}

function toggleCheck(id: string) {
  const walk = (items: ScanItem[]): ScanItem | null => {
    for (const i of items) { if (i.id === id) return i; const f = walk(i.children); if (f) return f }
    return null
  }
  const item = walk(scanTree.value)
  if (!item) return
  item.checked = !item.checked
  const cascade = (items: ScanItem[], val: boolean) => { for (const i of items) { i.checked = val; cascade(i.children, val) } }
  cascade(item.children, item.checked)
}

function toggleExpand(id: string) {
  const walk = (items: ScanItem[]): ScanItem | null => {
    for (const i of items) { if (i.id === id) return i; const f = walk(i.children); if (f) return f }
    return null
  }
  const item = walk(scanTree.value)
  if (item) item.expanded = !item.expanded
}

function filterNodes(items: ScanItem[]): Node[] {
  return items
    .filter(i => i.checked && (!foldersOnly.value || !i.is_file))
    .map(i => {
      const n: Node = { name: i.name }
      if (i.is_file) n.is_file = true
      const sub = filterNodes(i.children)
      if (sub.length) n.children = sub
      return n
    })
}

function save() {
  if (!templateName.value.trim()) return
  emit('save', templateName.value.trim(), filterNodes(scanTree.value))
}

// Build a copyable ASCII tree of the CHECKED items (including files) — handy as
// a project file index, regardless of the "Solo cartelle" template option.
function buildAscii(items: ScanItem[], prefix = ''): string[] {
  const checked = items.filter(i => i.checked)
  const lines: string[] = []
  checked.forEach((i, idx) => {
    const last = idx === checked.length - 1
    lines.push(prefix + (last ? '└─ ' : '├─ ') + i.name + (i.is_file ? '' : '/'))
    if (i.children.length) lines.push(...buildAscii(i.children, prefix + (last ? '   ' : '│  ')))
  })
  return lines
}

async function copyPreview() {
  const root = (templateName.value.trim() || 'struttura') + '/'
  const text = [root, ...buildAscii(scanTree.value)].join('\n')
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {}
}
</script>

<!-- Recursive ScanNode sub-component -->
<script lang="ts">
import { defineComponent, h } from 'vue'

const ScanNode = defineComponent({
  name: 'ScanNode',
  props: { node: Object as () => any },
  emits: ['toggle', 'expand'],
  setup(props, { emit }) {
    return () => h('div', [
      h('div', {
        class: 'flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/5 cursor-pointer select-none',
        style: { paddingLeft: `${8 + props.node.depth * 16}px` },
      }, [
        h('button', {
          class: `w-4 h-4 flex items-center justify-center text-white/40 transition-transform ${props.node.expanded ? 'rotate-90' : ''}`,
          onClick: (e: Event) => { e.stopPropagation(); emit('expand', props.node.id) },
        }, (!props.node.is_file && props.node.children?.length)
          ? [h('svg', { class: 'w-3 h-3', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5', viewBox: '0 0 24 24' },
              [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M9 18l6-6-6-6' })])]
          : []),
        h('input', {
          type: 'checkbox',
          checked: props.node.checked,
          class: 'accent-[var(--accent)] w-3.5 h-3.5 shrink-0',
          onChange: () => emit('toggle', props.node.id),
        }),
        props.node.is_file
          ? h('svg', { class: 'w-3.5 h-3.5 text-white/40 shrink-0', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', viewBox: '0 0 24 24' },
              [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })])
          : h('svg', { class: 'w-3.5 h-3.5 text-[var(--accent)] shrink-0', fill: 'currentColor', viewBox: '0 0 20 20' },
              [h('path', { d: 'M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z' })]),
        h('span', { class: 'text-xs text-white/80 truncate' }, props.node.name),
      ]),
      ...(props.node.expanded
        ? (props.node.children ?? []).map((c: any) =>
            h(ScanNode, { node: c, onToggle: (id: string) => emit('toggle', id), onExpand: (id: string) => emit('expand', id) }))
        : []),
    ])
  },
})
export { ScanNode }
</script>
