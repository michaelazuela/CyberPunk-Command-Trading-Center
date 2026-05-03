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
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
