import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { type Settings, type ColorMode, resolveAccent } from '@/types'
import { GetSettings, SaveSettings } from '../../wailsjs/go/main/App'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({
    accent: '#4F8EF7',
    accent_custom: [],
    font_size: 13,
    default_output: '',
    scan_hidden: false,
    scan_max_depth: 30,
    theme: 'dark',
    color_mode: 'depth',
    palette: ['#4F8EF7', '#A78BFA', '#34D399', '#FB923C'],
    depth_primary: '#2563EB',
    single_color: '#4F8EF7',
  })

  async function load() {
    try {
      const loaded = await GetSettings()
      settings.value = {
        ...settings.value,
        ...loaded,
        accent: resolveAccent(loaded.accent),
        accent_custom: loaded.accent_custom ?? [],
        theme: loaded.theme || 'dark',
        color_mode: (loaded.color_mode as ColorMode) || 'depth',
        palette: loaded.palette?.length ? loaded.palette : settings.value.palette,
      }
    } catch {}
  }

  async function save() {
    try {
      await SaveSettings(settings.value)
    } catch {}
    applyTheme()
  }

  function applyTheme() {
    const root = document.documentElement
    root.style.setProperty('--accent', resolveAccent(settings.value.accent))
    root.style.setProperty('--font-size', `${settings.value.font_size}px`)
    root.dataset.theme = settings.value.theme || 'dark'
  }

  // Live preview: re-apply whenever any visual setting changes.
  watch(() => [settings.value.accent, settings.value.theme, settings.value.font_size], applyTheme)

  return { settings, load, save, applyTheme }
})
