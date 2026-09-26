const { randomBytes, createHash } = require('node:crypto');
const { signRequest } = require('@worldcoin/idkit-core/signing');
const { hashSignal } = require('@worldcoin/idkit-core/hashing');
const random = () => randomBytes(32).toString('base64url');

function refundBinding(b) {
  const {
    idm,
    address,
    amountJpy,
    realBalanceJpy,
    chain = 'sui',
    requestId,
  } = b;
  if (
    typeof idm !== 'string' ||
    !idm.length ||
    idm.length > 64 ||
    !['sui', 'ethereum', 'mizuhiki'].includes(chain) ||
    typeof address !== 'string' ||
    !(chain === 'sui' ? /^0x[\da-f]{64}$/i : /^0x[\da-f]{40}$/i).test(
      address,
    ) ||
    !Number.isSafeInteger(amountJpy) ||
    amountJpy <= 0 ||
    amountJpy > 20000 ||
    !Number.isSafeInteger(realBalanceJpy) ||
    realBalanceJpy < amountJpy ||
    realBalanceJpy > 20000 ||
    !/^[a-f0-9]{64}$/.test(requestId || '')
  )
    throw Error('Invalid refund request');
  return createHash('sha256')
    .update(
      JSON.stringify([
        idm.toLowerCase(),
        address.toLowerCase(),
        amountJpy,
        realBalanceJpy,
        chain,
        requestId,
      ]),
    )
    .digest('hex');
}

