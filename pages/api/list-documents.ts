import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const backend = process.env.BACKEND_BASE_URL;

  if (!backend) {
    return res.status(500).json({ error: "Missing BACKEND_BASE_URL" });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const { project_id } = req.query;

  if (!project_id) {
    return res.status(400).json({ error: "Missing project_id" });
  }

  const response = await fetch(
    `${backend}/projects/${project_id}/documents`,
    {
      method: "GET",
      headers: {
        Authorization: authHeader
      }
    }
  );

  const data = await response.json();

  return res.status(response.status).json(data);
}