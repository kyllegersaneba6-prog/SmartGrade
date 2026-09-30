// Connectivity test: backend -> OmniRoute -> combo. Run: node test-omni.js
// Does NOT print the API key.
require('dotenv').config();
const { checkHealth, chatJson } = require('./services/omniRouteProvider');

(async () => {
  console.log('Gateway:', process.env.OMNIROUTE_BASE_URL);
  console.log('Model/combo:', process.env.AI_MODEL || process.env.AI_COMBO_NAME);
  console.log('Key present:', Boolean(process.env.OMNIROUTE_API_KEY), `(len ${(process.env.OMNIROUTE_API_KEY || '').length})`);

  const h = await checkHealth();
  console.log('Health:', JSON.stringify(h));
  if (!h.ok) {
    console.log('FAIL: OmniRoute not reachable or unauthorized. Is `omniroute serve` running on :20128?');
    process.exit(1);
  }
  console.log('Sending tiny test completion via combo...');
  const { raw, modelUsed } = await chatJson({
    system: 'Return valid JSON only: {"ok": true}',
    user: 'Reply with {"ok": true} and nothing else.',
  });
  console.log('Model used:', modelUsed);
  console.log('Raw reply:', raw.slice(0, 300));
  console.log('PASS: OmniRoute combo responded.');
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
