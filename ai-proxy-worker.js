// Cloudflare Worker: keeps your Gemini key on the server so the site needs no key from users.
// Setup: Workers & Pages -> Create Worker -> paste this -> Settings -> Variables -> add secret GEMINI_KEY.
// Do NOT attach a billing card to the Google project: the free tier then simply stops at its limit.
const ORIGINS = ['https://ras4ek.github.io'];
const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const ok = ORIGINS.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : ORIGINS[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST' || !ok) return new Response('Forbidden', { status: 403, headers: cors });
    let body; try { body = await req.json(); } catch (e) { return new Response('Bad request', { status: 400, headers: cors }); }
    const contents = (Array.isArray(body.messages) ? body.messages : []).slice(-12).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.text || '').slice(0, 1500) }] }));
    if (!contents.length) return new Response('Bad request', { status: 400, headers: cors });
    const system = String(body.system || '').slice(0, 2000);
    for (const m of MODELS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 500 } }) });
      if (r.status === 404) continue;
      if (!r.ok) return new Response(JSON.stringify({ error: r.status }), { status: r.status === 429 ? 429 : 502, headers: { ...cors, 'Content-Type': 'application/json' } });
      const j = await r.json();
      const text = (((j.candidates || [])[0] || {}).content || {}).parts;
      return new Response(JSON.stringify({ text: (text || []).map(p => p.text || '').join('').trim() }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 404 }), { status: 502, headers: cors });
  }
};
