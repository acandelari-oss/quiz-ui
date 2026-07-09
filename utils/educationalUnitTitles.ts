export const EDUCATIONAL_UNIT_THRESHOLD = 7
export const EDUCATIONAL_UNIT_MIN_SIZE = 2
export const EDUCATIONAL_UNIT_MAX_SIZE = 5

const FORBIDDEN_TITLE_TERMS = [
  "area",
  "connected",
  "areas",
  "and more",
  "group",
  "unit",
  "educational unit",
  "collection",
  "topics"
]

const GENERIC_TITLE_WORDS = new Set([
  "conceptual",
  "foundations",
  "foundation",
  "foundational",
  "principles",
  "principle",
  "concepts",
  "concept",
  "general",
  "theoretical",
  "theory",
  "overview",
  "introduction",
  "introductory",
  "core",
  "basics",
  "basic",
  "fundamentals",
  "fundamental",
  "quadro",
  "concettuale",
  "concettuali",
  "fondamenti",
  "principi",
  "generali",
  "generale",
  "teorico",
  "teorici",
  "introduzione",
  "panoramica",
  "nucleo",
  "base"
])

const OVERLY_GENERIC_TITLE_PATTERNS = [
  /\bconceptual foundations?\b/i,
  /\bfoundational principles?\b/i,
  /\btheoretical foundations?\b/i,
  /\bgeneral concepts?\b/i,
  /\bcore concepts?\b/i,
  /\bgeneral topics?\b/i,
  /\bcore foundations?\b/i,
  /\bconceptual framework\b/i,
  /\bquadro concettuale\b/i,
  /\bfondamenti concettuali\b/i,
  /\bprincipi fondamentali\b/i,
  /\bnucleo teorico\b/i,
  /\bconcetti generali\b/i,
  /\bargomenti generali\b/i
]

const ITALIAN_MARKERS = [
  "diritto",
  "procedimento",
  "processo",
  "indagini",
  "contabilità",
  "aziendale",
  "penale",
  "civile"
]

const STOP_WORDS = new Set([
  "and",
  "of",
  "the",
  "for",
  "in",
  "to",
  "di",
  "del",
  "della",
  "dei",
  "degli",
  "delle",
  "e",
  "la",
  "il",
  "lo",
  "le",
  "gli"
])

export type EducationalUnitGroup<T> = {
  key: string
  title: string
  showTitle: boolean
  items: T[]
}

export type EducationalUnitChapter = {
  title: string
  categories: string[]
}

export type EducationalUnitPlanValidation = {
  valid: boolean
  educationalUnits: EducationalUnitChapter[]
  error?: string
}

export function buildEducationalUnitGroups<T>(
  items: T[],
  getCategory: (item: T) => string,
  language?: string | null
): EducationalUnitGroup<T>[] {
  if (items.length < EDUCATIONAL_UNIT_THRESHOLD) {
    return [
      {
        key: "categories",
        title: "Categories",
        showTitle: false,
        items
      }
    ]
  }

  const semanticGroups = buildSemanticCategoryGroups(items, getCategory)

  return semanticGroups.map((unitItems, index) => {
    const categories = unitItems.map(getCategory)

    return {
      key: `${index + 1}:${categories.join("|")}`,
      title: buildFallbackEducationalUnitTitle(categories, language),
      showTitle: true,
      items: unitItems
    }
  })
}

export function buildDeterministicEducationalUnits(
  categories: string[],
  language?: string | null
): EducationalUnitChapter[] {
  if (categories.length === 0) {
    return []
  }

  if (categories.length < EDUCATIONAL_UNIT_THRESHOLD) {
    return [
      {
        title: "Categories",
        categories
      }
    ]
  }

  const acceptedTitles: string[] = []

  return buildSemanticCategoryGroups(categories, category => category)
    .map(groupCategories => {
      const title = buildFallbackEducationalUnitTitle(
        groupCategories,
        language,
        acceptedTitles
      )

      acceptedTitles.push(title)

      return {
        title,
        categories: groupCategories
      }
    })
}

