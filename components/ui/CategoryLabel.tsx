import React, { createContext, useContext } from "react"

import { categoryDisplayName } from "../../utils/categoryIdentity"

type CategoryPriorityContextValue = {
  priorityCategories: string[]
}

const CategoryPriorityContext = createContext<CategoryPriorityContextValue>({
  priorityCategories: []
})

export function CategoryPriorityProvider({
  priorityCategories = [],
  children
}: {
  priorityCategories?: string[]
  children: React.ReactNode
}) {
  return (
    <CategoryPriorityContext.Provider value={{ priorityCategories }}>
      {children}
    </CategoryPriorityContext.Provider>
  )
}

export function useCategoryPriority(category: string, override?: boolean) {
  const { priorityCategories } = useContext(CategoryPriorityContext)

  if (typeof override === "boolean") {
    return override
  }

  return priorityCategories.includes(category)
}

export default function CategoryLabel({
  category,
  sourceDocument,
  isPriority,
  priorityCategories,
  onTogglePriority,
  toggleLabel,
  className,
  style,
  starStyle,
  nameStyle
}: {
  category: string
  sourceDocument?: string | null
  isPriority?: boolean
  priorityCategories?: string[]
  onTogglePriority?: () => void
  toggleLabel?: string
  className?: string
  style?: React.CSSProperties
  starStyle?: React.CSSProperties
  nameStyle?: React.CSSProperties
}) {
  const contextPriority = useCategoryPriority(category, isPriority)
  const selected = typeof priorityCategories !== "undefined"
    ? priorityCategories.includes(category)
    : contextPriority
  const showStar = Boolean(onTogglePriority || selected)

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        ...style
      }}
    >
      {showStar && (
        onTogglePriority ? (
          <button
            type="button"
            onClick={event => {
              event.stopPropagation()
              onTogglePriority()
            }}
            aria-pressed={selected}
            aria-label={toggleLabel}
            title={toggleLabel}
            style={{
              appearance: "none",
              border: "none",
              background: "transparent",
              color: selected ? "#facc15" : "#64748b",
              cursor: "pointer",
              font: "inherit",
              lineHeight: 1,
              padding: 0,
              flex: "0 0 auto",
              ...starStyle
            }}
          >
            ★
          </button>
        ) : (
          <span
            aria-label="Study Priority"
            title="Study Priority"
            style={{
              color: "#facc15",
              lineHeight: 1,
              flex: "0 0 auto",
              ...starStyle
            }}
          >
            ★
          </span>
        )
      )}
      <span
        style={{
          minWidth: 0,
          overflowWrap: "anywhere",
          ...nameStyle
        }}
      >
        {categoryDisplayName(category)}
        {sourceDocument && <span style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 400, lineHeight: 1.4, textTransform: "none", letterSpacing: "normal", marginTop: 3, overflowWrap: "anywhere" }}>{sourceDocument}</span>}
      </span>
    </span>
  )
}
