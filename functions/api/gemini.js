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

export async function onRequestPost(context) {
  try {
    const requestData = await context.request.json();
    let apiKey = getGeminiApiKey(context.env);

    if (apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'undefined' || apiKey === 'null') {
      apiKey = '';
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: "Missing Gemini API key. Checked GEMINI_API_KEY, GOOGLE_API_KEY, and API_KEY. Add one in AI Studio Secrets and Cloudflare Environment Variables." 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // We expect the client to send a payload that matches the REST API structure
    // e.g. { model: "gemini-3.1-pro-preview", contents: [...], generationConfig: {...}, systemInstruction: {...} }
    const model = requestData.model || "gemini-3.1-pro-preview";
    const action = requestData.action || "generateContent";
    delete requestData.model;
    delete requestData.action;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      const isTimeout = response.status === 524 || responseText.toLowerCase().includes('error code: 524');
      data = {
        error: {
          code: response.status,
          status: isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_NON_JSON_RESPONSE',
          message: isTimeout
            ? 'Cloudflare timed out while waiting for the Gemini response. Please retry the analysis.'
            : `Gemini returned a non-JSON response: ${responseText.slice(0, 240)}`
        }
      };
    }
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
