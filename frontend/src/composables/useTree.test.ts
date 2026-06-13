import { describe, it, expect } from 'vitest'
import { siblingNameExists, uniqueChildName } from './useTree'
import type { TreeItem } from '@/types'

/** Minimal folder TreeItem for pure-function tests. */
function folder(id: string, name: string): TreeItem {
  return { id, name, is_file: false, children: [], depth: 0, parentId: null, expanded: false }
}

function siblings(...names: string[]): TreeItem[] {
  return names.map((n, i) => folder(`n${i}`, n))
}

describe('siblingNameExists', () => {
  it('finds an exact duplicate', () => {
    expect(siblingNameExists(siblings('Acme Engineering'), 'Acme Engineering')).toBe(true)
  })

  it('finds a case-only duplicate', () => {
    expect(siblingNameExists(siblings('Acme'), 'acme')).toBe(true)
  })

  it('finds a sanitize-only duplicate (forbidden chars normalized to _)', () => {
    // "A:B" sanitizes to "A_B", which already exists as a sibling.
    expect(siblingNameExists(siblings('A_B'), 'A:B')).toBe(true)
  })

  it('respects exceptId', () => {
    const list = [folder('keep', 'Sample Project')]
    expect(siblingNameExists(list, 'Sample Project', 'keep')).toBe(false)
    expect(siblingNameExists(list, 'Sample Project', 'other')).toBe(true)
  })

  it('returns false for an empty list or blank name', () => {
    expect(siblingNameExists([], 'Anything')).toBe(false)
    expect(siblingNameExists(siblings('Acme'), '   ')).toBe(false)
  })
})

describe('uniqueChildName', () => {
  it('returns a free name unchanged', () => {
    expect(uniqueChildName(siblings('Acme'), 'Beta')).toBe('Beta')
  })

  it('appends (copy) when the name is taken', () => {
    expect(uniqueChildName(siblings('Acme'), 'Acme')).toBe('Acme (copy)')
  })

  it('produces (copy 2) when name and (copy) both exist', () => {
    expect(uniqueChildName(siblings('Acme', 'Acme (copy)'), 'Acme')).toBe('Acme (copy 2)')
  })

  it('climbs up to (copy 3) with three collisions', () => {
    const list = siblings('Acme', 'Acme (copy)', 'Acme (copy 2)')
    expect(uniqueChildName(list, 'Acme')).toBe('Acme (copy 3)')
  })

  it('strips the copy suffix when the base is free', () => {
    expect(uniqueChildName(siblings('Beta'), 'Report (copy)')).toBe('Report')
    expect(uniqueChildName(siblings('Beta'), 'Report (copy 5)')).toBe('Report')
  })

  it('never nests progressives', () => {
    expect(uniqueChildName(siblings('Report'), 'Report (copy)')).toBe('Report (copy)')
    expect(uniqueChildName(siblings('Report', 'Report (copy)'), 'Report (copy)')).toBe('Report (copy 2)')
  })

  it('excludes exceptId from the comparison', () => {
    const list = [folder('self', 'Acme')]
    expect(uniqueChildName(list, 'Acme', 'self')).toBe('Acme')
  })
})
