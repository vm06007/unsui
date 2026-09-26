const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorldId } = require('../world-id.cjs');
const { hashSignal } = require('@worldcoin/idkit-core/hashing');
const body = {
  idm: 'card',
  address: '0x' + '1'.repeat(64),
  amountJpy: 1001,
  realBalanceJpy: 2000,
  chain: 'sui',
  requestId: 'a'.repeat(64),
};
const env = {
  WORLD_APP_ID: 'app_test',
  WORLD_RP_ID: 'rp_test',
  WORLD_RP_SIGNING_KEY: '1'.repeat(64),
  WORLD_PUBLIC_BASE_URL: 'https://example.com',
  WORLD_ID_ENVIRONMENT: 'staging',
};

function setup(reply = {}) {
  let forwarded;
  const gate = createWorldId(env, {
    fetch: async (
      url,
      options
    ) => {
      assert.equal(url, 'https://developer.world.org/api/v4/verify/rp_test');
      forwarded = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          environment: 'staging',
          results: [
            { identifier: 'proof_of_human', success: true, nullifier: '0x01' },
          ],
          ...reply,
        }),
      };
    },
  });
  const start = gate.start(body);
  const { config, signal } = gate.getRequest(start.verificationId);
  const proof = {
    protocol_version: '4.0',
    action: config.action,
    nonce: config.rp_context.nonce,
    environment: 'staging',
    responses: [
      {
        identifier: 'proof_of_human',
        issuer_schema_id: 1,
        signal_hash: hashSignal(signal),
        nullifier: '0x1',
        proof: ['fake-test-proof'],
      },
    ],
  };
  return { gate, start, proof, forwarded: () => forwarded };
}
test('IDKit threshold and configuration fail closed', () => {
  const gate = createWorldId({});
  assert.equal(gate.allows({ ...body, amountJpy: 1000 }), true);
  assert.equal(gate.allows(body), false);
  assert.throws(() => gate.start(body), /not configured/);
});
test('official RP signature, exact refund binding and single-use authorization', async () => {
  const { gate, start, proof, forwarded } = setup();
  const request = gate.getRequest(start.verificationId);
  assert.match(request.config.rp_context.signature, /^0x/);
  assert.equal(request.config.allow_legacy_proofs, false);
  assert.equal(request.config.require_user_presence, false);
  const authorized = { ...body, worldVerificationId: start.verificationId };
  assert.equal(gate.allows(authorized), false);
  await gate.complete(start.verificationId, proof);
  assert.deepEqual(forwarded(), proof);
  for (const change of [
    { amountJpy: 1002 },
    { address: '0x' + '2'.repeat(64) },
    { requestId: 'b'.repeat(64) },
    { realBalanceJpy: 3000 },
  ])
    assert.equal(gate.allows({ ...authorized, ...change }), false);
  assert.equal(gate.allows(authorized), true);
  assert.equal(gate.allows(authorized), false);
});
test('wrong nonce, action, environment, signal or credential never authorize', async () => {
  for (const mutate of [
    p => (p.nonce = 'wrong'),
    p => (p.action = 'wrong'),
    p => (p.environment = 'production'),
    p => (p.responses[0].signal_hash = '0x0'),
    p => (p.responses[0].identifier = 'selfie'),
  ]) {
    const { gate, start, proof, forwarded } = setup();
    mutate(proof);
    await assert.rejects(gate.complete(start.verificationId, proof));
    assert.equal(forwarded(), undefined);
    assert.equal(gate.status(start.verificationId).status, 'denied');
  }
});
test('verifier failures, wrong environment, partial success and nullifier mismatch fail closed', async () => {
  for (const reply of [
    { success: false },
    { environment: 'production' },
    { results: [] },
    {
      results: [
        { identifier: 'proof_of_human', success: true, nullifier: '0x2' },
      ],
    },
  ]) {
    const { gate, start, proof } = setup(reply);
    await assert.rejects(gate.complete(start.verificationId, proof));
    assert.equal(
      gate.allows({ ...body, worldVerificationId: start.verificationId }),
      false,
    );
  }
});
test('cancel, expiry and proof replay fail closed', async () => {
  const { gate, start, proof } = setup();
  gate.cancel(start.verificationId);
  await assert.rejects(gate.complete(start.verificationId, proof));
  const next = setup();
  await next.gate.complete(next.start.verificationId, next.proof);
  await assert.rejects(
    next.gate.complete(next.start.verificationId, next.proof),
  );
  let time = Date.now();
  const expired = createWorldId(env, { now: () => time });
  const pending = expired.start(body);
  time += 300001;
  assert.equal(expired.status(pending.verificationId).status, 'expired');
});
test('cancelling during remote verification cannot approve payout', async () => {
  let resolve;
  const gate = createWorldId(env, {
    fetch: () =>
      new Promise(r => {
        resolve = r;
      }),
  });
  const start = gate.start(body);
  const { config, signal } = gate.getRequest(start.verificationId);
  const pending = gate.complete(start.verificationId, {
    protocol_version: '4.0',
    action: config.action,
    nonce: config.rp_context.nonce,
    environment: 'staging',
    responses: [
      {
        identifier: 'proof_of_human',
        issuer_schema_id: 1,
        signal_hash: hashSignal(signal),
        nullifier: '0x1',
      },
    ],
  });
  gate.cancel(start.verificationId);
  resolve({
    ok: true,
    json: async () => ({
      success: true,
      environment: 'staging',
      results: [
        { identifier: 'proof_of_human', success: true, nullifier: '0x1' },
      ],
    }),
  });
  await assert.rejects(pending);
});
test('Selfie mode is optional and enforced server-side', async () => {
  let forwarded;
  const gate = createWorldId(
    { ...env, WORLD_ID_CREDENTIAL: 'selfie' },
    {
      fetch: async (
        _url,
        options
      ) => {
        forwarded = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            success: true,
            environment: 'staging',
            results: [
              { identifier: 'selfie', success: true, nullifier: '0x1' },
            ],
          }),
        };
      },
    },
  );
  const start = gate.start(body);
  const { config, signal, credential } = gate.getRequest(start.verificationId);
  assert.equal(credential, 'selfie');
  const proof = {
    protocol_version: '4.0',
    nonce: config.rp_context.nonce,
    action: config.action,
    environment: 'staging',
    integrity_bundle: { version: 2, jwt: 'provider-test-attestation' },
    responses: [
      {
        identifier: 'selfie',
        issuer_schema_id: 11,
        signal_hash: hashSignal(signal),
        sybil_score: 10,
        nullifier: '0x1',
      },
    ],
  };
  await gate.complete(start.verificationId, proof);
  assert.deepEqual(forwarded, proof);
  assert.equal(
    gate.allows({ ...body, worldVerificationId: start.verificationId }),
    true,
  );
  assert.throws(
    () => createWorldId({ ...env, WORLD_ID_CREDENTIAL: 'unknown' }).start(body),
    /not configured/,
  );
});
test('Selfie mode rejects missing integrity and score', async () => {
  for (const missing of ['integrity', 'score']) {
    const gate = createWorldId(
      { ...env, WORLD_ID_CREDENTIAL: 'selfie' },
      {
        fetch: async () => {
          throw Error('Must not verify incomplete proof');
        },
      },
    );
    const start = gate.start(body);
    const { config, signal } = gate.getRequest(start.verificationId);
    const proof = {
      protocol_version: '4.0',
      nonce: config.rp_context.nonce,
      action: config.action,
      environment: 'staging',
      integrity_bundle: { version: 2 },
      responses: [
        {
          identifier: 'selfie',
          issuer_schema_id: 11,
          signal_hash: hashSignal(signal),
          sybil_score: 10,
          nullifier: '0x1',
        },
      ],
    };
    if (missing === 'score') delete proof.responses[0].sybil_score;
    else delete proof.integrity_bundle;
    await assert.rejects(gate.complete(start.verificationId, proof));
  }
});
test('test bypass is opt-in, non-production, bound and single-use', () => {
  for (const settings of [
    {},
    { WORLD_ALLOW_TEST_BYPASS: 'true', NODE_ENV: 'production' },
    { WORLD_ALLOW_TEST_BYPASS: 'true', WORLD_ID_ENVIRONMENT: 'production' },
  ]) {
    const gate = createWorldId({ ...env, ...settings });
    const s = gate.start(body);
    assert.equal(gate.getRequest(s.verificationId).bypassEnabled, false);
    assert.throws(() => gate.bypass(s.verificationId));
    assert.equal(
      gate.allows({ ...body, worldVerificationId: s.verificationId }),
      false,
    );
  }
  const gate = createWorldId({ ...env, WORLD_ALLOW_TEST_BYPASS: 'true' });
  const s = gate.start(body);
  gate.bypass(s.verificationId);
  assert.equal(gate.status(s.verificationId).status, 'bypassed');
  assert.equal(
    gate.allows({
      ...body,
      amountJpy: 1002,
      worldVerificationId: s.verificationId,
    }),
    false,
  );
  assert.equal(
    gate.allows({ ...body, worldVerificationId: s.verificationId }),
    true,
  );
  assert.equal(
    gate.allows({ ...body, worldVerificationId: s.verificationId }),
    false,
  );
  const cancelled = gate.start(body);
  gate.cancel(cancelled.verificationId);
  assert.throws(() => gate.bypass(cancelled.verificationId));
});
