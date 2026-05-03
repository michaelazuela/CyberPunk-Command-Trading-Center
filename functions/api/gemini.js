const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

const PRICING = {
  "gemini-3-pro-preview": {
    inputPerMillionUnder200k: 2.00,
    inputPerMillionOver200k: 4.00,
    outputPerMillionUnder200k: 12.00,
    outputPerMillionOver200k: 18.00,
    note: "Gemini 3 Pro Preview paid tier standard pricing"
  },
  "gemini-3-flash-preview": {
    inputPerMillionUnder200k: 0.50,
    inputPerMillionOver200k: 0.50,
    outputPerMillionUnder200k: 3.00,
    outputPerMillionOver200k: 3.00,
    note: "Gemini 3 Flash Preview paid tier standard pricing"
  }
};

function getGeminiApiKey(env = {}) {
  return (
    env.GEMINI_API_KEY ||
    env.GOOGLE_API_KEY ||
    env.API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    ''
  );
}

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

export async function onRequestPost(context) {
  let payload;

  try {
    payload = await context.request.json();
    let apiKey = getGeminiApiKey(context.env);

    if (apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'undefined' || apiKey === 'null') {
      apiKey = '';
    }

    if (!apiKey) {
      return Response.json(
        {
          error: "Missing Gemini API key. Checked GEMINI_API_KEY, GOOGLE_API_KEY, and API_KEY. Add one in AI Studio Secrets and Cloudflare Environment Variables."
        },
        { status: 500, headers: jsonHeaders }
      );
    }

    const model = payload.model || "gemini-3-pro-preview";
    delete payload.model;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    const usage = normalizeUsage(data.usageMetadata);
    const cost = estimateCost(model, usage);

    return Response.json(
      {
        ...data,
        text: extractText(data),
        usage,
        cost
      },
      { status: response.status, headers: jsonHeaders }
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        model: payload?.model
      },
      { status: 500, headers: jsonHeaders }
    );
  }
}

function extractText(data = {}) {
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function normalizeUsage(usageMetadata = {}) {
  const inputTokens = Number(usageMetadata.promptTokenCount || 0);
  const outputTokens = Number(
    usageMetadata.candidatesTokenCount ||
    usageMetadata.outputTokenCount ||
    0
  ) + Number(usageMetadata.thoughtsTokenCount || 0);
  const totalTokens = Number(usageMetadata.totalTokenCount || inputTokens + outputTokens);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    raw: usageMetadata
  };
}

function estimateCost(model, usage) {
  const pricing = PRICING[model] || PRICING["gemini-3-flash-preview"];
  const over200k = usage.inputTokens > 200000;
  const inputRate = over200k ? pricing.inputPerMillionOver200k : pricing.inputPerMillionUnder200k;
  const outputRate = over200k ? pricing.outputPerMillionOver200k : pricing.outputPerMillionUnder200k;
  const inputCostUsd = (usage.inputTokens / 1000000) * inputRate;
  const outputCostUsd = (usage.outputTokens / 1000000) * outputRate;

  return {
    model: model || "unknown",
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd,
    pricingNote: pricing.note
  };
}
