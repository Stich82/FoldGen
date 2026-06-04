import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { type Template, type Node } from '@/types'
import {
  GetTemplates, SaveTemplate, DeleteTemplate,
  RenameTemplate, DuplicateTemplate,
} from '../../wailsjs/go/main/App'

export const useTemplatesStore = defineStore('templates', () => {
  const list = ref<Template[]>([])
  const selectedName = ref<string | null>(null)

  const selected = computed(() =>
    list.value.find(t => t.template_name === selectedName.value) ?? null
  )

  async function load() {
    try {
      const templates = await GetTemplates()
      list.value = templates ?? []
      if (list.value.length && !selectedName.value) {
        selectedName.value = list.value[0].template_name
      }
    } catch {}
  }

  async function save(name: string, tree: Node[]) {
    await SaveTemplate(name, tree as any)
    const idx = list.value.findIndex(t => t.template_name === name)
    if (idx >= 0) list.value[idx].tree = tree
    else list.value.push({ template_name: name, tree })
  }

  async function remove(name: string) {
    await DeleteTemplate(name)
    list.value = list.value.filter(t => t.template_name !== name)
    if (selectedName.value === name) {
      selectedName.value = list.value[0]?.template_name ?? null
    }
  }

  async function rename(oldName: string, newName: string) {
    await RenameTemplate(oldName, newName)
    const t = list.value.find(t => t.template_name === oldName)
    if (t) t.template_name = newName
    if (selectedName.value === oldName) selectedName.value = newName
  }

  async function duplicate(name: string) {
    const tpl = await DuplicateTemplate(name)
    const idx = list.value.findIndex(t => t.template_name === tpl.template_name)
    if (idx >= 0) list.value[idx] = tpl
    else list.value.push(tpl)
    selectedName.value = tpl.template_name
  }

  function selectTemplate(name: string) {
    selectedName.value = name
  }

  return { list, selectedName, selected, load, save, remove, rename, duplicate, selectTemplate }
})
