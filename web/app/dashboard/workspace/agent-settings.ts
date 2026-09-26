import {
  validatePatch,
  normalizeItems,
  reorderItems,
  tablePages,
} from '../../../../shared/dashboard-settings.mjs';
import { treasuryCardDefaults } from './treasury';
import { cardDefaults } from './overview';
import { columnDefaults } from './orders';
import { defaultLayout, readSaved, type SettingItem } from './preferences';

const tableFields = [
  'columns',
  'view',
  'density',
  'pagesize',
  'sort',
  'statuses',
  'assets',
  'min',
  'max',
];
const keys = [
  'unsui-page',
  'unsui-layout',
  'unsui-overview-cards',
  'unsui-treasury-cards',
  ...['source', 'search', 'from', 'to'].map((x) => 'unsui-filter-' + x),
  ...tablePages.flatMap((page) =>
    tableFields.map((field) => `unsui-table-${page}-${field}`),
  ),
];
export function settingsContext() {
  return Object.fromEntries(keys.map((key) => [key, readSaved(key, null)]));
}
export function applyDashboardPatch(input: unknown) {
  const patch = validatePatch(input) as any;
  const changes: Record<string, unknown> = {};
  if (patch.page) changes['unsui-page'] = patch.page;
  if (patch.layout)
    changes['unsui-layout'] = {
      ...readSaved('unsui-layout', defaultLayout),
      ...patch.layout,
    };
  if (patch.filters) {
    const filters = Object.fromEntries(
      ['source', 'search', 'from', 'to'].map((k) => [
        k,
        readSaved('unsui-filter-' + k, ''),
      ]),
    );
    const next = { ...filters, ...patch.filters };
    if (next.from && next.to && next.from > next.to)
      throw Error('The start date would be after the end date.');
    Object.entries(patch.filters).forEach(
      ([key, value]) => (changes['unsui-filter-' + key] = value),
    );
  }
  if (patch.cardOrder || patch.hiddenCards || patch.wideCards) {
    let cards = normalizeItems(
      readSaved('unsui-overview-cards', cardDefaults),
      cardDefaults,
    );
    cards = reorderItems(cards, patch.cardOrder).map((card: any) => ({
      ...card,
      enabled: patch.hiddenCards
        ? !patch.hiddenCards.includes(card.id)
        : card.enabled,
      wide: patch.wideCards ? patch.wideCards.includes(card.id) : card.wide,
    }));
    changes['unsui-overview-cards'] = cards;
  }
  if (patch.treasuryCards) {
    const t = patch.treasuryCards;
    const cards = normalizeItems(
      readSaved('unsui-treasury-cards', treasuryCardDefaults),
      treasuryCardDefaults,
    );
    changes['unsui-treasury-cards'] = reorderItems(cards, t.order).map(
      (card: SettingItem) => ({
        ...card,
        enabled: t.hidden ? !t.hidden.includes(card.id) : card.enabled,
        wide: t.wide ? t.wide.includes(card.id) : card.wide,
      }),
    );
  }
  if (patch.table) {
    const t = patch.table,
      prefix = `unsui-table-${t.page}-`;
    const min = t.min ?? Number(readSaved(prefix + 'min', '0'));
    const max = t.max ?? Number(readSaved(prefix + 'max', '') || 100000000);
    if (min > max)
      throw Error('The purchase minimum would exceed the maximum.');
    if (t.columnOrder || t.hiddenColumns) {
      const columns = normalizeItems(
        readSaved(
          prefix + 'columns',
          readSaved('unsui-table-columns', columnDefaults),
        ),
        columnDefaults,
      );
      changes[prefix + 'columns'] = reorderItems(columns, t.columnOrder).map(
        (c: any) => ({
          ...c,
          enabled: t.hiddenColumns
            ? !t.hiddenColumns.includes(c.id)
            : c.enabled,
        }),
      );
    }
    const mapping: Record<string, string> = {
      hiddenAssets: 'assets',
      hiddenStatuses: 'statuses',
      min: 'min',
      max: 'max',
      sort: 'sort',
      mode: 'view',
      density: 'density',
      size: 'pagesize',
    };
    Object.entries(mapping).forEach(([key, field]) => {
      if (t[key] !== undefined)
        changes[prefix + field] = ['min', 'max'].includes(key)
          ? String(t[key])
          : t[key];
    });
  }
  const before = Object.fromEntries(
    Object.keys(changes).map((key) => [key, localStorage.getItem(key)]),
  );
  const restore = () => {
    Object.entries(before).forEach(([key, value]) =>
      value === null
        ? localStorage.removeItem(key)
        : localStorage.setItem(key, value),
    );
    window.dispatchEvent(new Event('unsui-preferences'));
  };
  try {
    Object.entries(changes).forEach(([key, value]) =>
      localStorage.setItem(key, JSON.stringify(value)),
    );
  } catch {
    restore();
    throw Error('Could not save settings in this browser.');
  }
  window.dispatchEvent(new Event('unsui-preferences'));
  return {
    count: Object.keys(changes).length,
    undo: () => {
      if (
        Object.entries(changes).some(
          ([key, value]) => localStorage.getItem(key) !== JSON.stringify(value),
        )
      )
        throw Error(
          'These settings changed again. Ask the assistant for a new adjustment instead.',
        );
      restore();
    },
  };
}
