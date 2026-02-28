import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";

// usa require per evitare problemi ESM/TS con formidable in Next
const formidable = require("formidable");
const pdfParse = require("pdf-parse");

export const config = {
  api: {
    bodyParser: false,
  },
};

function firstFieldValue(v: any): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return null;
}

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const backend = process.env.BACKEND_BASE_URL;
    const apiKey = process.env.BACKEND_API_KEY;

    if (!backend || !apiKey) {
      return res.status(500).json({ error: "Missing env: BACKEND_BASE_URL or BACKEND_API_KEY" });
    }

    const form = formidable({
      multiples: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB per file
      keepExtensions: true,
    });

    form.parse(req, async (err: any, fields: any, files: any) => {
      try {
        if (err) return res.status(400).json({ error: `Form parse error: ${err.message || err}` });

        const projectId = firstFieldValue(fields.project_id);
        if (!projectId) return res.status(400).json({ error: "Missing project_id" });

        // IMPORTANT: field name must be "files" in FormData
        const uploaded = toArray(files?.files);
        if (uploaded.length === 0) {
          return res.status(400).json({ error: "Missing files (field name must be 'files')" });
        }

        const results: Array<{ file: string; status: "success" | "failed"; error?: string }> = [];

        for (const f of uploaded) {
          const filename: string = f.originalFilename || "Unknown";

          try {
            const buffer = fs.readFileSync(f.filepath);

            let extractedText = "";
            if (filename.toLowerCase().endsWith(".pdf")) {
              const parsed = await pdfParse(buffer);
              extractedText = (parsed?.text || "").trim();
            } else {
              extractedText = buffer.toString("utf-8").trim();
            }

            if (!extractedText) throw new Error("Empty extracted text");

            const resp = await fetch(`${backend}/projects/${projectId}/ingest`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                documents: [{ title: filename, text: extractedText }],
              }),
            });

            const raw = await resp.text();
            if (!resp.ok) {
              results.push({ file: filename, status: "failed", error: raw });
              continue;
            }

            results.push({ file: filename, status: "success" });
          } catch (e: any) {
            results.push({ file: filename, status: "failed", error: e?.message || String(e) });
          }
        }

        return res.status(200).json({ results });
      } catch (e: any) {
        console.error("upload-files inner error:", e);
        return res.status(500).json({ error: e?.message || String(e) });
      }
    });
  } catch (e: any) {
    console.error("upload-files handler error:", e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}