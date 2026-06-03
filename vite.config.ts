import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function getGeminiApiKey(env: any = {}) {
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

function getOpenAIKey(env: any = {}) {
  return env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'vite-plugin-cloudflare-gemini',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/openai' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const requestData = JSON.parse(body || '{}');
                  let apiKey = getOpenAIKey(env);

                  if (apiKey === 'undefined' || apiKey === 'null' || apiKey === 'OPENAI_API_KEY') {
                    apiKey = '';
                  }

                  if (!apiKey) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Missing OpenAI API key. Add OPENAI_API_KEY in Cloudflare Environment Variables or local env for dev testing.' }));
                    return;
                  }

                  const payload = {
                    model: requestData.model || env.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: requestData.messages || [],
                    temperature: requestData.temperature ?? 0,
                    response_format: requestData.response_format || { type: 'json_object' },
                    max_tokens: requestData.max_tokens || 2500,
                  };

                  const fetchRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${apiKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                  });

                  const text = await fetchRes.text();
                  res.statusCode = fetchRes.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(text || '{}');
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }

            if (req.url === '/api/gemini' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const requestData = JSON.parse(body);
                  let apiKey = getGeminiApiKey(env);
                  
                  if (apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'undefined' || apiKey === 'null') {
                     apiKey = '';
                  }

                  if (!apiKey) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: "Missing Gemini API key. Checked GEMINI_API_KEY, GOOGLE_API_KEY, and API_KEY. Add one in AI Studio Secrets and Cloudflare Environment Variables." }));
                    return;
                  }
                  
                  const model = requestData.model || "gemini-3.1-pro-preview";
                  delete requestData.model;

                  const fetchRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                  });

                  if (!fetchRes.ok) {
                    const text = await fetchRes.text();
                    res.statusCode = fetchRes.status;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: `API error (Key was ${apiKey.substring(0, 5)}...): ${text}` }));
                    return;
                  }

                  res.statusCode = fetchRes.status;
                  res.setHeader('Content-Type', 'application/json');
                  const text = await fetchRes.text();
                  res.end(text);
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');

            if (normalizedId.includes('/node_modules/')) {
              if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/')) {
                return 'vendor-react';
              }
              if (normalizedId.includes('/@supabase/')) {
                return 'vendor-supabase';
              }
              if (normalizedId.includes('/lucide-react/')) {
                return 'vendor-icons';
              }
              if (normalizedId.includes('/motion/')) {
                return 'vendor-motion';
              }
              return undefined;
            }

            if (normalizedId.includes('/src/components/AdminDashboard')) {
              return 'admin-dashboard';
            }
            if (normalizedId.includes('/src/components/DataHealthPanel')) {
              return 'admin-data-tools';
            }
            if (
              normalizedId.includes('/src/components/ResearchReviewDashboard') ||
              normalizedId.includes('/src/lib/reviewPackDashboardSource') ||
              normalizedId.includes('/src/lib/reviewResultsVisualization')
            ) {
              return 'admin-data-tools';
            }
            if (
              normalizedId.includes('/src/components/SessionLab') ||
              normalizedId.includes('/src/components/ReplayLab')
            ) {
              return 'workflow-labs';
            }
            if (
              normalizedId.includes('/src/lib/gemini') ||
              normalizedId.includes('/src/lib/rag')
            ) {
              return 'admin-data-tools';
            }

            return undefined;
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
