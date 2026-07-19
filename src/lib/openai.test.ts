import assert from 'node:assert/strict';
import {
  buildOpenAIChartValidationMessages,
  OPENAI_CHART_VALIDATION_JSON_CONTRACT,
  OPENAI_DESK_VALIDATOR_AUTHORITY_PROMPT,
  validateChartExtractionWithOpenAI,
} from './openai';

const imageUrl = 'data:image/png;base64,abc123';

const messagesA = buildOpenAIChartValidationMessages(
  imageUrl,
  { keyLevels: { currentPrice: 7533.25 } } as any,
  { routeName: 'morning', instrument: 'MES' }
);

const messagesB = buildOpenAIChartValidationMessages(
  imageUrl,
  { keyLevels: { currentPrice: 7540.5 } } as any,
  { routeName: 'lunch', instrument: 'MNQ' }
);

assert.equal(messagesA[0].role, 'system');
assert.equal(messagesA[0].content, OPENAI_DESK_VALIDATOR_AUTHORITY_PROMPT);
assert.equal(messagesA[1].role, 'system');
assert.equal(messagesA[1].content, OPENAI_CHART_VALIDATION_JSON_CONTRACT);
assert.equal(messagesA[0].content, messagesB[0].content);
assert.equal(messagesA[1].content, messagesB[1].content);

const userMessage = messagesA[2] as any;
assert.equal(userMessage.role, 'user');
assert.equal(userMessage.content[0].type, 'text');
assert.match(userMessage.content[0].text, /Route: morning/);
assert.match(userMessage.content[0].text, /Instrument selected by user: MES/);
assert.match(userMessage.content[0].text, /7533\.25/);
assert.equal(userMessage.content[1].type, 'image_url');
assert.equal(userMessage.content[1].image_url.url, imageUrl);

assert.match(OPENAI_DESK_VALIDATOR_AUTHORITY_PROMPT, /Do not approve trades/);
assert.match(OPENAI_DESK_VALIDATOR_AUTHORITY_PROMPT, /5M chart remains execution authority/);
assert.match(OPENAI_DESK_VALIDATOR_AUTHORITY_PROMPT, /Higher timeframe context is map\/support\/caution only/);

let requestBody: any = null;
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (_url: string, init: RequestInit) => {
  requestBody = JSON.parse(String(init.body));
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              structuredChartContext: { timeframe: '5m' },
              validation: {
                provider: 'openai',
                agreement: 'agree',
                disagreements: [],
                warnings: [],
                summary: 'facts-only validation complete',
              },
            }),
          },
        },
      ],
    }),
    { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } }
  );
}) as any;

try {
  const validation = await validateChartExtractionWithOpenAI(
    imageUrl,
    { keyLevels: { currentPrice: 7533.25 } } as any,
    { model: 'gpt-4o-mini', routeName: 'morning', instrument: 'MES' }
  );

  assert.equal(validation?.validation?.agreement, 'agree');
  assert.equal(requestBody.messages[0].content, OPENAI_DESK_VALIDATOR_AUTHORITY_PROMPT);
  assert.equal(requestBody.messages[1].content, OPENAI_CHART_VALIDATION_JSON_CONTRACT);
  assert.equal(requestBody.messages[2].content[1].image_url.url, imageUrl);
  assert.equal(requestBody.temperature, 0);
  assert.deepEqual(requestBody.response_format, { type: 'json_object' });
} finally {
  globalThis.fetch = originalFetch;
}

console.log('OpenAI chart validator prompt caching/customization boundary verified.');
