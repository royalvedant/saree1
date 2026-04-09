/**
 * Netlify static deploys have no Flask server. This handler returns the same
 * JSON shape as app.py demo_response() so the Tools page can show previews.
 * For real Vertex AI generation, run app.py (or proxy to your backend URL).
 */
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const body = {
    result_url: "/static/demo-result.svg",
    quality_gate: "ready",
    storage: "demo",
    demo_mode: true,
    warning:
      "Netlify demo: full AI try-on requires the Flask backend (app.py). This response matches demo mode so previews work on the static site.",
  };

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
};
