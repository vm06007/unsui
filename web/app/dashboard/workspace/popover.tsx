import {
    useState,
    useRef,
    useEffect,
    useLayoutEffect,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function ToolbarPopover({
    label,
    title,
    triggerContent,
    children,
    className = '',
    width = 330,
}: {
    label: string;
    title: string;
    triggerContent: ReactNode;
    children: ReactNode;
    className?: string;
    width?: number;
}) {
    const [open, setOpen] = useState(false),
        [position, setPosition] = useState<CSSProperties>({});
    const trigger = useRef<HTMLButtonElement>(null),
        menu = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!open) return;
        const update = () => {
            const rect = trigger.current?.getBoundingClientRect();
            if (!rect) return;
            const below = window.innerHeight - rect.bottom - 16,
                above = rect.top - 16,
                useAbove = below < 240 && above > below;
            const popupWidth = Math.min(width, window.innerWidth - 24);
            setPosition({
                width: popupWidth,
                left: Math.max(
                    12,
                    Math.min(
                        rect.right - popupWidth,
                        window.innerWidth - popupWidth - 12,
                    ),
                ),
                ...(useAbove
                    ? { bottom: window.innerHeight - rect.top + 8 }
                    : { top: rect.bottom + 8 }),
                maxHeight: Math.min(480, Math.max(120, useAbove ? above : below)),
            });
        };
        update();
        menu.current
            ?.querySelector<HTMLElement>('input,select,button')
            ?.focus({ preventScroll: true });
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, width]);
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
                className={'secondary ' + className}
                aria-label={label}
                aria-expanded={open}
                aria-haspopup="dialog"
                onClick={() => setOpen(!open)}
            >
                {triggerContent}
            </button>
            {open &&
                createPortal(
                    <div
                        ref={menu}
                        role="dialog"
                        aria-modal="false"
                        aria-label={title}
                        className="column-popover toolbar-popover"
                        style={position}
                    >
                        <header>
                            <div>
                                <strong>{title}</strong>
                                <small>Changes apply immediately</small>
                            </div>
                            <button
                                className="icon-button"
                                aria-label={'Close ' + title}
                                onClick={() => {
                                    setOpen(false);
                                    trigger.current?.focus();
                                }}
                            >
                                <X size={15} />
                            </button>
                        </header>
                        <div className="column-popover-content">{children}</div>
                    </div>,
                    trigger.current?.closest('.ops') ?? document.body,
                )}
        </>
    );
}