function createWorldId(
  env = process.env,
  dependencies = {}
) {
  const sessions = dependencies.sessions || new Map();
  const request = dependencies.fetch || fetch;
  const sign = dependencies.sign || signRequest;
  const now = dependencies.now || Date.now;
  const environment = env.WORLD_ID_ENVIRONMENT || 'staging';
  const credential = env.WORLD_ID_CREDENTIAL || 'proof_of_human';
  const bypassEnabled =
    env.WORLD_ALLOW_TEST_BYPASS === 'true' &&
    (env.NODE_ENV !== 'production' || env.WORLD_ALLOW_HOSTED_TEST_BYPASS === 'true') &&
    ['staging', 'sandbox'].includes(environment);
  const prune = () => {
    for (const [id, s] of sessions) if (s.expires <= now()) sessions.delete(id);
  };

  function start(body) {
    const binding = refundBinding(body);
    if (
      !/^app_[\w-]+$/.test(env.WORLD_APP_ID || '') ||
      !/^rp_[\w-]+$/.test(env.WORLD_RP_ID || '') ||
      !/^(0x)?[a-fA-F0-9]{64}$/.test(env.WORLD_RP_SIGNING_KEY || '') ||
      !['proof_of_human', 'selfie'].includes(credential) ||
      !['staging', 'production', 'sandbox'].includes(environment) ||
      !(
        /^https:\/\//.test(env.WORLD_PUBLIC_BASE_URL || '') ||
        (env.WORLD_ALLOW_LOCAL_HTTP === 'true' &&
          env.NODE_ENV !== 'production' &&
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(
            env.WORLD_PUBLIC_BASE_URL || '',
          ))
      )
    ) {
      throw Error(
        'IDKit is not configured. Refunds above ¥1,000 require a human check.',
      );
    }
    prune();
    if (sessions.size >= 1000)
      throw Error('Too many verification requests. Try again shortly.');
    const id = random();
    // Each refund attempt is a one-time action, not a reusable account identity.
    const action =
      'refund-' +
      createHash('sha256')
        .update(binding + id)
        .digest('hex');
    const signed = sign({
      signingKeyHex: env.WORLD_RP_SIGNING_KEY,
      action,
      ttl: 300,
    });
    const config = {
      app_id: env.WORLD_APP_ID,
      action,
      environment,
      allow_legacy_proofs: false,
      action_description: 'Human check for a UnSui refund above ¥1,000',
      require_user_presence: false,
      rp_context: {
        rp_id: env.WORLD_RP_ID,
        nonce: signed.nonce,
        created_at: signed.createdAt,
        expires_at: signed.expiresAt,
        signature: signed.sig,
      },
    };
    sessions.set(id, {
      binding,
      config,
      expires: Math.min(now() + 300000, signed.expiresAt * 1000),
      status: 'pending',
    });
    return {
      verificationId: id,
      url: new URL('/world/verify#' + id, env.WORLD_PUBLIC_BASE_URL).href,
      environment,
    };
  }

  function getRequest(id) {
    prune();
    const s = sessions.get(id);
    if (!s || s.status !== 'pending')
      throw Error('Human check expired or already completed.');
    return { config: s.config, signal: s.binding, credential, bypassEnabled };
  }

  async function complete(
    id,
    proof
  ) {
    prune();
    const s = sessions.get(id);
    if (!s || s.status !== 'pending')
      throw Error('Human check expired or already completed.');
    s.status = 'verifying';
    try {
      const item = proof?.responses?.[0];
      if (
        proof?.protocol_version !== '4.0' ||
        proof.nonce !== s.config.rp_context.nonce ||
        proof.action !== s.config.action ||
        proof.environment !== environment ||
        proof.responses.length !== 1 ||
        item.identifier !== credential ||
        item.issuer_schema_id !== (credential === 'selfie' ? 11 : 1) ||
        item.signal_hash !== hashSignal(s.binding) ||
        (credential === 'selfie' &&
          (proof.integrity_bundle?.version !== 2 ||
            !Number.isFinite(item.sybil_score))) ||
        !/^0x[0-9a-fA-F]{1,64}$/.test(item.nullifier || '')
      )
        throw Error('Unexpected human-check proof.');
      const response = await request(
        'https://developer.world.org/api/v4/verify/' + env.WORLD_RP_ID,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proof),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) throw Error('World ID rejected this proof.');
      const verified = await response.json();
      const accepted = verified.results?.find(
        result => result.identifier === credential && result.success === true,
      );
      if (
        verified.success !== true ||
        verified.environment !== environment ||
        !accepted ||
        !/^0x[0-9a-fA-F]{1,64}$/.test(accepted.nullifier || '') ||
        BigInt(accepted.nullifier) !== BigInt(item.nullifier) ||
        s.expires <= now() ||
        sessions.get(id) !== s
      )
        throw Error('Human check did not verify.');
      // Nullifier is retained against this single-use action until it expires.
      // Expired/restarted actions cannot be reconstructed or submitted again.
      s.nullifier = BigInt(item.nullifier).toString();
      s.status = 'verified';
      return { ok: true };
    } catch {
      s.status = 'denied';
      throw Error('Human check was not completed. No payout was authorized.');
    }
  }

  function bypass(id) {
    prune();
    const s = sessions.get(id);
    if (!bypassEnabled || !s || s.status !== 'pending')
      throw Error('Test bypass unavailable.');
    s.status = 'bypassed';
    return { ok: true, status: 'bypassed' };
  }

  function status(id) {
    prune();
    return { status: sessions.get(id)?.status || 'expired' };
  }

  function cancel(id) {
    sessions.delete(id);
  }

  function allows(body) {
    if (
      Number.isSafeInteger(body.amountJpy) &&
      body.amountJpy > 0 &&
      body.amountJpy <= 1000
    )
      return true;
    prune();
    const s = sessions.get(body.worldVerificationId);
    try {
      if (
        !s ||
        !(
          s.status === 'verified' ||
          (bypassEnabled && s.status === 'bypassed')
        ) ||
        s.binding !== refundBinding(body)
      )
        return false;
      s.status = 'used';
      return true;
    } catch {
      return false;
    }
  }
  return { start, getRequest, complete, status, cancel, allows, bypass };
}

module.exports = { createWorldId, refundBinding };
