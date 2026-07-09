import type { NextApiRequest, NextApiResponse } from "next"
import {
  buildFallbackEducationalUnitTitle,
  validateEducationalUnitTitle
} from "../../utils/educationalUnitTitles"

type EducationalUnitTitleResponse = {
  title: string
  source: "gpt" | "fallback"
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EducationalUnitTitleResponse | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const categories = Array.isArray(req.body?.categories)
    ? req.body.categories.map(String).filter(Boolean)
    : []
  const language = typeof req.body?.language === "string"
    ? req.body.language
    : "English"
  const existingTitles = Array.isArray(req.body?.existingTitles)
    ? req.body.existingTitles.map(String).filter(Boolean)
    : []
  const fallback = buildFallbackEducationalUnitTitle(
    categories,
    language,
    existingTitles
  )

  if (categories.length === 0) {
    return res.status(200).json({ title: fallback, source: "fallback" })
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return res.status(200).json({ title: fallback, source: "fallback" })
    }

    const rejectedTitles = [...existingTitles]

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.EDUCATIONAL_UNIT_TITLE_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You generate concise university textbook chapter titles. Return only the title."
            },
            {
              role: "user",
              content: buildPrompt(categories, language, rejectedTitles)
            }
          ]
        })
      })

      if (!response.ok) {
        break
      }

      const data = await response.json()
      const rawTitle = data?.choices?.[0]?.message?.content || ""
      const validation = validateEducationalUnitTitle(
        rawTitle,
        categories,
        rejectedTitles
      )

      if (validation.valid) {
        return res.status(200).json({ title: validation.title, source: "gpt" })
      }

      if (validation.title) {
        rejectedTitles.push(validation.title)
      }
    }

    return res.status(200).json({ title: fallback, source: "fallback" })
  } catch (error) {
    console.warn("Educational Unit title fallback:", error)
    return res.status(200).json({ title: fallback, source: "fallback" })
  }
}

function buildPrompt(
  categories: string[],
  language: string,
  rejectedTitles: string[]
) {
  return `
Generate ONE educational unit title for these university categories.

Categories:
${categories.map(category => `- ${category}`).join("\n")}

Language:
${language}

Rules:
- maximum 4 words
- natural university terminology
- concise
- educational, not technical
- sound like a chapter in a university textbook
- represent the shared educational concept
- never enumerate categories
- never reuse the first category as the default title
- never append or use: Area, connected areas, and more, group, unit, educational unit, collection, topics
- no punctuation except spaces
- no quotation marks
- do not return any rejected title
- return only the title

Rejected titles:
${rejectedTitles.length ? rejectedTitles.map(title => `- ${title}`).join("\n") : "- none"}
`
}
