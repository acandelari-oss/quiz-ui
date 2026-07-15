import jsPDF from "jspdf"

type PdfMessage = {
  role?: string
  content?: string
  sources?: Array<{
    document?: string
    source_document?: string
    page?: string | number
    source_page?: string | number
  }>
  source_document?: string
  source_page?: string | number
}

type ExportConversationPdfInput = {
  title: string
  projectName?: string
  subjectLabel?: string
  subject?: string
  messages: PdfMessage[]
  filename: string
  assistantLabel?: string
  userLabel?: string
}

export function exportConversationPDF({
  title,
  projectName,
  subjectLabel = "Topic",
  subject,
  messages,
  filename,
  assistantLabel = "AI",
  userLabel = "YOUR ANSWER"
}: ExportConversationPdfInput) {
  const doc = new jsPDF()
  const logo = new Image()

  logo.src = "/logoSTXd.png"

  let y = 20

  doc.addImage(
    logo,
    "PNG",
    20,
    14,
    38,
    16
  )

  doc.setFontSize(24)
  doc.setTextColor(15, 15, 15)
  doc.text(title, 20, 52)

  doc.setFontSize(12)
  doc.setTextColor(40, 40, 40)

  y = 72

  if (projectName) {
    doc.text(`Project: ${projectName}`, 20, y)
    y += 10
  }

  if (subject) {
    doc.text(`${subjectLabel}: ${subject}`, 20, y)
    y += 10
  }

  doc.text(`Date: ${new Date().toLocaleString()}`, 20, y)
  y += 12

  doc.setDrawColor(180)
  doc.line(20, y, 190, y)
  y += 16

  messages.forEach((msg: PdfMessage) => {
    const role =
      msg.role === "user"
        ? userLabel
        : assistantLabel

    y = ensurePageSpace(doc, y)

    doc.setFontSize(13)
    doc.setTextColor(30, 30, 30)
    doc.text(`${role}:`, 20, y)
    y += 7

    const splitText = doc.splitTextToSize(
      String(msg.content || ""),
      170
    )

    doc.setFontSize(11)
    doc.setTextColor(60, 60, 60)
    doc.text(splitText, 20, y)
    y += splitText.length * 6

    const sources = extractSources(msg)
    if (sources.length > 0) {
      y += 3
      doc.setFontSize(9)
      doc.setTextColor(110, 110, 110)
      sources.forEach(source => {
        y = ensurePageSpace(doc, y)
        doc.text(`Source: ${source}`, 20, y)
        y += 5
      })
    }

    y += 10

    if (y > 250) {
      addFooter(doc)
      doc.addPage()
      y = 20
    }
  })

  addFooter(doc)
  doc.save(filename)
}

function extractSources(message: PdfMessage): string[] {
  const sources: string[] = []

  if (message.source_document) {
    sources.push(
      formatSource(message.source_document, message.source_page)
    )
  }

  if (Array.isArray(message.sources)) {
    message.sources.forEach(source => {
      const document = source.document || source.source_document
      if (!document) return
      sources.push(
        formatSource(document, source.page || source.source_page)
      )
    })
  }

  return Array.from(new Set(sources))
}

function formatSource(document: string, page?: string | number) {
  return page ? `${document} – page ${page}` : document
}

function ensurePageSpace(doc: jsPDF, y: number) {
  if (y <= 250) return y
  addFooter(doc)
  doc.addPage()
  return 20
}

function addFooter(doc: jsPDF) {
  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.text(
    "Generated with StutorX AI • www.stutorx.com",
    20,
    285
  )
}
