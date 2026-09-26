import {
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
  useMemo,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Eye,
  EyeOff,
  X,
  Maximize2,
  Minimize2,
  Settings2,
} from 'lucide-react';
export function readSaved<T>(key: string, initial: T): T {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved === null) return initial;
    if (initial && typeof initial === 'object' && !Array.isArray(initial))
      return { ...initial, ...saved };
    return saved;
  } catch {
    return initial;
  }
}
export function writeSaved(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event('unsui-preferences'));
}
export function useSaved<T>(key: string, initial: T) {
  const fallback = JSON.stringify(initial);
  const raw = useSyncExternalStore(
    (listener) => {
      window.addEventListener('unsui-preferences', listener);
      window.addEventListener('storage', listener);
      return () => {
        window.removeEventListener('unsui-preferences', listener);
        window.removeEventListener('storage', listener);
      };
    },
    () => {
      try {
        return localStorage.getItem(key) || fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  const value = useMemo<T>(() => {
    try {
      const parsed = JSON.parse(raw);
      return initial && typeof initial === 'object' && !Array.isArray(initial)
        ? { ...initial, ...parsed }
        : (parsed ?? initial);
    } catch {
      return initial;
    }
  }, [raw, fallback]);
  const setValue = (next: SetStateAction<T>) =>
    writeSaved(
      key,
      typeof next === 'function'
        ? (next as (old: T) => T)(readSaved(key, initial))
        : next,
    );
  return [value, setValue] as const;
}
// Share one lock across nested dialogs and expanded tables.
let scrollLocks = 0;
let restoreScroll: () => void = () => {};
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (scrollLocks++ === 0) {
      const elements = [document.documentElement, document.body];
      const previous = elements.map((element) => ({
        value: element.style.getPropertyValue('overflow'),
        priority: element.style.getPropertyPriority('overflow'),
      }));
      elements.forEach((element) =>
        element.style.setProperty('overflow', 'hidden'),
      );
      restoreScroll = () =>
        elements.forEach((element, index) => {
          const old = previous[index];
          if (old.value)
            element.style.setProperty('overflow', old.value, old.priority);
          else element.style.removeProperty('overflow');
        });
    }
    return () => {
      if (--scrollLocks === 0) restoreScroll();
    };
  }, [active]);
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useScrollLock(true);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      className="preferences-dialog"
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="section-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label={'Close ' + title}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export type SettingItem = {
  id: string;
  label: string;
  enabled: boolean;
  wide?: boolean;
};
function SortableSetting({
  item,
  toggle,
  disabled,
  onSize,
}: {
  item: SettingItem;
  toggle: () => void;
  disabled: boolean;
  onSize?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: item.id,
    });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="setting-row"
    >
      <button
        className="drag-handle"
        {...attributes}
        {...listeners}
        aria-label={'Reorder ' + item.label}
      >
        <GripVertical size={16} />
        <span>{item.label}</span>
      </button>
      {onSize && (
        <button className="text-button" onClick={onSize}>
          {item.wide ? 'Wide' : 'Small'}
        </button>
      )}
      <button
        className="icon-button"
        onClick={toggle}
        disabled={disabled}
        aria-label={(item.enabled ? 'Hide ' : 'Show ') + item.label}
        aria-pressed={item.enabled}
      >
        {item.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
}
export function ReorderSettings({
  items,
  onChange,
  onReset,
  resize = false,
  compact = false,
}: {
  items: SettingItem[];
  onChange: (v: SettingItem[]) => void;
  onReset: () => void;
  resize?: boolean;
  compact?: boolean;
}) {
  const [search, setSearch] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  return (
    <>
      <input
        className="settings-search"
        aria-label={compact ? 'Search columns' : 'Search settings'}
        placeholder={compact ? 'Search columns…' : 'Find a card or column…'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {!compact && (
        <p className="subtle">
          Drag to reorder, or focus a handle and press Space, arrow keys, then
          Space.
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over && active.id !== over.id)
            onChange(
              arrayMove(
                items,
                items.findIndex((x) => x.id === active.id),
                items.findIndex((x) => x.id === over.id),
              ),
            );
        }}
      >
        <SortableContext
          items={items.map((x) => x.id)}
          strategy={verticalListSortingStrategy}
        >
          {items
            .filter((x) => x.label.toLowerCase().includes(search.toLowerCase()))
            .map((item) => (
              <SortableSetting
                key={item.id}
                item={item}
                toggle={() =>
                  onChange(
                    items.map((x) =>
                      x.id === item.id ? { ...x, enabled: !x.enabled } : x,
                    ),
                  )
                }
                disabled={
                  item.enabled && items.filter((x) => x.enabled).length === 1
                }
                onSize={
                  resize
                    ? () =>
                        onChange(
                          items.map((x) =>
                            x.id === item.id ? { ...x, wide: !x.wide } : x,
                          ),
                        )
                    : undefined
                }
              />
            ))}
        </SortableContext>
      </DndContext>
      <button className="secondary" onClick={onReset}>
        Reset to defaults
      </button>
    </>
  );
}
export const defaultLayout = {
  header: 'sticky',
  sidebar: 'sticky',
  compact: false,
  fontSize: 'standard',
  showDescription: true,
  showCardDetails: true,
  contentWidth: 'full',
};
export function LayoutSettings({
  value,
  onChange,
}: {
  value: typeof defaultLayout;
  onChange: (v: typeof defaultLayout) => void;
}) {
  const [open, setOpen] = useState(false),
    [full, setFull] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const fn = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);
  return (
    <>
      <button
        className="icon-button"
        aria-label="Layout preferences"
        onClick={() => setOpen(true)}
      >
        <Settings2 size={18} />
      </button>
      <button
        className="icon-button"
        aria-label={full ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={async () => {
          try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await document.documentElement.requestFullscreen();
          } catch {
            setError(
              'Browser fullscreen is unavailable. Use the browser fullscreen command.',
            );
            setOpen(true);
          }
        }}
      >
        {full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>
      {open && (
        <Modal title="Layout preferences" onClose={() => setOpen(false)}>
          <p className="subtle">Your layout is saved on this browser.</p>
          {(['header', 'sidebar'] as const).map((key) => (
            <label className="layout-field" key={key}>
              {key === 'header' ? 'Header behavior' : 'Sidebar behavior'}
              <select
                aria-label={
                  key === 'header' ? 'Header behavior' : 'Sidebar behavior'
                }
                value={value[key]}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              >
                <option value="sticky">Sticky</option>
                <option value="floating">Floating</option>
                <option value="static">Scroll with page</option>
              </select>
            </label>
          ))}
          <label className="layout-field">
            Text size
            <select
              aria-label="Text size"
              value={value.fontSize || 'standard'}
              onChange={(e) => onChange({ ...value, fontSize: e.target.value })}
            >
              <option value="standard">Standard</option>
              <option value="large">Large · 115%</option>
              <option value="extra-large">Extra large · 130%</option>
            </select>
          </label>
          <label className="layout-field">
            Compact sidebar
            <input
              type="checkbox"
              checked={value.compact}
              onChange={(e) =>
                onChange({ ...value, compact: e.target.checked })
              }
            />
          </label>
          {(['showDescription', 'showCardDetails'] as const).map((key) => (
            <label className="layout-field" key={key}>
              {key === 'showDescription'
                ? 'Show page description'
                : 'Show card details'}
              <input
                type="checkbox"
                checked={value[key]}
                onChange={(e) =>
                  onChange({ ...value, [key]: e.target.checked })
                }
              />
            </label>
          ))}
          <label className="layout-field">
            Content width
            <select
              value={value.contentWidth}
              onChange={(e) =>
                onChange({ ...value, contentWidth: e.target.value })
              }
            >
              <option value="full">Full width</option>
              <option value="focused">Focused</option>
            </select>
          </label>
          <button className="secondary" onClick={() => onChange(defaultLayout)}>
            Reset layout
          </button>
          {error && <p role="alert">{error}</p>}
        </Modal>
      )}
    </>
  );
}
export function ExpandablePanel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className={'card expandable-panel ' + className}>
      <div className="panel-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label={'Expand ' + title}
          onClick={() => setExpanded(true)}
        >
          <Maximize2 size={15} />
        </button>
      </div>
      {children}
      {expanded && (
        <Modal title={title} onClose={() => setExpanded(false)}>
          <div className="expanded-chart">{children}</div>
        </Modal>
      )}
    </section>
  );
}
