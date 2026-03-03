import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const backend = process.env.BACKEND_BASE_URL;

    if (!backend) {
      return res.status(500).json({ error: "Missing env: BACKEND_BASE_URL" });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const { project_id, num_questions, difficulty, language } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: "Missing project_id" });
    }

    const response = await fetch(
      `${backend}/projects/${project_id}/generate_quiz`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          num_questions,
          difficulty,
          language,
        }),
      }
    );

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}