import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"

type MarkdownContentProps = {
  text?: string | null
  inline?: boolean
  className?: string
}

export default function MarkdownContent({
  text,
  inline = false,
  className
}: MarkdownContentProps) {
  const source = normalizeMathDelimiters(text || "")
  const classes = className || "markdown-content"
  const content = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => inline ? <>{children}</> : <p>{children}</p>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        )
      }}
    >
      {source}
    </ReactMarkdown>
  )

  return inline
    ? <span className={classes}>{content}</span>
    : <div className={classes}>{content}</div>
}

function normalizeMathDelimiters(value: string) {
  return value
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, equation) => `\n\n$$${equation}$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, equation) => `$${equation}$`)
}
