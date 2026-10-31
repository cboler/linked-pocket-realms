/**
 * Linked Pocket Realms — Serverless gcloud WebRTC Signaling Broker & Zero-Knowledge Thunderpass Relay
 *
 * Google Cloud Free-Tier Hardened Architecture:
 * - Zero idle cost (scale-to-zero with min-instances=0)
 * - Strict in-memory capacity bounds & LRU eviction (under 30MB process memory)
 * - Request payload cap (32KB max) to prevent memory exhaustion
 * - Client Cache-Control headers to minimize duplicate network round-trips
 * - Zero stdout logging spam to preserve 50GB/mo Cloud Logging quota
 */

const functions = require('@google-cloud/functions-framework');

// ============================================================================
// FREE-TIER CAPACITY BOUNDS & IN-MEMORY CACHES
// ============================================================================
const SESSION_TTL_MS = 5 * 60 * 1000; // 5-minute TTL for WebRTC rendezvous
const SPORE_TTL_MS = 6 * 60 * 60 * 1000; // 6-hour TTL for Thunderpass proximity spores
const MAX_SESSIONS = 200; // Cap active sessions in RAM
const MAX_ZONE_BUCKETS = 400; // Cap proximity geohash buckets in RAM
const MAX_SPORES_PER_ZONE = 8; // Cap density per geohash cell
const MAX_SIGNALS_PER_SESSION = 20; // Cap pending SDP/ICE signals
const MAX_PAYLOAD_BYTES = 32 * 1024; // 32 KB payload limit

// In-memory data stores
const sessions = new Map(); // roomCode -> SessionRecord
const sporeBuckets = new Map(); // zoneHash -> SporeEntry[]

/**
 * Purges expired sessions and spores to keep heap usage minimal
 */
function purgeExpiredRecords() {
  const now = Date.now();

  // 1. Evict expired WebRTC sessions
  for (const [code, sess] of sessions.entries()) {
    if (now - sess.lastSeenMs > SESSION_TTL_MS) {
      sessions.delete(code);
    }
  }

  // 2. Evict expired Thunderpass spores
  for (const [zoneHash, bucket] of sporeBuckets.entries()) {
    const valid = bucket.filter((item) => item.expiresAtMs > now);
    if (valid.length === 0) {
      sporeBuckets.delete(zoneHash);
    } else {
      sporeBuckets.set(zoneHash, valid);
    }
  }
}

/**
 * LRU eviction helper for WebRTC sessions when capacity is reached
 */
function setSessionBounded(roomCode, sessionData) {
  if (sessions.size >= MAX_SESSIONS && !sessions.has(roomCode)) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [k, v] of sessions.entries()) {
      if (v.lastSeenMs < oldestTime) {
        oldestTime = v.lastSeenMs;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      sessions.delete(oldestKey);
    }
  }
  sessions.set(roomCode, sessionData);
}

/**
 * LRU eviction helper for Thunderpass zone buckets
 */
function addSporeBounded(zoneHash, sporePayload, expiresAtMs) {
  let bucket = sporeBuckets.get(zoneHash);
  if (!bucket) {
    if (sporeBuckets.size >= MAX_ZONE_BUCKETS) {
      const firstKey = sporeBuckets.keys().next().value;
      if (firstKey) {
        sporeBuckets.delete(firstKey);
      }
    }
    bucket = [];
    sporeBuckets.set(zoneHash, bucket);
  }

  // Extract matches from other peers in this zone
  const senderKey = sporePayload.peerPublicKey;
  const matchingSpores = bucket
    .filter((item) => item.spore.peerPublicKey !== senderKey)
    .map((item) => item.spore);

  // Upsert sender spore
  const existingIndex = bucket.findIndex((item) => item.spore.peerPublicKey === senderKey);
  if (existingIndex >= 0) {
    bucket[existingIndex] = { spore: sporePayload, expiresAtMs };
  } else {
    bucket.push({ spore: sporePayload, expiresAtMs });
  }

  // Cap bucket density
  if (bucket.length > MAX_SPORES_PER_ZONE) {
    bucket.splice(0, bucket.length - MAX_SPORES_PER_ZONE);
  }

  return matchingSpores;
}

/**
 * Configures CORS, security, and cache headers
 */
function setSecurityHeaders(res, cacheHeader = 'no-store') {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '86400');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', cacheHeader);
}

