import { GoogleGenAI } from "@google/genai";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      ...jsonHeaders,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500, headers: jsonHeaders });
  }

  let payload;
  try {
    payload = await request.json();
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const response = await ai.models.generateContent(payload);

    return Response.json({ text: response.text || "" }, { headers: jsonHeaders });
  } catch (error) {
    const status = error?.status || error?.code || 500;
    const errorText = error instanceof Error ? error.message : String(error);

    return Response.json(
      {
        error: errorText || "Gemini API request failed.",
        status,
        model: payload?.model
      },
      { status: Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500, headers: jsonHeaders }
    );
  }
}
