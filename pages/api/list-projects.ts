import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const backend = process.env.BACKEND_BASE_URL;
    console.log("BACKEND_BASE_URL:", backend);

    if (!backend) {
      return res.status(500).json({ error: "Missing BACKEND_BASE_URL" });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const response = await fetch(`${backend}/projects`, {
      method: "GET",
      headers: {
        Authorization: authHeader
      }
    });

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}