// ============================================================================
// CLOUD FUNCTION HTTP ROUTER
// ============================================================================
functions.http('broker', (req, res) => {
  // Fast CORS preflight handling
  if (req.method === 'OPTIONS') {
    setSecurityHeaders(res, 'public, max-age=86400');
    res.status(204).send('');
    return;
  }

  // Payload size enforcement to prevent memory exhaustion
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    setSecurityHeaders(res, 'no-store');
    res.status(413).json({ error: 'Payload exceeds 32KB free-tier safety limit' });
    return;
  }

  // Run lightweight TTL sweep
  purgeExpiredRecords();

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // ROUTE: GET /health — Zero-compute cached health check
  if (pathname === '/health' && req.method === 'GET') {
    setSecurityHeaders(res, 'public, max-age=60');
    res.status(200).json({
      status: 'HEALTHY',
      service: 'linked-pocket-realms-broker',
      tier: 'always-free-scale-to-zero',
      uptimeSec: Math.floor(process.uptime()),
      activeSessions: sessions.size,
      activeZones: sporeBuckets.size,
      memUsageMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      timestampIso: new Date().toISOString(),
    });
    return;
  }

  // ROUTE: GET /sessions — List active public/friend lobby sessions
  if (pathname === '/sessions' && req.method === 'GET') {
    setSecurityHeaders(res, 'public, max-age=2');
    const activeList = Array.from(sessions.values()).map((s) => ({
      roomCode: s.roomCode,
      hostName: s.hostName,
      triChord: s.triChord,
      hasOffer: Boolean(s.sdpOffer),
      hasAnswer: Boolean(s.sdpAnswer),
      lastSeenMs: s.lastSeenMs,
    }));
    res.status(200).json({ sessions: activeList });
    return;
  }

  // ROUTE: POST /signal — Exchange WebRTC SDP Offers/Answers and ICE candidates
  if (pathname === '/signal' && req.method === 'POST') {
    setSecurityHeaders(res, 'no-store');
    const body = req.body || {};
    const { roomCode, type, payload, senderId, hostName, triChord } = body;

    if (!roomCode) {
      res.status(400).json({ error: 'Missing required field: roomCode' });
      return;
    }

    const now = Date.now();
    let session = sessions.get(roomCode);
    if (!session) {
      session = {
        roomCode,
        hostName: hostName || 'Unknown Realm',
        triChord: triChord || 'Θ: Scorching Clockwork Catacombs',
        sdpOffer: null,
        sdpAnswer: null,
        signals: [],
        lastSeenMs: now,
      };
      setSessionBounded(roomCode, session);
    }

    session.lastSeenMs = now;
    if (hostName) session.hostName = hostName;
    if (triChord) session.triChord = triChord;

    if (type === 'OFFER') {
      session.sdpOffer = payload;
      session.signals.push({ type: 'OFFER', payload, senderId, timestampMs: now });
    } else if (type === 'ANSWER') {
      session.sdpAnswer = payload;
      session.signals.push({ type: 'ANSWER', payload, senderId, timestampMs: now });
    } else if (type === 'ICE') {
      session.signals.push({ type: 'ICE', payload, senderId, timestampMs: now });
    }

    // Keep only the most recent signals per session
    if (session.signals.length > MAX_SIGNALS_PER_SESSION) {
      session.signals = session.signals.slice(-MAX_SIGNALS_PER_SESSION);
    }

    res.status(200).json({
      status: 'SIGNAL_RECORDED',
      roomCode,
      type,
      timestampMs: now,
    });
    return;
  }

  // ROUTE: GET /signal?roomCode=...&sinceMs=... — Poll pending signals
  if (pathname === '/signal' && req.method === 'GET') {
    setSecurityHeaders(res, 'no-store');
    const roomCode = url.searchParams.get('roomCode');
    const sinceMs = parseInt(url.searchParams.get('sinceMs') || '0', 10);

    if (!roomCode) {
      res.status(400).json({ error: 'Missing query parameter: roomCode' });
      return;
    }

    const session = sessions.get(roomCode);
    if (!session) {
      res.status(200).json({ roomCode, signals: [], isClosed: true });
      return;
    }

    session.lastSeenMs = Date.now();
    const newSignals = session.signals.filter((s) => s.timestampMs > sinceMs);
    res.status(200).json({
      roomCode,
      signals: newSignals,
      sdpOffer: session.sdpOffer,
      sdpAnswer: session.sdpAnswer,
    });
    return;
  }

  // ROUTE: POST /thunderpass — Zero-Knowledge Proximity Spore Relay
  if (pathname === '/thunderpass' && req.method === 'POST') {
    setSecurityHeaders(res, 'no-store');
    const body = req.body || {};
    const { zoneHash, sporePayload } = body;

    if (!zoneHash || !sporePayload || !sporePayload.peerPublicKey) {
      res.status(400).json({ error: 'Missing required field: zoneHash or sporePayload' });
      return;
    }

    const now = Date.now();
    const expiresAtMs = now + SPORE_TTL_MS;

    const matchingSpores = addSporeBounded(zoneHash, sporePayload, expiresAtMs);

    res.status(200).json({
      status: 'SPORE_RELAYED',
      zoneHash,
      matchesFound: matchingSpores.length,
      matchingSpores,
      ttlHours: 6,
    });
    return;
  }

  // Fallback 404
  setSecurityHeaders(res, 'public, max-age=300');
  res.status(404).json({
    error: 'Endpoint not found',
    supportedEndpoints: [
      'GET /health',
      'GET /sessions',
      'POST /signal',
      'GET /signal',
      'POST /thunderpass',
    ],
  });
});
