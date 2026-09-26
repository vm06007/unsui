/* Official IDKit browser SDK, served locally from the pinned npm package. */
(async () => {
  const id = location.hash.slice(1);
  history.replaceState(null, '', location.pathname);
  const status = document.getElementById('status');
  const link = document.getElementById('verify');
  const bypass = document.getElementById('bypass');
  const returnApp = document.getElementById('return-app');
  const cancel = document.getElementById('cancel');
  const crossDevice = document.getElementById('cross-device');
  const hideVerification = () => {
    link.hidden = true;
    bypass.hidden = true;
    crossDevice.hidden = true;
    document.getElementById('qr').replaceChildren();
  };
  let cancelled = false;
  const post = async (
    path,
    body = {}
  ) => {
    const response = await fetch('/world/public/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationId: id, ...body }),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'Unable to verify.');
    return data;
  };
  cancel.onclick = () => {
    cancelled = true;
    hideVerification();
    cancel.hidden = true;
    returnApp.hidden = false;
    status.textContent =
      'Check cancelled. Return to UnSui. No payout was authorized.';
    post('cancel').catch(() => {});
  };
  try {
    if (!/^[\w-]{43}$/.test(id))
      throw Error(
        'This check link is missing or expired. Start again in UnSui.',
      );
    const { config, signal, credential, bypassEnabled } = await post('request');
    document.getElementById('environment').textContent = `${
      credential === 'selfie' ? 'Selfie Check' : 'Proof of Human'
    } · ${
      config.environment === 'production'
        ? 'World ID'
        : 'test verification (' + config.environment + ')'
    }`;
    bypass.hidden = !bypassEnabled;
    bypass.onclick = async () => {
      bypass.disabled = true;
      try {
        await post('bypass');
        cancelled = true;
        hideVerification();
        cancel.hidden = true;
        returnApp.hidden = false;
        status.textContent =
          'Check bypassed for testing — not World ID verified. Return to UnSui to continue.';
      } catch (error) {
        status.textContent = error.message;
        bypass.disabled = false;
      }
    };
    const preset =
      credential === 'selfie'
        ? IDKitBundle.selfieCheck({ signal })
        : IDKitBundle.proofOfHuman({ signal });
    const request = await IDKitBundle.request(config).preset(preset);
    if (cancelled) return;
    link.href = request.connectorURI;
    link.hidden = false;
    const qr = qrcode(0, 'M');
    qr.addData(request.connectorURI);
    qr.make();
    document.getElementById('qr').innerHTML = qr.createSvgTag({
      cellSize: 4,
      margin: 16,
      scalable: true,
    });
    crossDevice.hidden = false;
    status.textContent = 'Scan with another phone, or verify on this device.';
    const completion = await request.pollUntilCompletion({ timeout: 300000 });
    if (cancelled) return;
    if (!completion.success)
      throw Error(
        'The check was cancelled, unavailable, or expired. Please return to UnSui and try again.',
      );
    status.textContent = 'Verifying your proof…';
    hideVerification();
    await post('complete', { proof: completion.result });
    if (cancelled) return;
    cancel.hidden = true;
    returnApp.hidden = false;
    status.textContent =
      'Human check complete. Return to UnSui to finish your refund.';
  } catch (error) {
    if (cancelled) return;
    const canSkip = !bypass.hidden;
    hideVerification();
    bypass.hidden = !canSkip;
    status.textContent = error.message;
    if (!canSkip) {
      post('cancel').catch(() => {});
      returnApp.hidden = false;
    }
  }
})();
