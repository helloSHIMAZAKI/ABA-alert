import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseAbaMessage, ParsedDonation } from './src/utils/abaParser.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration store
interface AppConfig {
  botToken: string;
  chatId: string;
  apiId: string;
  apiHash: string;
  thankPrefix: string;
  verb: string;
  alertDuration: number; // in seconds
  soundEnabled: boolean;
  soundVolume: number;
  ttsEnabled: boolean;
  ttsVolume: number;
  glowColor: string;
}

const config: AppConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '-5214008501', // Pre-fill with detected group from user's screenshot
  apiId: process.env.TELEGRAM_API_ID || '36414234',
  apiHash: process.env.TELEGRAM_API_HASH || 'ce2196bb071d9fa4efaf16b75e3c318f',
  thankPrefix: 'អរគុណ មេ',
  verb: 'បានឧបត្ថម្ភ',
  alertDuration: 8,
  soundEnabled: true,
  soundVolume: 0.8,
  ttsEnabled: true,
  ttsVolume: 1.0,
  glowColor: '#00d68f',
};

// Donation history store (in memory)
const donationHistory: ParsedDonation[] = [
  {
    id: 'demo_1',
    donorName: 'zaion',
    amount: 1.00,
    formattedAmount: '$ 1.00',
    currency: 'USD',
    remark: 'This is a test message from your viewer.',
    trxId: '179308331516889',
    apv: '718415',
    dateStr: 'Oct 27, 01:41 PM',
    rawText: '$1.00 paid by zaion (*123) on Oct 27, 01:41 PM via ABA PAY. Remark: This is a test message from your viewer.',
    timestamp: Date.now() - 3600000,
    ttsScript: 'អរគុណ មេ zaion បានឧបត្ថម្ភ 1 ដុល្លារ This is a test message from your viewer.',
  },
  {
    id: 'demo_2',
    donorName: 'HUN CHHING CHHING',
    amount: 0.50,
    formattedAmount: '$ 0.50',
    currency: 'USD',
    trxId: '179308280412746',
    apv: '809453',
    dateStr: 'Oct 27, 01:33 PM',
    rawText: '$0.50 paid by HUN CHHING CHHING (*280) on Oct 27, 01:33 PM via ABA PAY at HUN CHHING CHHING. Trx. ID: 179308280412746, APV: 809453.',
    timestamp: Date.now() - 7200000,
    ttsScript: 'អរគុណ មេ HUN CHHING CHHING បានឧបត្ថម្ភ 0.5 ដុល្លារ',
  }
];

// Server-Sent Events subscribers for real-time OBS overlays
interface SSEClient {
  id: string;
  res: Response;
}
let sseClients: SSEClient[] = [];

function broadcastDonation(donation: ParsedDonation) {
  donationHistory.unshift(donation);
  if (donationHistory.length > 200) {
    donationHistory.pop();
  }

  const payload = `data: ${JSON.stringify(donation)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  });
}

// Telegram Polling Engine
let isPolling = false;
let pollAbortController: AbortController | null = null;
let lastUpdateId = 0;
let telegramListenerStatus = {
  running: false,
  lastPollTime: 0,
  lastError: '',
  messagesReceived: 0,
  donationsDetected: 0,
};

async function startTelegramPolling() {
  if (isPolling) return;
  if (!config.botToken || config.botToken.trim().length === 0) {
    telegramListenerStatus.lastError = 'No Telegram Bot Token provided.';
    return;
  }

  isPolling = true;
  pollAbortController = new AbortController();
  telegramListenerStatus.running = true;
  telegramListenerStatus.lastError = '';

  console.log('[Telegram Poller] Starting polling service with token prefix:', config.botToken.slice(0, 6) + '...');

  (async () => {
    while (isPolling) {
      try {
        telegramListenerStatus.lastPollTime = Date.now();
        const url = `https://api.telegram.org/bot${encodeURIComponent(config.botToken)}/getUpdates?offset=${lastUpdateId + 1}&timeout=15`;
        const res = await fetch(url, { signal: pollAbortController?.signal });

        if (!res.ok) {
          const errText = await res.text();
          telegramListenerStatus.lastError = `Telegram API Error (${res.status}): ${errText}`;
          await new Promise(r => setTimeout(r, 4000));
          continue;
        }

        const data = await res.json() as { ok: boolean; result?: Array<{ update_id: number; message?: { chat?: { id: number | string }; text?: string; caption?: string }; channel_post?: { chat?: { id: number | string }; text?: string; caption?: string } }> };

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateId = Math.max(lastUpdateId, update.update_id);
            telegramListenerStatus.messagesReceived++;

            const msg = update.message || update.channel_post;
            if (!msg) continue;

            const chatMatch = !config.chatId || 
              String(msg.chat?.id) === String(config.chatId) || 
              String(msg.chat?.id).includes(String(config.chatId).replace(/^-100/, ''));

            const text = msg.text || msg.caption || '';
            if (chatMatch && text) {
              const donation = parseAbaMessage(text, {
                thankPrefix: config.thankPrefix,
                verb: config.verb,
              });

              if (donation) {
                telegramListenerStatus.donationsDetected++;
                console.log('[Telegram Poller] ABA Donation detected:', donation.donorName, donation.formattedAmount);
                broadcastDonation(donation);
              }
            }
          }
        }
      } catch (err: unknown) {
        if (!isPolling) break;
        telegramListenerStatus.lastError = err instanceof Error ? err.message : String(err);
        await new Promise(r => setTimeout(r, 4000));
      }
    }
    telegramListenerStatus.running = false;
  })();
}

