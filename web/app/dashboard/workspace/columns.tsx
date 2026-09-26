import {
    useState,
    useRef,
    useEffect,
    useLayoutEffect,
    type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { Settings2, X } from 'lucide-react';
import { ReorderSettings, type SettingItem } from './preferences';

export function ColumnSettings({
    columns,
    onChange,
    onReset,
}: {
    columns: SettingItem[];
    onChange: (items: SettingItem[]) => void;
    onReset: () => void;
}) {
    const [open, setOpen] = useState(false),
        [position, setPosition] = useState<CSSProperties>({});
    const trigger = useRef<HTMLButtonElement>(null),
        menu = useRef<HTMLDivElement>(null);
    const count = columns.filter((c) => c.enabled).length;
    useLayoutEffect(() => {
        if (!open) return;
        const update = () => {
            const rect = trigger.current?.getBoundingClientRect();
            if (!rect) return;
            const below = window.innerHeight - rect.bottom - 16,
                above = rect.top - 16,
                useAbove = below < 240 && above > below;
            const width = Math.min(310, window.innerWidth - 24);
            setPosition({
                width,
                left: Math.max(
                    12,
                    Math.min(rect.right - width, window.innerWidth - width - 12),
                ),
                ...(useAbove
                    ? { bottom: window.innerHeight - rect.top + 8 }
                    : { top: rect.bottom + 8 }),
                maxHeight: Math.min(480, Math.max(120, useAbove ? above : below)),
            });
        };
        update();
        menu.current?.querySelector('input')?.focus({ preventScroll: true });
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open]);
    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => {
            if (
                !menu.current?.contains(event.target as Node) &&
                !trigger.current?.contains(event.target as Node)
            )
                setOpen(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                setOpen(false);
                trigger.current?.focus({ preventScroll: true });
            }
        };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape, true);
        return () => {
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('keydown', escape, true);
        };
    }, [open]);
    return (
        <>
            <button
                ref={trigger}
                className="secondary columns-trigger"
                aria-label="Column settings"
                aria-expanded={open}
                aria-haspopup="dialog"
                onClick={() => setOpen(!open)}
            >
                <Settings2 size={15} />
                Columns{' '}
                <small>
                    {count}/{columns.length}
                </small>
            </button>
            {open &&
                createPortal(
                    <div
                        ref={menu}
                        role="dialog"
                        aria-modal="false"
                        aria-label="Order columns"
                        className="column-popover"
                        style={position}
                    >
                        <header>
                            <div>
                                <strong>Columns</strong>
                                <small>
                                    Drag to reorder · changes apply immediately
                                </small>
                            </div>
                            <button
                                className="icon-button"
                                aria-label="Close column settings"
                                onClick={() => {
                                    setOpen(false);
                                    trigger.current?.focus();
                                }}
                            >
                                <X size={15} />
                            </button>
                        </header>
                        <div className="column-popover-content">
                            <ReorderSettings
                                compact
                                items={columns}
                                onChange={onChange}
                                onReset={onReset}
                            />
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
