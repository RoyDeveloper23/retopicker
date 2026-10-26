import type { Conversation } from "@/lib/chat/types";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onSelect: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}

function formatActivity(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ConversationList({
  conversations,
  activeConversationId,
  isVisible,
  onToggleVisibility,
  onSelect,
  onDelete,
}: ConversationListProps) {
  return (
    <aside
      id="conversation-history"
      aria-label="Historial de conversaciones"
      className={`w-full shrink-0 border-b border-slate-200 bg-white transition-[width] duration-200 motion-reduce:transition-none md:h-full md:border-b-0 md:border-r ${isVisible ? "md:w-64" : "md:w-12"}`}
    >
      <div
        className={`flex h-12 items-center px-3 ${isVisible ? "justify-between" : "justify-center"}`}
      >
        <div
          className={`flex min-w-0 items-center gap-1.5 ${isVisible ? "" : "hidden"}`}
        >
          <h2 className="truncate text-sm font-semibold text-slate-800">
            Conversaciones
          </h2>
          <span className="text-xs tabular-nums text-slate-500">
            {conversations.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleVisibility}
          aria-controls="conversation-history-list"
          aria-expanded={isVisible}
          aria-label={
            isVisible ? "Ocultar historial" : "Mostrar historial"
          }
          title={isVisible ? "Ocultar historial" : "Mostrar historial"}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="size-[18px]"
          >
            <path
              d="M3 4.5h14v11H3zM8 4.5v11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d={isVisible ? "m5.5 8 2 2-2 2" : "m10.5 8-2 2 2 2"}
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div
        id="conversation-history-list"
        className={isVisible ? "block" : "hidden"}
      >
        {conversations.length === 0 ? (
          <p className="px-4 pb-3 text-sm text-slate-500 md:py-2">
            Sin conversaciones guardadas
          </p>
        ) : (
          <nav
            aria-label="Conversaciones guardadas"
            className="overflow-x-auto px-2 pb-2 md:h-[calc(100%-3rem)] md:overflow-x-hidden md:overflow-y-auto md:px-3 md:pb-3"
          >
            <ul className="flex min-w-max gap-2 md:min-w-0 md:flex-col">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                return (
                  <li
                    key={conversation.id}
                    className={`flex w-56 items-center gap-1 rounded-lg border p-1 md:w-full ${
                      isActive
                        ? "border-teal-200 bg-teal-50/70"
                        : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      aria-current={isActive ? "page" : undefined}
                      className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700"
                    >
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {conversation.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {formatActivity(conversation.updatedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(conversation.id)}
                      aria-label={`Eliminar conversación: ${conversation.title}`}
                      title="Eliminar conversación"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="size-4"
                      >
                        <path
                          d="M4 6h12M8 6V4h4v2m-6 0 1 10h6l1-10M8.5 9v4m3-4v4"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </aside>
  );
}
