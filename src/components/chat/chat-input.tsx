import { type KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  isLoading: boolean;
  isBusy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function ChatInput({
  value,
  isLoading,
  isBusy,
  onChange,
  onSubmit,
}: ChatInputProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      className="mx-auto w-full max-w-5xl px-4 pb-4 pt-3 sm:px-6 sm:pb-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="rounded-xl border border-slate-300 bg-white p-2 shadow-sm transition-colors focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-700/15">
        <label className="sr-only" htmlFor="chat-message">
          Escribe tu consulta
        </label>
        <textarea
          id="chat-message"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          maxLength={2_000}
          rows={2}
          placeholder="Pregunta por un pedido, tracking o incidencia..."
          className="max-h-36 min-h-12 w-full resize-y bg-transparent px-2 py-1.5 text-base leading-6 text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-1 pt-2">
          <p className="text-sm text-slate-500">
            {isLoading
              ? "Picker Copilot está consultando la operación..."
              : isBusy
                ? "Hay una consulta en curso en otra conversación."
                : "Enter para enviar · Shift+Enter para nueva línea"}
          </p>
          <button
            type="submit"
            disabled={isBusy || value.trim().length === 0}
            aria-label={isLoading ? "Enviando consulta" : "Enviar consulta"}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="size-4 animate-spin"
              >
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  stroke="currentColor"
                  strokeOpacity=".3"
                  strokeWidth="2"
                />
                <path
                  d="M17 10a7 7 0 0 0-7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="size-4"
              >
                <path
                  d="M3 10h13m-5-5 5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        Las respuestas se basan en los datos operativos disponibles.
      </p>
    </form>
  );
}
