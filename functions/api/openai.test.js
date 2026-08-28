import assert from 'node:assert/strict';
import { onRequestPost } from './openai.js';

const calls = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  return new Response(JSON.stringify({
    output_text: '{"status":"aligned","summary":"Observer checked the traffic-cop trace.","evidence":["scanner levels unchanged"]}',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

try {
  const response = await onRequestPost({
    request: new Request('https://quant-desk.example/api/openai', {
      method: 'POST',
      body: JSON.stringify({
        model: 'gpt-5.6-sol',
        reasoning: { effort: 'high' },
        text: { format: { type: 'json_object' } },
        max_output_tokens: 1600,
        input: [
          {
            role: 'user',
            content: [{ type: 'input_text', text: 'Review the scanner trace.' }],
          },
        ],
      }),
    }),
    env: {
      OPENAI_API_KEY: 'server-side-openai-key',
    },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.output_text.includes('Observer checked'), true);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/responses');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer server-side-openai-key');
  const payload = JSON.parse(String(calls[0].init.body));
  assert.equal(payload.model, 'gpt-5.6-sol');
  assert.deepEqual(payload.reasoning, { effort: 'high' });
  assert.deepEqual(payload.text, { format: { type: 'json_object' } });
  assert.equal(payload.max_output_tokens, 1600);
  assert.equal(JSON.stringify(payload).includes('server-side-openai-key'), false);

  const missingKeyResponse = await onRequestPost({
    request: new Request('https://quant-desk.example/api/openai', {
      method: 'POST',
      body: JSON.stringify({ input: 'test' }),
    }),
    env: {},
  });
  assert.equal(missingKeyResponse.status, 500);

  console.log('OpenAI Cloudflare proxy verified.');
} finally {
  globalThis.fetch = originalFetch;
}
