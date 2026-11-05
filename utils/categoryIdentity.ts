// Ownership suffixes are stable selector keys, never student-facing labels.
export function categoryDisplayName(category: string): string {
  return category.replace(/ ⟦(?:document|module):[^⟧]+⟧$/, "")
}

// Upgrade old name-only selections only when they identify one category.
export function resolveCategoryPriorities(values: string[], topics: any[]): string[] {
  const keys = new Set(topics.map(t => t.category_key || t.category))
  const result = new Set<string>()
  for (const value of values || []) {
    if (keys.has(value)) { result.add(value); continue }
    const matches = new Set(topics.filter(t => t.category === value).map(t => t.category_key || t.category))
    if (matches.size === 1) result.add([...matches][0])
  }
  return [...result]
}