export function validateEducationalUnitPlan(
  rawUnits: unknown,
  orderedCategories: string[]
): EducationalUnitPlanValidation {
  const units = Array.isArray(rawUnits)
    ? rawUnits
    : []
  const expectedCategories = orderedCategories.map(String).filter(Boolean)
  const expectedSet = new Set(expectedCategories)
  const seenCategories = new Set<string>()
  const acceptedTitles: string[] = []
  const educationalUnits: EducationalUnitChapter[] = []

  if (expectedCategories.length === 0) {
    return {
      valid: units.length === 0,
      educationalUnits: []
    }
  }

  if (units.length === 0) {
    return {
      valid: false,
      educationalUnits: [],
      error: "No educational units returned"
    }
  }

  for (const unit of units) {
    const candidate = unit as {
      title?: unknown
      categories?: unknown
    }
    const categories = Array.isArray(candidate.categories)
      ? candidate.categories.map(String).filter(Boolean)
      : []

    if (categories.length === 0) {
      return {
        valid: false,
        educationalUnits: [],
        error: "Educational unit has no categories"
      }
    }

    for (const category of categories) {
      if (!expectedSet.has(category)) {
        return {
          valid: false,
          educationalUnits: [],
          error: `Unknown or renamed category: ${category}`
        }
      }

      if (seenCategories.has(category)) {
        return {
          valid: false,
          educationalUnits: [],
          error: `Duplicated category: ${category}`
        }
      }

      seenCategories.add(category)
    }

    const validation = validateEducationalUnitTitle(
      String(candidate.title || ""),
      categories,
      acceptedTitles
    )

    if (!validation.valid) {
      return {
        valid: false,
        educationalUnits: [],
        error: `Invalid educational unit title: ${validation.title}`
      }
    }

    acceptedTitles.push(validation.title)
    educationalUnits.push({
      title: validation.title,
      categories
    })
  }

  if (seenCategories.size !== expectedCategories.length) {
    return {
      valid: false,
      educationalUnits: [],
      error: "Missing categories"
    }
  }

  return {
    valid: true,
    educationalUnits: sortEducationalUnitsByOriginalOrder(
      educationalUnits,
      expectedCategories
    )
  }
}

export function buildFallbackEducationalUnitTitle(
  categories: string[],
  language?: string | null,
  existingTitles: string[] = []
) {
  const italian = isLikelyItalian(categories, language)
  const commonTerms = mostCommonMeaningfulTokens(categories)
  const theme = commonTerms.slice(0, 2).join(" ")

  const candidates = [
    theme
      ? `${italian ? "Fondamenti di" : "Foundations of"} ${theme}`
      : "",
    theme
      ? `${italian ? "Principi di" : "Principles of"} ${theme}`
      : "",
    theme || "",
    italian ? "Quadro Concettuale" : "Conceptual Foundations",
    italian ? "Principi Fondamentali" : "Foundational Principles",
    italian ? "Nucleo Teorico" : "Theoretical Foundations",
    italian ? "Metodo e Concetti" : "Conceptual Methods",
    italian ? "Percorso Concettuale" : "Conceptual Framework"
  ]

  return candidates.find(candidate =>
    validateEducationalUnitTitle(candidate, categories, existingTitles).valid
  ) || numberedFallbackTitle(categories, italian, existingTitles)
}

