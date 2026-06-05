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
 * Anello di focus visibile: WKWebView (WebKit/Safari, usato da Wails su macOS) NON
 * applica `:focus-visible` agli elementi messi a fuoco programmaticamente via
 * `.focus()`. Per questo il trap applica una classe esplicita `kbd-focus`
 * all'elemento che mette a fuoco (e la toglie dal precedente). Un click del mouse
 * (`pointerdown`) la rimuove, così l'anello compare solo durante la navigazione da
 * tastiera, mai col mouse.
 *
 * Al termine ripristina il focus all'elemento che lo aveva in precedenza.
 */
export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>) {
  let prev: HTMLElement | null = null
  let marked: HTMLElement | null = null

  const focusable = () =>
    Array.from(
      container.value?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((el) => !el.hasAttribute('disabled'))

  function clearMark() {
    marked?.classList.remove('kbd-focus')
    marked = null
  }

  function focusWithMark(el: HTMLElement) {
    clearMark()
    el.focus()
    el.classList.add('kbd-focus')
    marked = el
  }

  function onKeydown(e: KeyboardEvent) {
    if (!active.value || !container.value) return
    const cur = document.activeElement as HTMLElement
    // Focus sfuggito fuori dal modal (es. sull'albero): riportalo dentro e blocca il tasto.
    if (!container.value.contains(cur)) {
      e.preventDefault()
      const first = focusable()[0]
      if (first) focusWithMark(first)
      return
    }
    if (e.key !== 'Tab') return
    const els = focusable()
    if (!els.length) return
    // Controllo totale del Tab dentro il modal: niente traversal nativo del browser.
    e.preventDefault()
    const idx = els.indexOf(cur) // -1 se il focus è sul pannello stesso o su un punto neutro
    if (idx === -1) {
      focusWithMark(els[e.shiftKey ? els.length - 1 : 0])
      return
    }
    focusWithMark(els[(idx + (e.shiftKey ? -1 : 1) + els.length) % els.length])
  }

  // Interazione col mouse: rimuove l'anello da tastiera.
  function onPointerdown() {
    clearMark()
  }

  watch(active, (on) => {
    if (on) {
      prev = document.activeElement as HTMLElement
      document.addEventListener('keydown', onKeydown, true)
      document.addEventListener('pointerdown', onPointerdown, true)
      requestAnimationFrame(() => {
        const first = focusable()[0]
        if (first) focusWithMark(first)
      })
    } else {
      document.removeEventListener('keydown', onKeydown, true)
      document.removeEventListener('pointerdown', onPointerdown, true)
      clearMark()
      prev?.focus()
      prev = null
    }
  })
}
