import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function echoApiDevPlugin(): Plugin {
  // In-memory persistent session storage during Vite dev server lifecycle
  const devSessions: any[] = [
    {
      sessionId: 'sess_prev_demo_01',
      userId: 'user_alex_chen_demo',
      startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      endedAt: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(),
      messages: [
        { role: 'model', text: 'Welcome to Echo. What’s on your mind today?', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
        { role: 'user', text: 'I am struggling with setting boundaries between remote work and personal life.', timestamp: new Date(Date.now() - 86400000 * 2 + 60000).toISOString() },
        { role: 'model', text: 'That is a very common challenge when physical spaces blur. What is one specific moment recently where you felt that line get crossed?', timestamp: new Date(Date.now() - 86400000 * 2 + 120000).toISOString() }
      ],
      summary: 'Explored feelings of burnout and blurred boundaries in remote work routines.',
      extractedTheme: 'remote work-life boundaries',
      followUpQuestion: 'What is one concrete ritual you can use to signify the end of your workday?',
      followUpAsked: true,
      followUpReferencedNext: true
    }
  ];

  return {
    name: 'echo-api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const readBody = async (): Promise<any> => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        const sendJson = (statusCode: number, data: any) => {
          res.statusCode = statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
        const pathname = parsedUrl.pathname;

        if (pathname === '/api/session/start' && req.method === 'POST') {
          // Signature next-session callback: look up most recent session with extractedTheme
          const recentThemed = devSessions.find((s) => s.extractedTheme);
          const previousTheme = recentThemed ? recentThemed.extractedTheme : null;
          const sessionId = 'sess_' + Math.random().toString(36).substring(2, 14);
          const nowIso = new Date().toISOString();

          let openingMessage = "Welcome to Echo. This is your private space to reflect, untangle thoughts, or brainstorm. What's on your mind today?";
          if (previousTheme) {
            openingMessage = `Welcome back! Last time you were exploring "${previousTheme}". How has that been settling with you, or is there a fresh thought on your mind today?`;
          }

          const newSession = {
            sessionId,
            userId: 'user_alex_chen_demo',
            startedAt: nowIso,
            endedAt: null,
            messages: [{ role: 'model', text: openingMessage, timestamp: nowIso }],
            summary: null,
            extractedTheme: null,
            followUpQuestion: null,
            followUpAsked: false,
            followUpReferencedNext: false,
          };
          devSessions.unshift(newSession);

          return sendJson(201, {
            sessionId,
            openingMessage,
            previousTheme,
            startedAt: nowIso,
          });
        }

        if (pathname === '/api/session/message' && req.method === 'POST') {
          const body = await readBody();
          const { sessionId, text } = body;
          const session = devSessions.find((s) => s.sessionId === sessionId);

          if (!session) {
            return sendJson(404, { detail: 'Session not found for user.' });
          }

          const nowIso = new Date().toISOString();
          session.messages.push({ role: 'user', text: text || '', timestamp: nowIso });

          // Generate thoughtful reflective reply
          let reply = `I hear how much thought you've been putting into this. When you pause and notice that, what feels like the most essential aspect to explore?`;
          const lower = (text || '').toLowerCase();
          if (lower.includes('decision') || lower.includes('choose') || lower.includes('option')) {
            reply = `Decisions with multiple moving parts often carry hidden values. If you removed everyone else's expectations for a moment, what direction does your genuine intuition point toward?`;
          } else if (lower.includes('stress') || lower.includes('overwhelm') || lower.includes('anxious') || lower.includes('tired')) {
            reply = `That sounds like a heavy emotional weight. Let's take a breath with this for a moment. What is the one small part of this situation that is genuinely within your control today?`;
          } else if (lower.includes('idea') || lower.includes('project') || lower.includes('create') || lower.includes('goal')) {
            reply = `That is an energizing thread to pull on. What excites you the most about this possibility, and what’s a low-stakes first experiment you could try?`;
          }

          session.messages.push({ role: 'model', text: reply, timestamp: new Date().toISOString() });

          return sendJson(200, {
            reply,
            sessionId,
            messages: session.messages,
          });
        }

        if (pathname === '/api/session/end' && req.method === 'POST') {
          const body = await readBody();
          const { sessionId } = body;
          const session = devSessions.find((s) => s.sessionId === sessionId);

          if (!session) {
            return sendJson(404, { detail: 'Session not found for user.' });
          }

          const nowIso = new Date().toISOString();
          session.endedAt = nowIso;
          session.summary = 'A grounded conversation exploring personal thoughts, untangling daily priorities, and building clarity.';
          session.extractedTheme = 'clarifying priorities and focus';
          session.followUpQuestion = 'What is one gentle boundary or commitment you want to keep with yourself before tomorrow?';
          session.followUpAsked = true;

          return sendJson(200, {
            summary: session.summary,
            extractedTheme: session.extractedTheme,
            followUpQuestion: session.followUpQuestion,
            sessionId,
            endedAt: nowIso,
            followUpAsked: true,
          });
        }

        if (pathname === '/api/sessions' && req.method === 'GET') {
          return sendJson(200, { sessions: devSessions });
        }

        if (pathname.startsWith('/api/session/') && req.method === 'GET') {
          const sid = pathname.replace('/api/session/', '');
          const session = devSessions.find((s) => s.sessionId === sid);
          if (!session) {
            return sendJson(404, { detail: 'Session not found.' });
          }
          return sendJson(200, { session });
        }

        return next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), echoApiDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
