import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File } from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const backend = process.env.BACKEND_BASE_URL;
    const apiKey = process.env.BACKEND_API_KEY;

    if (!backend || !apiKey) {
      return res.status(500).json({
        error: "Missing env",
      });
    }

    const form = formidable({
      multiples: true,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({
          error: "Form parse error",
        });
      }

      // ✅ fix projectId type
      const projectId = Array.isArray(fields.project_id)
        ? fields.project_id[0]
        : fields.project_id;

      if (!projectId) {
        return res.status(400).json({
          error: "Missing project_id",
        });
      }

      // ✅ fix files type safely
      const fileField = files.file;

      if (!fileField) {
        return res.status(400).json({
          error: "No file uploaded",
        });
      }

      const fileArray: File[] = Array.isArray(fileField)
        ? fileField
        : [fileField];

      for (const file of fileArray) {
        if (!file.filepath) {
          return res.status(400).json({
            error: "Invalid file",
          });
        }

        const buffer = fs.readFileSync(file.filepath);

        let text = "";

        if (file.mimetype === "application/pdf") {
          const parsed = await pdfParse(buffer);
          text = parsed.text;
        } else {
          text = buffer.toString();
        }

        await fetch(`${backend}/projects/${projectId}/ingest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            documents: [
              {
                title: file.originalFilename,
                text,
              },
            ],
          }),
        });
      }

      res.status(200).json({
        success: true,
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "Upload failed",
    });
  }
}
