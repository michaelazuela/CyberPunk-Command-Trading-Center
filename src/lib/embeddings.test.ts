import assert from 'node:assert/strict';
import { generateDeterministicEmbedding, generateEmbedding, generateQueryEmbedding } from './embeddings';

const text = 'MES morning short ActiveCampaign 5M MSS close-through line in the sand 7367.25 stop 7379.25 T1 7349.25';
const first = generateDeterministicEmbedding(text);
const second = generateDeterministicEmbedding(text);

assert.equal(first.length, 768);
assert.deepEqual(first, second);
assert.ok(first.some((value) => value !== 0));

const magnitude = Math.sqrt(first.reduce((sum, value) => sum + value * value, 0));
assert.ok(Math.abs(magnitude - 1) < 0.0001);

const documentEmbedding = await generateEmbedding(text);
const queryEmbedding = await generateQueryEmbedding(text);
assert.equal(documentEmbedding.length, 768);
assert.equal(queryEmbedding.length, 768);
assert.ok(documentEmbedding.some((value) => value !== 0));
assert.ok(queryEmbedding.some((value) => value !== 0));

console.log('Gemini-independent RAG embeddings verified.');
