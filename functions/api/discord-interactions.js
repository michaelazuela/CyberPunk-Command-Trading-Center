import nacl from 'tweetnacl';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function hexToUint8Array(hex) {
  if (!hex || hex.length % 2 !== 0) return null;
  const bytes = hex.match(/.{1,2}/g);
  if (!bytes) return null;
  return new Uint8Array(bytes.map((byte) => Number.parseInt(byte, 16)));
}

async function verifyDiscordRequest(request, env, rawBody) {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  const publicKey = env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) return false;

  const signatureBytes = hexToUint8Array(signature);
  const publicKeyBytes = hexToUint8Array(publicKey);
  if (!signatureBytes || !publicKeyBytes) return false;

  const message = new TextEncoder().encode(`${timestamp}${rawBody}`);
  return nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
}

export async function onRequestPost({ request, env }) {
  const rawBody = await request.text();
  const isValid = await verifyDiscordRequest(request, env, rawBody);

  if (!isValid) {
    return json({ error: 'Invalid Discord request signature' }, 401);
  }

  let interaction;
  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400);
  }

  // Discord endpoint verification ping.
  if (interaction.type === 1) {
    return json({ type: 1 });
  }

  // Discord message component/button click. Persistence is wired in the next phase.
  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id || 'unknown';
    return json({
      type: 4,
      data: {
        content: `Button received: ${customId}`,
        flags: 64,
      },
    });
  }

  return json({
    type: 4,
    data: {
      content: 'Unsupported Discord interaction type.',
      flags: 64,
    },
  });
}

export async function onRequestGet() {
  return json({
    ok: true,
    name: 'discord-interactions',
    message: 'Discord interactions endpoint is deployed.',
  });
}
