import { useState } from "react"
import type { ReactNode } from "react"

export default function Accordion({
  items
}: {
  items: Array<{
    title: string
    subtitle?: string
    content: ReactNode
  }>
}) {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div style={wrapper}>
      {items.map((item, index) => {
        const open = openIndex === index

        return (
          <div key={item.title} style={itemBox}>
            <button
              onClick={() => setOpenIndex(open ? -1 : index)}
              style={header}
            >
              <span>
                <span style={title}>{item.title}</span>
                {item.subtitle && (
                  <span style={subtitle}>{item.subtitle}</span>
                )}
              </span>
              <span style={chevron}>{open ? "−" : "+"}</span>
            </button>

            {open && (
              <div style={content}>
                {item.content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const wrapper = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 10
}

const itemBox = {
  border: "1px solid #1f2937",
  borderRadius: 12,
  overflow: "hidden",
  background: "rgba(255,255,255,0.03)"
}

const header = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "white",
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  textAlign: "left" as const
}

const title = {
  display: "block",
  fontWeight: 700,
  marginBottom: 4
}

const subtitle = {
  display: "block",
  color: "#9ca3af",
  fontSize: 13
}

const chevron = {
  color: "#36F2ED",
  fontSize: 22,
  fontWeight: 700
}

const content = {
  padding: "0 16px 16px",
  color: "#cbd5e1",
  lineHeight: 1.6
}
