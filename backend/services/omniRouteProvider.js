// OmniRoute provider — OpenAI-compatible client.
// Backend-only. Never import this from the frontend.
function stripJsonFences(text) {
  if (!text) return text;
  const t = String(text).trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : t;
}

async function chatJson({ system, user }) {
  const base = (process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1').replace(/\/$/, '');
  const apiKey = process.env.OMNIROUTE_API_KEY || '';
  const model = process.env.AI_MODEL || process.env.AI_COMBO_NAME || 'smartgrade pro 3.1';
  const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || '30000', 10);
  const temperature = parseFloat(process.env.AI_TEMPERATURE || '0.2');
  const maxTokens = parseInt(process.env.AI_MAX_TOKENS || '1500', 10);

  if (!apiKey) throw new Error('OMNIROUTE_API_KEY is not configured');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`OmniRoute HTTP ${res.status}: ${body.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('OmniRoute returned empty content');
    return { raw: stripJsonFences(content), modelUsed: data?.model || model };
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error(`OmniRoute timeout after ${timeoutMs}ms`);
      err.status = 504;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function checkHealth() {
  const base = (process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1').replace(/\/$/, '');
  const apiKey = process.env.OMNIROUTE_API_KEY || '';
  try {
    const res = await fetch(`${base}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

module.exports = { chatJson, checkHealth };
