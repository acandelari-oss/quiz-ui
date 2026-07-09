import type { NextApiRequest, NextApiResponse } from "next"
import {
  buildDeterministicEducationalUnits,
  validateEducationalUnitPlan,
  type EducationalUnitChapter
} from "../../utils/educationalUnitTitles"

type EducationalUnitsResponse = {
  educational_units: EducationalUnitChapter[]
  source: "gpt" | "fallback"
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EducationalUnitsResponse | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const categories = Array.isArray(req.body?.categories)
    ? Array.from(new Set(req.body.categories.map(String).filter(Boolean)))
    : []
  const language = typeof req.body?.language === "string"
    ? req.body.language
    : "English"
  const fallback = buildDeterministicEducationalUnits(categories, language)

  if (categories.length === 0) {
    return res.status(200).json({
      educational_units: [],
      source: "fallback"
    })
  }

  if (categories.length < 7) {
    return res.status(200).json({
      educational_units: fallback,
      source: "fallback"
    })
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return res.status(200).json({
        educational_units: fallback,
        source: "fallback"
      })
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.EDUCATIONAL_UNIT_BUILDER_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        response_format: {
          type: "json_object"
        },
        messages: [
          {
            role: "system",
            content:
              "You organize university course categories into textbook-style educational chapters. Return only valid JSON."
          },
          {
            role: "user",
            content: buildPrompt(categories, language)
          }
        ]
      })
    })

    if (!response.ok) {
      return res.status(200).json({
        educational_units: fallback,
        source: "fallback"
      })
    }

    const data = await response.json()
    const content = String(data?.choices?.[0]?.message?.content || "")
      .replace("```json", "")
      .replace("```", "")
      .trim()
    const parsed = JSON.parse(content)
    const validation = validateEducationalUnitPlan(
      parsed?.educational_units,
      categories
    )

    if (!validation.valid) {
      console.warn("Educational Unit builder fallback:", validation.error)
      return res.status(200).json({
        educational_units: fallback,
        source: "fallback"
      })
    }

    return res.status(200).json({
      educational_units: validation.educationalUnits,
      source: "gpt"
    })
  } catch (error) {
    console.warn("Educational Unit builder fallback:", error)
    return res.status(200).json({
      educational_units: fallback,
      source: "fallback"
    })
  }
}

function buildPrompt(categories: string[], language: string) {
  return `
You are organizing the table of contents of a university textbook.

Group the complete ordered category list into coherent Educational Units.
Educational Units are didactic chapters, not algorithmic clusters.
Think like the author of a university textbook preparing the index of a course.

EDUCATIONAL COHERENCE IS THE HIGHEST PRIORITY.
Your objective is not to create equally sized chapters.
Your objective is to create chapters that make educational sense.

Categories:
${categories.map(category => `- ${category}`).join("\n")}

Language:
${language}

Rules:
- every category must belong to exactly one Educational Unit
- preserve every category exactly as written
- do not rename categories
- do not remove categories
- do not duplicate categories
- preserve the educational order as much as possible
- each Educational Unit should ideally contain 2 to 5 categories
- a one-category Educational Unit is always better than grouping unrelated categories
- do not force categories into a chapter simply because another chapter is small
- never group weakly related categories only to obtain balanced chapter sizes
- titles must be maximum 4 words
- titles must sound like university textbook chapter titles
- titles must represent the common educational concept
- titles should describe the concept shared by all categories in that unit
- titles should let the student predict the chapter contents before opening it
- prefer concrete scientific or disciplinary concepts
- avoid abstract educational words such as Foundations, Principles, Concepts, General, Theoretical, Overview, Introduction, Core unless genuinely necessary
- never use: Area, Group, Unit, Connected, Topics, Educational Unit, and more
- never enumerate categories in a title
- return deterministic JSON only

CHAPTER QUALITY CHECK:
Before returning JSON, review every Educational Unit:
1. Do all categories belong to the same educational subject?
2. Would a professor naturally teach these categories together in one textbook chapter?
3. Can the title accurately describe every category in the chapter?
If any answer is no, reorganize the Educational Units.

Good title examples:
- Cell Division
- Genome Organization
- Patterns of Inheritance
- Chromosome Biology
- Clinical Genetics
- Genetic Analysis Methods
- DNA Sequencing
- Population Genetics

Bad title examples:
- Conceptual Foundations
- Theoretical Foundations
- Foundational Principles
- Core Concepts
- General Topics
- Area Genetic
- Group 1
- Educational Unit

Return exactly this JSON shape:
{
  "educational_units": [
    {
      "title": "Patterns of Inheritance",
      "categories": [
        "Mendelian Inheritance",
        "Sex-Linked Inheritance"
      ]
    }
  ]
}
`
}
