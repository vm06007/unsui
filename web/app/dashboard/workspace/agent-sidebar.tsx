import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  LoaderCircle,
  Trash2,
  Maximize2,
} from 'lucide-react';
import { applyDashboardPatch, settingsContext } from './agent-settings';
import { promptsForPage } from './agent-prompts';

type Message = { role: 'user' | 'assistant'; content: string };
export function AgentSidebar({
  page,
  open,
  onClose,
  width,
  onResize,
}: {
  page: string;
  open: boolean;
  onClose: () => void;
  width: number;
  onResize: (width: number) => void;
}) {
  const prompts = promptsForPage(page);
  const drag = useRef<null | { x: number; width: number }>(null);
  const resize = (value: number) =>
    onResize(Math.max(320, Math.min(680, Math.round(value))));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [undo, setUndo] = useState<null | { run: () => void; count: number }>(
    null,
  );
  const controller = useRef<AbortController | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    textarea.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open]);
  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, busy, open]);
  useEffect(() => {
    if (!open) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open, onClose]);
  async function send(prompt: string) {
    if (busy || !prompt.trim()) return;
    const context = settingsContext();
    setInput('');
    setError('');
    setBusy(true);
    setMessages((old) => [...old, { role: 'user', content: prompt }]);
    const ac = new AbortController();
    controller.current = ac;
    const timer = setTimeout(() => ac.abort(), 65000);
    try {
      const res = await fetch('/api/operations/agent', {
        method: 'POST',
        signal: ac.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Bearer ' + (sessionStorage.getItem('unsui-ops-token') || ''),
        },
        body: JSON.stringify({
          message: prompt,
          history: messages.slice(-8),
          context: { ...context, currentPage: page },
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        reply: string;
        patch?: unknown;
      };
      if (!res.ok) throw Error(data.error || 'Assistant unavailable.');
      let reply = data.reply;
      if (data.patch) {
        if (JSON.stringify(settingsContext()) !== JSON.stringify(context))
          throw Error(
            'Your settings changed while the assistant was thinking. Send the request again to apply it to the latest layout.',
          );
        const result = applyDashboardPatch(data.patch);
        setUndo({ run: result.undo, count: result.count });
        reply = result.count
          ? `Updated ${result.count} preference${result.count === 1 ? '' : 's'}. Your dashboard is ready—use Undo to restore the previous settings.`
          : 'No settings needed changing.';
      }
      setMessages((old) => [...old, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.name === 'AbortError'
            ? 'Request stopped. No new settings were applied.'
            : e.message
          : 'Unable to reach the assistant.',
      );
      setInput(prompt);
    } finally {
      clearTimeout(timer);
      setBusy(false);
      controller.current = null;
    }
  }
  return (
    <aside
      id="dashboard-agent"
      className="dashboard-agent"
      aria-label="Dashboard assistant"
      data-open={open}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        className="agent-resize"
        role="separator"
        aria-label="Resize assistant"
        aria-orientation="vertical"
        aria-valuemin={320}
        aria-valuemax={680}
        aria-valuenow={width}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            resize(width + (e.key === 'ArrowLeft' ? 20 : -20));
          }
        }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, width };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current)
            resize(drag.current.width + drag.current.x - e.clientX);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />
      <header>
        <div>
          <Sparkles size={18} />
          <strong>Workspace assistant</strong>
        </div>
        <button
          className="icon-button"
          aria-label="Toggle assistant width"
          onClick={() => resize(width > 400 ? 380 : 600)}
        >
          <Maximize2 size={16} />
        </button>
        <button
          className="icon-button"
          aria-label="Close assistant"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <p className="agent-caption">Arrange your workspace in your own words.</p>
      <div className="agent-conversation" role="log" aria-live="polite">
        {!messages.length && (
          <div className="agent-welcome">
            <h2>Make this dashboard yours.</h2>
            <p>
              Choose a prompt or describe the view you need. Changes appear
              immediately.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={'agent-message ' + m.role}>
            <small>{m.role === 'user' ? 'You' : 'UnSui'}</small>
            <p>{m.content}</p>
          </div>
        ))}
        {busy && (
          <p className="agent-thinking">
            <LoaderCircle className="spin" size={16} /> Thinking through your
            changes…
          </p>
        )}
        <div ref={end} />
      </div>
      {undo && (
        <button
          className="secondary agent-undo"
          onClick={() => {
            try {
              undo.run();
              setUndo(null);
              setMessages((old) => [
                ...old,
                {
                  role: 'assistant',
                  content: 'Restored your previous settings.',
                },
              ]);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <RotateCcw size={15} /> Undo last change
        </button>
      )}
      <div
        className="agent-examples"
        aria-label={`${prompts.label} example prompts`}
      >
        {prompts.examples.map((prompt) => (
          <button key={prompt} disabled={busy} onClick={() => send(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      {error && (
        <p className="agent-error" role="alert">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label className="agent-input-label" htmlFor="agent-prompt">
          Ask your assistant
        </label>
        <textarea
          ref={textarea}
          id="agent-prompt"
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          placeholder={prompts.placeholder}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <div className="agent-composer-actions">
          <button
            type="button"
            className="icon-button"
            disabled={busy}
            aria-label="Clear conversation"
            onClick={() => {
              setMessages([]);
              setError('');
            }}
          >
            <Trash2 size={16} />
          </button>
          <small>OpenRouter · Free models</small>
          {busy ? (
            <button
              type="button"
              className="secondary"
              onClick={() => controller.current?.abort()}
            >
              Stop
            </button>
          ) : (
            <button className="primary" disabled={!input.trim()}>
              <Send size={15} /> Send
            </button>
          )}
        </div>
      </form>
      <small className="agent-footnote">
        Messages and layout preferences go to OpenRouter. Order records and
        wallet keys are not sent.
      </small>
    </aside>
  );
}
