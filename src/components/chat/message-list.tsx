import type { ChatMessage } from "@/lib/chat/types";
import { OrderCard } from "./order-card";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  canRetry: boolean;
  onExample: (message: string) => void;
  onOrderAction: (message: string) => void;
  onRetry: () => void;
  endRef: React.RefObject<HTMLDivElement | null>;
}

const exampleQueries = [
  "Busca el pedido 12366 y dime su estado actual.",
  "Consulta el tracking del pedido 12350.",
  "¿Qué pedidos están buscando repartidor?",
];

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AssistantText({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/).filter((block) => block.trim());

  return (
    <div className="space-y-3 text-base leading-7 text-zinc-800">
      {blocks.map((block, index) => (
        <p key={`${index}-${block.slice(0, 24)}`} className="whitespace-pre-wrap">
          {block}
        </p>
      ))}
    </div>
  );
}

function EmptyState({ onExample }: { onExample: (message: string) => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center py-10">
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="size-6"
        >
          <path
            d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6-5.5-1.7L10.3 9 12 3.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-teal-800">
        Picker Copilot
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Operación clara, respuesta rápida.
      </h2>
      <p className="mt-2 max-w-lg text-base leading-7 text-slate-600">
        Consulta pedidos, tracking, intentos de asignación e información de
        comercios con los datos operativos disponibles.
      </p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {exampleQueries.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => onExample(query)}
            className="rounded-lg border border-slate-200 bg-white p-3 text-left text-base leading-6 text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  isLoading,
  error,
  canRetry,
  onExample,
  onOrderAction,
  onRetry,
  endRef,
}: MessageListProps) {
  return (
    <div
      aria-label="Historial de conversación"
      aria-live="polite"
      aria-relevant="additions"
      className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto px-4 sm:px-6"
      role="log"
    >
      {messages.length === 0 ? (
        <EmptyState onExample={onExample} />
      ) : (
        <div className="flex flex-col gap-5 py-6">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <article
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`w-fit max-w-[min(92%,42rem)] rounded-2xl p-3 sm:p-4 ${
                    isUser
                      ? "rounded-br-md bg-zinc-100 text-slate-800"
                      : "rounded-bl-md border border-slate-200 bg-white text-zinc-800 shadow-sm"
                  }`}
                >
                  {!isUser && (
                    <p className="mb-2 text-xs font-semibold text-teal-800">
                      Picker Copilot
                    </p>
                  )}
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-base leading-7">
                      {message.content}
                    </p>
                  ) : (
                    <AssistantText content={message.content} />
                  )}
                  {message.orders?.map((order) => (
                    <OrderCard
                      key={order.orderId}
                      order={order}
                      onAction={onOrderAction}
                    />
                  ))}
                  <p
                    className={`mt-2 text-right text-[10px] ${isUser ? "text-slate-500" : "text-slate-400"}`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </article>
            );
          })}

          {isLoading && (
            <div
              role="status"
              className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white p-3 text-sm text-slate-600 shadow-sm"
            >
              <span className="size-2 animate-pulse rounded-full bg-teal-700" />
              Consultando los datos operativos...
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900"
            >
              <p>{error}</p>
              {canRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isLoading}
                  className="shrink-0 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:opacity-50"
                >
                  Reintentar
                </button>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}
