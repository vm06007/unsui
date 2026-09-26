const { createHmac, timingSafeEqual } = require("node:crypto");
const {
  createDemoQuote,
  applyMarketQuote,
  marketAmountMist,
  formatMist,
} = require("./build/refundQuote");

function createMarketQuotes({
  secret,
  fetchPrice = fetch,
  now = Date.now,
  apiKey = process.env.COINGECKO_API_KEY,
} = {}) {
  if (!secret || secret.length < 32)
    throw Error("Market quote signing secret is required");
  let cached;
  let pending;
  function signature(quote) {
    const { signature: ignored, ...pricing } = quote.pricing;
    return createHmac("sha256", secret)
      .update(
        JSON.stringify([
          quote.network,
          quote.recipient.toLowerCase(),
          quote.amountJpy,
          quote.feeJpy,
          quote.netJpy,
          quote.estimatedCrypto,
          pricing.source,
          pricing.jpyPerSuiMicros,
          pricing.priceTimestamp,
          pricing.issuedAt,
          pricing.expiresAt,
          pricing.amountMist,
          pricing.cardId,
          pricing.scannedBalanceJpy,
        ])
      )
      .digest("hex");
  }
  async function rate() {
    if (
      cached &&
      now() - cached.fetchedAt < 30000 &&
      now() - cached.priceTimestamp * 1000 < 180000
    )
      return cached;
    if (pending) return pending;
    pending = (async () => {
      const response = await fetchPrice(
        "https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=jpy&include_last_updated_at=true",
        {
          headers: apiKey ? { "x-cg-demo-api-key": apiKey } : {},
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!response.ok)
        throw Error("Market price unavailable. Please retry shortly.");
      const { sui } = await response.json();
      if (
        !sui ||
        !Number.isFinite(sui.jpy) ||
        sui.jpy <= 0 ||
        sui.jpy > 1000000 ||
        !Number.isSafeInteger(sui.last_updated_at) ||
        now() - sui.last_updated_at * 1000 > 180000 ||
        sui.last_updated_at * 1000 > now() + 10000
      )
        throw Error("Market price is stale or invalid. Please retry.");
      cached = {
        jpyPerSuiMicros: String(Math.round(sui.jpy * 1000000)),
        priceTimestamp: sui.last_updated_at,
        fetchedAt: now(),
      };
      return cached;
    })();
    try {
      return await pending;
    } finally {
      pending = null;
    }
  }
  async function issue(input) {
    if (
      !/^[a-f0-9]{16}$/i.test(input.cardId || "") ||
      !Number.isInteger(input.scannedBalanceJpy) ||
      input.scannedBalanceJpy > 20000
    )
      throw Error("Invalid card quote request");
    const quote = createDemoQuote(
      String(input.amountJpy),
      input.scannedBalanceJpy,
      "sui",
      input.recipient
    );
    const price = await rate();
    const amountMist = marketAmountMist(quote.amountJpy, price.jpyPerSuiMicros);
    quote.estimatedCrypto = formatMist(amountMist);
    const issuedAt = now();
    quote.pricing = {
      source: "coingecko",
      jpyPerSuiMicros: price.jpyPerSuiMicros,
      priceTimestamp: price.priceTimestamp,
      issuedAt,
      expiresAt: issuedAt + 300000,
      amountMist,
      cardId: input.cardId.toLowerCase(),
      scannedBalanceJpy: input.scannedBalanceJpy,
      signature: "",
    };
    quote.pricing.signature = signature(quote);
    return quote;
  }
  function verify(input, { allowExpired = false } = {}) {
    const q = input.quote;
    if (!q?.pricing) throw Error("Request a current SUI market quote first.");
    const canonical = applyMarketQuote(
      createDemoQuote(
        String(q.amountJpy),
        input.scannedBalanceJpy,
        "sui",
        q.recipient
      ),
      q
    );
    if (
      q.network !== "sui" ||
      canonical.estimatedCrypto !== q.estimatedCrypto ||
      canonical.feeJpy !== q.feeJpy ||
      canonical.netJpy !== q.netJpy ||
      q.pricing.cardId !== input.cardId.toLowerCase() ||
      q.pricing.scannedBalanceJpy !== input.scannedBalanceJpy ||
      !timingSafeEqual(
        Buffer.from(signature(q), "hex"),
        Buffer.from(q.pricing.signature, "hex")
      )
    )
      throw Error("Market quote does not match this refund.");
    if (
      !allowExpired &&
      (q.pricing.expiresAt <= now() || q.pricing.issuedAt > now() + 10000)
    )
      throw Error(
        "Quote expired. Refresh the quote and confirm the new amount."
      );
    return q.pricing;
  }
  return { issue, verify };
}
module.exports = { createMarketQuotes };
