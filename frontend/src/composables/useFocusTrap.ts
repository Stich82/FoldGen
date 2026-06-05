import { watch, type Ref } from 'vue'

/**
 * Confina la navigazione da tastiera dentro `container` mentre `active` è true.
 *
 * Implementazione robusta al timing del Teleport:
 * - Il listener è agganciato a `document` in fase di CAPTURE, così precede gli
 *   handler @keydown in bubbling (es. quello dell'albero) e non dipende dal fatto
 *   che il pannello teleportato sia già montato al momento dell'attach (gli
 *   elementi focusabili si leggono a event-time).
 * - All'attivazione il focus entra nel pannello dopo il paint (requestAnimationFrame).
 * - Se il focus sfugge fuori dal pannello, viene recuperato e il tasto bloccato,
 *   così nemmeno la prima freccia raggiunge l'albero sottostante.
 *
 * Al termine ripristina il focus all'elemento che lo aveva in precedenza.
 */
export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>) {
  let prev: HTMLElement | null = null

  const focusable = () =>
    Array.from(
      container.value?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((el) => !el.hasAttribute('disabled'))

  function onKeydown(e: KeyboardEvent) {
    if (!active.value || !container.value) return
    const els = focusable()
    if (!els.length) return
    const first = els[0]
    const last = els[els.length - 1]
    const cur = document.activeElement as HTMLElement
    // Focus sfuggito fuori dal modal (es. sull'albero): riportalo dentro e blocca il tasto.
    if (!container.value.contains(cur)) {
      e.preventDefault()
      first.focus()
      return
    }
    if (e.key !== 'Tab') return
    if (e.shiftKey && cur === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && cur === last) {
      e.preventDefault()
      first.focus()
    }
  }

  watch(active, (on) => {
    if (on) {
      prev = document.activeElement as HTMLElement
      document.addEventListener('keydown', onKeydown, true)
      requestAnimationFrame(() => focusable()[0]?.focus())
    } else {
      document.removeEventListener('keydown', onKeydown, true)
      prev?.focus()
      prev = null
    }
  })
}
