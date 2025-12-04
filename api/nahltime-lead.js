// pages/api/nahltime-lead.js

// Your Google Apps Script Web App endpoint
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwKK8Ay-xna3TJcw2i65pLo9PJKdAQj4lBKMJuewAO-KpdIz2Um5NlwE9YOeZVolXVVeg/exec";

// Small helper to set CORS headers
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // You can restrict this later to your domain
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  // Handle preflight for browsers
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Optional: simple health check via GET
  if (req.method === "GET") {
    try {
      const resp = await fetch(APPS_SCRIPT_URL);
      const data = await resp.json().catch(() => ({}));

      return res.status(200).json({
        success: true,
        from: "Next.js proxy",
        upstream: data,
      });
    } catch (error) {
      console.error("Health check error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to reach upstream Apps Script.",
      });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST or GET.",
    });
  }

  try {
    // In Next.js, req.body is already parsed JSON (for application/json)
    const payload = req.body || {};

    // Basic validation (same as in Code.gs)
    if (!payload.name || !payload.phone) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name or phone.",
      });
    }

    // Forward to Apps Script as JSON
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const upstreamText = await upstream.text();
    let upstreamJson;

    try {
      upstreamJson = JSON.parse(upstreamText);
    } catch (e) {
      upstreamJson = {
        success: false,
        error: "Invalid JSON from Apps Script",
        raw: upstreamText,
      };
    }

    if (!upstream.ok) {
      console.error("Apps Script responded with non-OK status:", upstream.status, upstreamJson);
      return res.status(502).json({
        success: false,
        error: "Upstream Apps Script error.",
        upstreamStatus: upstream.status,
        upstream: upstreamJson,
      });
    }

    // Pass through the upstream JSON to the frontend
    return res.status(200).json(upstreamJson);
  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal proxy error.",
    });
  }
}
