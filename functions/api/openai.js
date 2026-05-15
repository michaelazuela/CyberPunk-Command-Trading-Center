function getOpenAIKey(env = {}) {
  return env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
}

export async function onRequestPost(context) {
  try {
    const requestData = await context.request.json();
    let apiKey = getOpenAIKey(context.env);

    if (apiKey === 'undefined' || apiKey === 'null' || apiKey === 'OPENAI_API_KEY') {
      apiKey = '';
    }

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'Missing OpenAI API key. Add OPENAI_API_KEY in Cloudflare Environment Variables.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = {
      model: requestData.model || context.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: requestData.messages || [],
      temperature: requestData.temperature ?? 0,
      response_format: requestData.response_format || { type: 'json_object' },
      max_tokens: requestData.max_tokens || 2500,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = {
        error: {
          code: response.status,
          status: 'UPSTREAM_NON_JSON_RESPONSE',
          message: `OpenAI returned a non-JSON response: ${responseText.slice(0, 240)}`,
        },
      };
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