export function validateEducationalUnitTitle(
  rawTitle: string,
  categories: string[],
  existingTitles: string[] = []
) {
  const raw = String(rawTitle || "").trim()
  const title = sanitizeEducationalUnitTitle(rawTitle)
  const lowerTitle = title.toLowerCase()
  const words = title.split(/\s+/).filter(Boolean)

  if (!raw || !title) {
    return { valid: false, title }
  }

  if (/["'“”‘’]/.test(raw)) {
    return { valid: false, title }
  }

  if (/[^\p{L}\p{N} ]/u.test(raw)) {
    return { valid: false, title }
  }

  if (words.length > 4) {
    return { valid: false, title }
  }

  if (FORBIDDEN_TITLE_TERMS.some(term => lowerTitle.includes(term))) {
    return { valid: false, title }
  }

  if (looksOverlyGenericTitle(title)) {
    return { valid: false, title }
  }

  const normalizedTitle = normalizeTitle(title)
  const normalizedExistingTitles = existingTitles.map(normalizeTitle).filter(Boolean)

  if (normalizedExistingTitles.includes(normalizedTitle)) {
    return { valid: false, title }
  }

  const normalizedCategories = categories.map(normalizeTitle).filter(Boolean)

  if (
    categories.length > 1
    && normalizedCategories[0]
    && normalizedTitle === normalizedCategories[0]
  ) {
    return { valid: false, title }
  }

  const repeatedCategoryCount = normalizedCategories.filter(category =>
    category && normalizedTitle.includes(category)
  ).length

  if (repeatedCategoryCount > 1) {
    return { valid: false, title }
  }

  return { valid: true, title }
}

export function sanitizeEducationalUnitTitle(rawTitle: string) {
  return String(rawTitle || "")
    .replace(/["'“”‘’]/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function buildSemanticCategoryGroups<T>(
  items: T[],
  getCategory: (item: T) => string
) {
  const entries = items.map((item, index) => ({
    item,
    index,
    category: getCategory(item),
    features: categoryFeatures(getCategory(item))
  }))
  const unassigned = new Set(entries.map(entry => entry.index))
  const groups: typeof entries[] = []

  while (unassigned.size > 0) {
    const seed = bestSemanticSeed(entries, unassigned)
    unassigned.delete(seed.index)

    const candidates = entries
      .filter(entry => unassigned.has(entry.index))
      .map(entry => ({
        entry,
        score: categorySimilarity(seed.features, entry.features)
      }))
      .sort((a, b) => b.score - a.score || a.entry.index - b.entry.index)

    const group = [seed]

    candidates.forEach(candidate => {
      if (group.length >= EDUCATIONAL_UNIT_MAX_SIZE) {
        return
      }

      const averageSimilarity = group.reduce(
        (total, entry) => total + categorySimilarity(entry.features, candidate.entry.features),
        0
      ) / group.length

      if (candidate.score >= 0.22 || averageSimilarity >= 0.18) {
        group.push(candidate.entry)
        unassigned.delete(candidate.entry.index)
      }
    })

    if (group.length < EDUCATIONAL_UNIT_MIN_SIZE && unassigned.size > 0) {
      const nearest = candidates.find(candidate => unassigned.has(candidate.entry.index))

      if (nearest) {
        group.push(nearest.entry)
        unassigned.delete(nearest.entry.index)
      }
    }

    groups.push(group.sort((a, b) => a.index - b.index))
  }

  mergeSmallSemanticGroups(groups)

  return groups
    .sort((a, b) => a[0].index - b[0].index)
    .map(group => group.map(entry => entry.item))
}

function bestSemanticSeed<T extends {
    index: number
    features: Set<string>
  }>(
  entries: T[],
  unassigned: Set<number>
) {
  return entries
    .filter(entry => unassigned.has(entry.index))
    .map(entry => {
      const averageSimilarity = entries
        .filter(candidate => candidate.index !== entry.index && unassigned.has(candidate.index))
        .reduce(
          (total, candidate) => total + categorySimilarity(entry.features, candidate.features),
          0
        ) / Math.max(1, unassigned.size - 1)

      return {
        entry,
        averageSimilarity
      }
    })
    .sort((a, b) => b.averageSimilarity - a.averageSimilarity || a.entry.index - b.entry.index)[0].entry
}

function mergeSmallSemanticGroups<T extends { index: number; features: Set<string> }>(
  groups: T[][]
) {
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index]

    if (group.length >= EDUCATIONAL_UNIT_MIN_SIZE || groups.length === 1) {
      continue
    }

    const targetIndex = groups
      .map((target, candidateIndex) => ({
        candidateIndex,
        score: candidateIndex === index || target.length >= EDUCATIONAL_UNIT_MAX_SIZE
          ? -1
          : averageGroupSimilarity(group, target)
      }))
      .sort((a, b) => b.score - a.score || a.candidateIndex - b.candidateIndex)[0]?.candidateIndex

    if (targetIndex === undefined || targetIndex === index || targetIndex < 0) {
      continue
    }

    groups[targetIndex].push(...group)
    groups[targetIndex].sort((a, b) => a.index - b.index)
    groups.splice(index, 1)
  }
}

function averageGroupSimilarity<T extends { features: Set<string> }>(
  left: T[],
  right: T[]
) {
  const comparisons = left.length * right.length

  if (!comparisons) {
    return 0
  }

  return left.reduce(
    (total, leftEntry) => total + right.reduce(
      (innerTotal, rightEntry) =>
        innerTotal + categorySimilarity(leftEntry.features, rightEntry.features),
      0
    ),
    0
  ) / comparisons
}

function categorySimilarity(
  left: Set<string>,
  right: Set<string>
) {
  const intersection = Array.from(left).filter(feature => right.has(feature)).length
  const union = new Set([...Array.from(left), ...Array.from(right)]).size

  if (!union) {
    return 0
  }

  return intersection / union
}

function categoryFeatures(category: string) {
  const words = cleanWords(category)
  const features = new Set<string>()

  words.forEach(word => {
    const normalized = normalizeWord(word)

    if (!normalized) {
      return
    }

    features.add(normalized)

    if (normalized.length >= 5) {
      features.add(normalized.slice(0, 5))
    }

    if (normalized.length >= 7) {
      features.add(normalized.slice(0, 7))
    }
  })

  for (let index = 0; index < words.length - 1; index += 1) {
    features.add(`${normalizeWord(words[index])}_${normalizeWord(words[index + 1])}`)
  }

  return features
}

function mostCommonMeaningfulTokens(categories: string[]) {
  const counts = new Map<string, { word: string; count: number }>()

  categories.forEach(category => {
    const uniqueWords = Array.from(new Set(cleanWords(category).map(normalizeWord)))

    uniqueWords.forEach(word => {
      const key = word.toLowerCase()
      const current = counts.get(key)
      counts.set(key, {
        word,
        count: current ? current.count + 1 : 1
      })
    })
  })

  return Array.from(counts.values())
    .filter(entry => entry.count >= 2 && entry.word.length >= 3)
    .sort((a, b) => b.count - a.count || b.word.length - a.word.length)
    .slice(0, 2)
    .map(entry => titleCase(entry.word))
}

function cleanWords(value: string) {
  return sanitizeEducationalUnitTitle(value)
    .split(/\s+/)
    .filter(word => word && !STOP_WORDS.has(word.toLowerCase()))
}

function normalizeTitle(value: string) {
  return sanitizeEducationalUnitTitle(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function looksOverlyGenericTitle(title: string) {
  if (OVERLY_GENERIC_TITLE_PATTERNS.some(pattern => pattern.test(title))) {
    return true
  }

  const words = cleanWords(title).map(word => word.toLowerCase())

  if (words.length === 0) {
    return true
  }

  return words.every(word => GENERIC_TITLE_WORDS.has(word))
}

function normalizeWord(value: string) {
  return sanitizeEducationalUnitTitle(value)
    .toLowerCase()
    .replace(/(zione|zioni|mento|menti|ità|ies|ing|ed|es|s)$/i, "")
    .trim()
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function numberedFallbackTitle(
  categories: string[],
  italian: boolean,
  existingTitles: string[]
) {
  for (let index = 1; index <= 99; index += 1) {
    const candidate = italian
      ? `Percorso Concettuale ${index}`
      : `Conceptual Path ${index}`

    if (validateEducationalUnitTitle(candidate, categories, existingTitles).valid) {
      return candidate
    }
  }

  return italian ? "Percorso Concettuale" : "Conceptual Path"
}

function sortEducationalUnitsByOriginalOrder(
  units: EducationalUnitChapter[],
  orderedCategories: string[]
) {
  const categoryOrder = new Map(
    orderedCategories.map((category, index) => [category, index])
  )

  return [...units].sort((left, right) => {
    const leftIndex = Math.min(
      ...left.categories.map(category => categoryOrder.get(category) ?? Number.MAX_SAFE_INTEGER)
    )
    const rightIndex = Math.min(
      ...right.categories.map(category => categoryOrder.get(category) ?? Number.MAX_SAFE_INTEGER)
    )

    return leftIndex - rightIndex
  })
}

function isLikelyItalian(categories: string[], language?: string | null) {
  if (String(language || "").toLowerCase().startsWith("it")) {
    return true
  }

  const joined = categories.join(" ").toLowerCase()
  return ITALIAN_MARKERS.some(marker => joined.includes(marker))
}