function stopTelegramPolling() {
  isPolling = false;
  if (pollAbortController) {
    pollAbortController.abort();
    pollAbortController = null;
  }
  telegramListenerStatus.running = false;
}

// REST APIs
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    config,
    listenerStatus: telegramListenerStatus,
  });
});

app.post('/api/config', (req: Request, res: Response) => {
  const prevToken = config.botToken;
  Object.assign(config, req.body);

  if (config.botToken !== prevToken) {
    stopTelegramPolling();
    if (config.botToken.trim()) {
      startTelegramPolling();
    }
  }

  res.json({ success: true, config, listenerStatus: telegramListenerStatus });
});

app.post('/api/telegram/toggle', (req: Request, res: Response) => {
  const { action } = req.body;
  if (action === 'start') {
    startTelegramPolling();
  } else {
    stopTelegramPolling();
  }
  res.json({ success: true, listenerStatus: telegramListenerStatus });
});

app.get('/api/donations', (_req: Request, res: Response) => {
  res.json(donationHistory);
});

// SSE endpoint for OBS browser source
app.get('/api/alerts/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const client: SSEClient = { id: clientId, res };
  sseClients.push(client);

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  // Heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// Test trigger alert
app.post('/api/test-alert', (req: Request, res: Response) => {
  const { donorName = 'zaion', amount = 1.00, currency = 'USD', remark = 'This is a test message from your viewer.' } = req.body;

  const numAmount = parseFloat(String(amount)) || 1.00;
  const curr = currency === 'KHR' ? 'KHR' : 'USD';
  const formattedAmount = curr === 'KHR' ? `${numAmount.toLocaleString()} ៛` : `$ ${numAmount.toFixed(2)}`;

  const testDonation: ParsedDonation = {
    id: `test_${Date.now()}`,
    donorName: donorName || 'zaion',
    amount: numAmount,
    formattedAmount,
    currency: curr,
    remark: remark || undefined,
    trxId: `TEST${Math.floor(100000 + Math.random() * 900000)}`,
    apv: `${Math.floor(100000 + Math.random() * 900000)}`,
    dateStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    rawText: `Manual test: ${formattedAmount} by ${donorName}`,
    timestamp: Date.now(),
    ttsScript: `${config.thankPrefix} ${donorName} ${config.verb} ${curr === 'KHR' ? `${numAmount.toLocaleString()} រៀល` : `${numAmount} ដុល្លារ`} ${remark || ''}`.trim(),
  };

  broadcastDonation(testDonation);
  res.json({ success: true, donation: testDonation });
});

// Parse raw telegram message
app.post('/api/parse-text', (req: Request, res: Response) => {
  const { text, triggerAlert = false } = req.body;
  const parsed = parseAbaMessage(text, {
    thankPrefix: config.thankPrefix,
    verb: config.verb,
  });

  if (parsed && triggerAlert) {
    broadcastDonation(parsed);
  }

  res.json({ success: true, parsed });
});

// Telegram Webhook endpoint (if user sets webhook instead of long polling)
app.post('/api/webhook/telegram', (req: Request, res: Response) => {
  const update = req.body;
  const msg = update?.message || update?.channel_post;
  if (msg) {
    const text = msg.text || msg.caption || '';
    const parsed = parseAbaMessage(text, {
      thankPrefix: config.thankPrefix,
      verb: config.verb,
    });
    if (parsed) {
      broadcastDonation(parsed);
    }
  }
  res.json({ ok: true });
});

// Direct Khmer TTS Proxy
app.get('/api/tts', async (req: Request, res: Response) => {
  const text = (req.query.text as string) || '';
  const lang = (req.query.lang as string) || 'km';

  if (!text.trim()) {
    res.status(400).send('Text query required');
    return;
  }

  try {
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text)}`;
    const ttsRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!ttsRes.ok) {
      res.status(ttsRes.status).send('TTS upstream error');
      return;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await ttsRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).send('TTS error');
  }
});

// Start Express and integrate Vite
async function startServer() {
  if (config.botToken.trim()) {
    startTelegramPolling();
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] ABA OBS Donation Alert running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start:', err);
});
