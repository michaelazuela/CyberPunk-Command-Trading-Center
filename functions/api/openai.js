function getOpenAIKey(env = {}) {
  const processEnv = typeof process !== 'undefined' ? process.env : {};
  return env.OPENAI_API_KEY || processEnv.OPENAI_API_KEY || '';
}

function messagesToResponsesInput(messages = []) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message) => message && typeof message === 'object')
    .map((message) => ({
      role: message.role || 'user',
      content: typeof message.content === 'string'
        ? [{ type: 'input_text', text: message.content }]
        : message.content,
    }));
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
      model: requestData.model || context.env.OPENAI_MODEL || 'gpt-5.6-terra',
      input: requestData.input || messagesToResponsesInput(requestData.messages),
      reasoning: requestData.reasoning || undefined,
      text: requestData.text || { format: requestData.response_format || { type: 'json_object' } },
      max_output_tokens: requestData.max_output_tokens || requestData.max_tokens || 2500,
    };

    const response = await fetch('https://api.openai.com/v1/responses', {
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
