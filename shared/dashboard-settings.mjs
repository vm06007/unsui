// The agent and controls share this allowlist. No ledger or wallet actions exist here.
export const pages = ["overview", "orders", "payouts", "reconciliation", "treasury", "connections"];
export const tablePages = ["orders", "payouts", "reconciliation"];
export const cardIds = [
  "purchases",
  "payouts",
  "settlement",
  "issues",
  "activity",
  "buffer",
  "assets",
  "states",
  "settlements",
  "latest",
];
export const treasuryCardIds = ["available", "queued", "payouts", "runway", "forecast", "assumptions", "settlement"];
export const columnIds = [
  "id",
  "date",
  "source",
  "jpy",
  "crypto",
  "asset",
  "payout",
  "recipient",
  "reconciliation",
  "merchantRef",
  "digest",
  "network",
];
const enumField = (values) => ({ type: "string", enum: values });
const list = (values) => ({
  type: "array",
  items: enumField(values),
  uniqueItems: true,
  maxItems: values.length,
});
const object = (properties) => ({ type: "object", properties, additionalProperties: false });
export const patchSchema = object({
  page: enumField(pages),
  layout: object({
    header: enumField(["sticky", "floating", "static"]),
    sidebar: enumField(["sticky", "floating", "static"]),
    compact: { type: "boolean" },
    fontSize: enumField(["standard", "large", "extra-large"]),
    showDescription: { type: "boolean" },
    showCardDetails: { type: "boolean" },
    contentWidth: enumField(["full", "focused"]),
  }),
  treasuryCards: object({ order: list(treasuryCardIds), hidden: list(treasuryCardIds), wide: list(treasuryCardIds) }),
  cardOrder: list(cardIds),
  hiddenCards: list(cardIds),
  wideCards: list(cardIds),
  filters: object({
    source: enumField(["all", "sandbox", "in-app"]),
    search: { type: "string", maxLength: 200 },
    from: { type: "string", format: "date-or-empty" },
    to: { type: "string", format: "date-or-empty" },
  }),
  table: object({
    page: enumField(tablePages),
    columnOrder: list(columnIds),
    hiddenColumns: list(columnIds),
    hiddenAssets: list(["SUI", "ETH", "MJPY", "MIZU"]),
    hiddenStatuses: list(["confirmed", "queued", "matched", "pending", "mismatch", "unmatched"]),
    min: { type: "number", minimum: 0, maximum: 100000000 },
    max: { type: "number", minimum: 0, maximum: 100000000 },
    sort: object({ key: enumField(columnIds), dir: enumField(["asc", "desc"]) }),
    mode: enumField(["table", "cards", "timeline"]),
    density: enumField(["comfortable", "compact"]),
    size: { type: "integer", enum: [10, 25, 50] },
  }),
});
function validate(value, schema, path) {
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error(`Invalid ${path}`);
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(schema.properties, key))
        throw Error(`Unsupported setting: ${path}.${key}`);
      validate(value[key], schema.properties[key], `${path}.${key}`);
    }
  } else if (schema.type === "array") {
    if (
      !Array.isArray(value) ||
      value.length > schema.maxItems ||
      new Set(value).size !== value.length
    )
      throw Error(`Invalid ${path}`);
    value.forEach((item) => validate(item, schema.items, path));
  } else {
    if (typeof value !== (schema.type === "integer" ? "number" : schema.type))
      throw Error(`Invalid ${path}`);
    if (schema.enum && !schema.enum.includes(value)) throw Error(`Invalid ${path}`);
    if (
      typeof value === "number" &&
      (!Number.isFinite(value) ||
        value < (schema.minimum ?? 0) ||
        value > (schema.maximum ?? 100000000))
    )
      throw Error(`Invalid ${path}`);
    if (schema.maxLength && value.length > schema.maxLength) throw Error(`Too long: ${path}`);
    if (
      schema.format &&
      value !== "" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      throw Error(`Invalid date: ${path}`);
  }
}
export function validatePatch(value) {
  validate(value, patchSchema, "settings");
  if (
    value.hiddenCards?.length === cardIds.length ||
    value.treasuryCards?.hidden?.length === treasuryCardIds.length ||
    value.table?.hiddenColumns?.length === columnIds.length
  )
    throw Error("Keep at least one card and column visible.");
  if (value.table && !tablePages.includes(value.table.page)) throw Error("Choose a table page.");
  if (value.table?.sort && (!value.table.sort.key || !value.table.sort.dir))
    throw Error("Specify sort field and direction.");
  if (
    value.table?.min !== undefined &&
    value.table?.max !== undefined &&
    value.table.min > value.table.max
  )
    throw Error("Minimum exceeds maximum.");
  if (value.filters?.from && value.filters?.to && value.filters.from > value.filters.to)
    throw Error("Start date exceeds end date.");
  return value;
}
export function normalizeItems(stored, defaults) {
  if (!Array.isArray(stored)) return defaults;
  const seen = new Set();
  const result = [];
  for (const item of stored) {
    const base = defaults.find((d) => d.id === item?.id);
    if (!base || seen.has(base.id)) continue;
    seen.add(base.id);
    result.push({
      ...base,
      enabled: typeof item.enabled === "boolean" ? item.enabled : base.enabled,
      ...(typeof item.wide === "boolean" ? { wide: item.wide } : {}),
    });
  }
  result.push(...defaults.filter((d) => !seen.has(d.id)));
  return result.some((x) => x.enabled) ? result : defaults;
}
export function reorderItems(items, order) {
  return order
    ? [
        ...order.map((id) => items.find((x) => x.id === id)).filter(Boolean),
        ...items.filter((x) => !order.includes(x.id)),
      ]
    : items;
}
