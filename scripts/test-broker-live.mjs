/**
 * Live Broker & Mesh Integration Test Suite
 *
 * Runs end-to-end integration tests against the live Google Cloud Functions broker:
 * 1. Health check & memory diagnostics
 * 2. Multi-client session registration & listing
 * 3. Client re-announcement de-duplication (same senderId evicts old room)
 * 4. WebRTC SDP Offer/Answer signaling & ICE candidate exchange
 * 5. Zero-Knowledge Thunderpass proximity spore relay & matching
 * 6. Clean session departure (LEAVE signal immediate purge)
 * 7. Security payload limit enforcement (32KB cap)
 * 8. CORS preflight compliance
 */

const BROKER_URL = process.env.BROKER_URL || 'https://pocket-realms-broker-j26ghnm2tq-uc.a.run.app';

console.log('====================================================');
console.log(' Linked Pocket Realms — Broker Integration Test');
console.log(` Target Endpoint: ${BROKER_URL}`);
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
    failedTests++;
  }
}

async function runTests() {
  const clientA_SenderId = `peer-test-client-a-${Date.now()}`;
  const clientB_SenderId = `peer-test-client-b-${Date.now()}`;
  const roomA1 = `LOOM-TEST-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const roomA2 = `LOOM-TEST-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const roomB = `LOOM-TEST-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // --------------------------------------------------------------------------
  // TEST 1: CORS Preflight (OPTIONS /signal)
  // --------------------------------------------------------------------------
  console.log('[1/8] Verifying CORS Preflight Headers...');
  try {
    const corsRes = await fetch(`${BROKER_URL}/signal`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://cboler.github.io',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    assert(corsRes.status === 204, 'Preflight returns HTTP 204');
    assert(
      corsRes.headers.get('access-control-allow-origin') === '*',
      'Access-Control-Allow-Origin is wildcard',
    );
    assert(
      corsRes.headers.get('access-control-allow-methods')?.includes('POST'),
      'Methods include POST',
    );
  } catch (err) {
    assert(false, 'CORS Preflight request', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Health Check & System Telemetry
  // --------------------------------------------------------------------------
  console.log('\n[2/8] Testing /health Telemetry & Free-Tier Metadata...');
  try {
    const healthRes = await fetch(`${BROKER_URL}/health`);
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
    const health = await healthRes.json();
    assert(health.status === 'HEALTHY', 'Status is HEALTHY', health.status);
    assert(
      health.tier === 'always-free-scale-to-zero',
      'Tier is always-free-scale-to-zero',
      health.tier,
    );
    assert(typeof health.uptimeSec === 'number', 'Uptime is tracked');
    assert(
      typeof health.memUsageMb === 'number' && health.memUsageMb < 256,
      'Memory within safety limits (<256MB)',
    );
  } catch (err) {
    assert(false, 'Health check request', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Client A & Client B Registration
  // --------------------------------------------------------------------------
  console.log('\n[3/8] Testing Multi-Client Lobby Announcements...');
  try {
    const annARes = await fetch(`${BROKER_URL}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: roomA1,
        type: 'ANNOUNCE',
        senderId: clientA_SenderId,
        hostName: 'Vanguard_Alpha',
        triChord: 'Θ: Scorching Clockwork Catacombs',
        heraldGreeting: 'Strength in gears!',
      }),
    });
    assert(annARes.status === 200, 'Client A announcement succeeds');

    const annBRes = await fetch(`${BROKER_URL}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: roomB,
        type: 'ANNOUNCE',
        senderId: clientB_SenderId,
        hostName: 'Chronomancer_Beta',
        triChord: 'Δ: Silent Fungal Observatory',
        heraldGreeting: 'Time bends for mushrooms!',
      }),
    });
    assert(annBRes.status === 200, 'Client B announcement succeeds');

    const sessionsRes = await fetch(`${BROKER_URL}/sessions`);
    const sessionsData = await sessionsRes.json();
    const foundA = sessionsData.sessions?.find((s) => s.roomCode === roomA1);
    const foundB = sessionsData.sessions?.find((s) => s.roomCode === roomB);
    assert(Boolean(foundA), `Client A lobby discovered (${roomA1})`);
    assert(Boolean(foundB), `Client B lobby discovered (${roomB})`);
    assert(foundA?.hostName === 'Vanguard_Alpha', 'Client A metadata preserved');
  } catch (err) {
    assert(false, 'Multi-client announcement', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Sender De-duplication on Refresh / Re-announcement
  // --------------------------------------------------------------------------
  console.log('\n[4/8] Testing Sender De-duplication (Tab Refresh Emulation)...');
  try {
    // Client A refreshes page, getting a new room code (roomA2) but keeping same senderId
    await fetch(`${BROKER_URL}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: roomA2,
        type: 'ANNOUNCE',
        senderId: clientA_SenderId,
        hostName: 'Vanguard_Alpha',
        triChord: 'Θ: Scorching Clockwork Catacombs',
      }),
    });

    const sessionsRes = await fetch(`${BROKER_URL}/sessions`);
    const sessionsData = await sessionsRes.json();
    const staleRoom = sessionsData.sessions?.find((s) => s.roomCode === roomA1);
    const activeRoom = sessionsData.sessions?.find((s) => s.roomCode === roomA2);
    const clientACount = sessionsData.sessions?.filter(
      (s) => s.senderId === clientA_SenderId,
    ).length;

    assert(!staleRoom, `Older roomCode (${roomA1}) was evicted`);
    assert(Boolean(activeRoom), `New roomCode (${roomA2}) is active`);
    assert(clientACount === 1, `Exactly 1 session exists for Client A (no ghost duplicates)`);
  } catch (err) {
    assert(false, 'Sender de-duplication', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: WebRTC SDP Offer / Answer Signaling & ICE Candidates
  // --------------------------------------------------------------------------
  console.log('\n[5/8] Testing Full WebRTC Signaling Exchange...');
  try {
    // 1. Client A publishes SDP OFFER
    const mockOfferSdp = 'v=0\r\no=ClientA 123 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=sendrecv';
    await fetch(`${BROKER_URL}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: roomA2,
        type: 'OFFER',
        payload: mockOfferSdp,
        senderId: clientA_SenderId,
      }),
    });

    // 2. Client B polls for the OFFER
    const pollOfferRes = await fetch(`${BROKER_URL}/signal?roomCode=${roomA2}`);
    const pollOfferData = await pollOfferRes.json();
    assert(pollOfferData.sdpOffer === mockOfferSdp, 'Client B successfully received SDP Offer');

    // 3. Client B replies with SDP ANSWER
    const mockAnswerSdp = 'v=0\r\no=ClientB 456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=recvonly';
    await fetch(`${BROKER_URL}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: roomA2,
        type: 'ANSWER',
        payload: mockAnswerSdp,
        senderId: clientB_SenderId,
      }),
    });

    // 4. Client A polls for the ANSWER
    const pollAnswerRes = await fetch(`${BROKER_URL}/signal?roomCode=${roomA2}`);
    const pollAnswerData = await pollAnswerRes.json();
    assert(pollAnswerData.sdpAnswer === mockAnswerSdp, 'Client A successfully received SDP Answer');

    // 5. Exchange ICE candidate
    const mockIce = {
      candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host',
      sdpMid: '0',
    };
    await fetch(`${BROKER_URL}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: roomA2,
        type: 'ICE',
        payload: mockIce,
        senderId: clientA_SenderId,
      }),
    });

    const pollIceRes = await fetch(`${BROKER_URL}/signal?roomCode=${roomA2}`);
    const pollIceData = await pollIceRes.json();
    const hasCandidate = pollIceData.iceCandidates?.some((c) => c.candidate === mockIce.candidate);
    assert(hasCandidate, 'Client B retrieved Client A ICE candidate');
  } catch (err) {
    assert(false, 'WebRTC signaling', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Zero-Knowledge Thunderpass Proximity Spore Relay
  // --------------------------------------------------------------------------
  console.log('\n[6/8] Testing Zero-Knowledge Thunderpass StreetPass Spore Relay...');
  try {
    const testZoneHash = '9q8yyk-test-zone-hash';
    const sporeA = {
      peerPublicKey: 'pk_alpha_987654321',
      travelerEcho: { name: 'Vanguard_Alpha', level: 12, archetype: 'Vanguard' },
      sporeDna: 'spore_alpha_dna_payload',
      timestampMs: Date.now(),
    };
    const sporeB = {
      peerPublicKey: 'pk_beta_123456789',
      travelerEcho: { name: 'Chronomancer_Beta', level: 14, archetype: 'Chronomancer' },
      sporeDna: 'spore_beta_dna_payload',
      timestampMs: Date.now(),
    };

    // 1. Client A drops spore in zone
    const dropResA = await fetch(`${BROKER_URL}/thunderpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zoneHash: testZoneHash, sporePayload: sporeA }),
    });
    const dropDataA = await dropResA.json();
    assert(dropResA.status === 200, 'Client A dropped proximity spore');

    // 2. Client B enters same zone and drops spore
    const dropResB = await fetch(`${BROKER_URL}/thunderpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zoneHash: testZoneHash, sporePayload: sporeB }),
    });
    const dropDataB = await dropResB.json();
    assert(dropResB.status === 200, 'Client B dropped proximity spore');
    assert(dropDataB.matchesFound >= 1, 'Client B discovered nearby spore match');
    const matchedSpore = dropDataB.matchingSpores?.find(
      (s) => s.peerPublicKey === sporeA.peerPublicKey,
    );
    assert(Boolean(matchedSpore), 'Client B received Client A traveler echo');
  } catch (err) {
    assert(false, 'Thunderpass spore relay', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Clean Session Departure (LEAVE Signal)
  // --------------------------------------------------------------------------
  console.log('\n[7/8] Testing Clean Departure (Instant Purge via LEAVE)...');
  try {
    const leaveResA = await fetch(`${BROKER_URL}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: roomA2,
        type: 'LEAVE',
        senderId: clientA_SenderId,
      }),
    });
    assert(leaveResA.status === 200, 'Client A sent LEAVE signal');

    const leaveResB = await fetch(`${BROKER_URL}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: roomB,
        type: 'LEAVE',
        senderId: clientB_SenderId,
      }),
    });
    assert(leaveResB.status === 200, 'Client B sent LEAVE signal');

    const sessionsAfterLeave = await fetch(`${BROKER_URL}/sessions`);
    const sessionsAfterData = await sessionsAfterLeave.json();
    const residualA = sessionsAfterData.sessions?.find((s) => s.roomCode === roomA2);
    const residualB = sessionsAfterData.sessions?.find((s) => s.roomCode === roomB);

    assert(!residualA, 'Client A session instantly removed from active list');
    assert(!residualB, 'Client B session instantly removed from active list');
  } catch (err) {
    assert(false, 'Clean session departure', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Free-Tier Payload Safety Enforcement
  // --------------------------------------------------------------------------
  console.log('\n[8/8] Testing Free-Tier Safety Limits (32KB Max Payload)...');
  try {
    const oversizedPayload = 'X'.repeat(35 * 1024); // 35 KB > 32 KB limit
    const overflowRes = await fetch(`${BROKER_URL}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: 'LOOM-OVERSIZE',
        type: 'OFFER',
        payload: oversizedPayload,
      }),
    });
    assert(overflowRes.status === 413, 'Oversized payload rejected with HTTP 413');
  } catch (err) {
    assert(false, 'Payload limit enforcement', err.message);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(` Integration Test Complete: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
