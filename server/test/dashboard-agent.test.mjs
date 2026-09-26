import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validatePatch,
  normalizeItems,
  cardIds,
  columnIds,
} from "../../shared/dashboard-settings.mjs";
import agent from "../dashboard-agent.cjs";

test("accepts a multi-part display change", () => {
  const patch = {
    page: "orders",
    filters: { source: "in-app" },
    table: {
      page: "orders",
      columnOrder: ["recipient", "digest"],
      hiddenColumns: [],
      hiddenAssets: ["ETH", "MJPY", "MIZU"],
      sort: { key: "jpy", dir: "desc" },
    },
  };
  assert.deepEqual(validatePatch(patch), patch);
});
test("rejects actions outside display preferences and malformed settings", () => {
  for (const patch of [
    { transfer: { amount: 1 } },
    { layout: { __proto__: null, payout: true } },
    { table: { page: "orders", columnOrder: ["recipient", "recipient"] } },
    { table: { page: "orders", size: 0 } },
    { hiddenCards: cardIds },
    { table: { page: "orders", hiddenColumns: columnIds } },
    { filters: { from: "2026-02-30" } },
    { table: { page: "orders", min: 100, max: 10 } },
    { table: { sort: { key: "date", dir: "desc" } } },
  ])
    assert.throws(() => validatePatch(patch));
});
test("saved layouts retain order and incorporate newly introduced fields", () => {
  const defaults = [
    { id: "a", enabled: true },
    { id: "b", enabled: true },
    { id: "c", enabled: false },
  ];
  assert.deepEqual(
    normalizeItems(
      [
        { id: "b", enabled: false },
        { id: "a", enabled: true },
        { id: "b", enabled: true },
        { id: "removed" },
      ],
      defaults,
    ),
    [
      { id: "b", enabled: false },
      { id: "a", enabled: true },
      { id: "c", enabled: false },
    ],
  );
  assert.deepEqual(
    normalizeItems(
      defaults.map((x) => ({ ...x, enabled: false })),
      defaults,
    ),
    defaults,
  );
});
test("uses free router and returns validated tool patch", async () => {
  const chat = agent.createDashboardAgent({
    apiKey: "test-only",
    request: async (url, options) => {
      assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
      const body = JSON.parse(options.body);
      assert.equal(body.model, "openrouter/free");
      assert.equal(body.tools.length, 1);
      return Response.json({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    name: "update_dashboard",
                    arguments: JSON.stringify({ page: "overview", cardOrder: ["payouts"] }),
                  },
                },
              ],
            },
          },
        ],
      });
    },
  });
  assert.deepEqual((await chat({ message: "Put payouts first" })).patch, {
    page: "overview",
    cardOrder: ["payouts"],
  });
});
test("unknown tool calls cannot execute", async () => {
  const chat = agent.createDashboardAgent({
    apiKey: "test-only",
    request: async () =>
      Response.json({
        choices: [
          { message: { tool_calls: [{ function: { name: "send_funds", arguments: "{}" } }] } },
        ],
      }),
  });
  await assert.rejects(chat({ message: "test" }), /Unsupported/);
});
test("rate limits and missing key are clear errors without fallback actions", async () => {
  await assert.rejects(
    agent.createDashboardAgent({ apiKey: "" })({ message: "test" }),
    /OPENROUTER_API_KEY/,
  );
  await assert.rejects(
    agent.createDashboardAgent({
      apiKey: "test-only",
      request: async () => new Response("", { status: 429 }),
    })({ message: "test" }),
    /rate-limited/,
  );
});

test("assistant endpoint requires the operations session and blocks extension access", async (t) => {
  const { createServer } = await import("../server.cjs");
  let calls = 0;
  const server = createServer({
    dashboardAgent: async () => {
      calls++;
      return { reply: "Updated", patch: { page: "orders" } };
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  assert.equal((await post("/operations/agent", { message: "Show orders" })).status, 401);
  assert.equal(
    (
      await post(
        "/operations/agent",
        { message: "Show orders" },
        { Origin: "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      )
    ).status,
    403,
  );
  assert.equal(calls, 0);
  const session = await (
    await post("/auth/password", { email: "vitalik@bitcoin.com", password: "ethglobal2026" })
  ).json();
  const response = await post(
    "/operations/agent",
    { message: "Show orders" },
    { Authorization: "Bearer " + session.token },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).patch.page, "orders");
  assert.equal(calls, 1);
});

test("invalid requests fail before calling the inference provider", async () => {
  let called = false;
  const chat = agent.createDashboardAgent({ apiKey: "test", request: async () => { called = true; throw Error("Unexpected provider call"); } });
  for (const input of [null, {}, { message: "" }, { message: "x".repeat(2001) }]) {
    await assert.rejects(chat(input), /message/);
  }
  assert.equal(called, false);
});

test('treasury layouts support only known cards and keep one visible', () => {
  assert.deepEqual(validatePatch({ treasuryCards: { order: ['forecast', 'available'], hidden: ['settlement'], wide: ['forecast'] } }).treasuryCards.order, ['forecast', 'available']);
  assert.throws(() => validatePatch({ treasuryCards: { order: ['unknown'] } }));
  assert.throws(() => validatePatch({ treasuryCards: { hidden: ['available', 'queued', 'payouts', 'runway', 'forecast', 'assumptions', 'settlement'] } }));
});
