import http from 'http';
import { URL } from 'url';

const PORT = Number(process.env.DEV_API_PORT || 8787);
const ASSEMBLY_API_KEY = process.env.ASSEMBLYAI_API_KEY || '';
const MAX_BODY_BYTES = 30 * 1024 * 1024;
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 20000;

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(payload));
}

function handleOptions(res) {
  res.writeHead(204, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end();
}

function notFound(res) {
  writeJson(res, 404, { ok: false, error: 'not_found' });
}

async function readBody(req, limit = MAX_BODY_BYTES) {
  const chunks = [];
  let received = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buf.length;
    if (received > limit) {
      throw new Error('Payload too large');
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

async function assemblyFetch(path, options = {}) {
  if (!ASSEMBLY_API_KEY) {
    throw new Error('AssemblyAI key missing');
  }
  const headers = options.headers ? { ...options.headers } : {};
  headers.Authorization = ASSEMBLY_API_KEY;
  return fetch(`https://api.assemblyai.com${path}`, {
    ...options,
    headers,
  });
}

async function uploadAudio(buffer, contentType = 'application/octet-stream') {
  const response = await assemblyFetch('/v2/upload', {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Transfer-Encoding': 'chunked',
    },
    body: buffer,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }
  const payload = await response.json();
  if (!payload?.upload_url) {
    throw new Error('Upload response missing upload_url');
  }
  return payload.upload_url;
}

async function createTranscript(uploadUrl) {
  const response = await assemblyFetch('/v2/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_url: uploadUrl }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Transcript request failed (${response.status}): ${text}`);
  }
  const payload = await response.json();
  if (!payload?.id) {
    throw new Error('Transcript response missing id');
  }
  return payload;
}

async function fetchTranscript(id) {
  const response = await assemblyFetch(`/v2/transcript/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Transcript fetch failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function pollTranscript(id) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const payload = await fetchTranscript(id);
    if (payload.status === 'completed' || payload.status === 'error') {
      return payload;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  const payload = await fetchTranscript(id);
  return payload;
}

async function handleTranscribe(req, res) {
  if (!ASSEMBLY_API_KEY) {
    writeJson(res, 503, { ok: false, error: 'missing_api_key' });
    return;
  }
  try {
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    const body = await readBody(req);
    if (!body.length) {
      writeJson(res, 400, { ok: false, error: 'empty_body' });
      return;
    }
    const uploadUrl = await uploadAudio(body, contentType);
    const transcript = await createTranscript(uploadUrl);
    let summary = { id: transcript.id, status: transcript.status, text: transcript.text || '' };
    if (transcript.status !== 'completed') {
      const polled = await pollTranscript(transcript.id);
      summary = {
        id: polled.id,
        status: polled.status,
        text: polled.text || '',
        error: polled.error || null,
      };
    }
    writeJson(res, 200, { ok: true, ...summary });
  } catch (error) {
    console.warn('transcribe failed', error);
    writeJson(res, 500, { ok: false, error: error.message || 'transcribe_failed' });
  }
}

async function handleTranscriptStatus(req, res, id) {
  if (!ASSEMBLY_API_KEY) {
    writeJson(res, 503, { ok: false, error: 'missing_api_key' });
    return;
  }
  try {
    const payload = await fetchTranscript(id);
    writeJson(res, 200, {
      ok: true,
      id: payload.id,
      status: payload.status,
      text: payload.text || '',
      error: payload.error || null,
    });
  } catch (error) {
    console.warn('status fetch failed', error);
    writeJson(res, 500, { ok: false, error: error.message || 'status_failed' });
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    notFound(res);
    return;
  }
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/') {
    writeJson(res, 200, { ok: true, message: 'ScribeCat dev API' });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/v1/health') {
    writeJson(res, 200, { ok: true, haveKey: Boolean(ASSEMBLY_API_KEY) });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/v1/transcribe') {
    await handleTranscribe(req, res);
    return;
  }
  if (req.method === 'GET' && url.pathname.startsWith('/v1/transcribe/')) {
    const id = url.pathname.split('/').pop();
    if (id) {
      await handleTranscriptStatus(req, res, decodeURIComponent(id));
      return;
    }
  }
  notFound(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dev API listening on http://localhost:${PORT}`);
});
