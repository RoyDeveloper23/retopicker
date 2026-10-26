"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  appendMessage,
  createConversation,
  deleteConversation,
  ensureInitialConversation,
  getConversationSnapshot,
  getServerConversationSnapshot,
  getActiveConversation,
  parseConversationState,
  subscribeToConversationState,
  selectConversation,
  updateConversationState,
} from "@/lib/chat/conversations";
import type {
  ChatMessage,
  OrderCardData,
} from "@/lib/chat/types";
import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { ConversationList } from "./conversation-list";
import { MessageList } from "./message-list";

interface ChatResponse {
  response: string;
  orders?: OrderCardData[];
}

interface ChatError {
  conversationId: string;
  message: string;
  retryMessage: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOrderCardData(value: unknown): value is OrderCardData {
  if (!isRecord(value)) return false;

  return (
    typeof value.orderId === "number" &&
    typeof value.merchant === "string" &&
    typeof value.branch === "string" &&
    typeof value.customer === "string" &&
    typeof value.city === "string" &&
    typeof value.status === "string" &&
    (typeof value.provider === "string" || value.provider === null) &&
    (typeof value.courier === "string" || value.courier === null) &&
    (typeof value.eta === "string" || value.eta === null) &&
    (typeof value.deliveredAt === "string" || value.deliveredAt === null) &&
    (typeof value.incident === "string" || value.incident === null) &&
    Array.isArray(value.tracking) &&
    value.tracking.every(
      (event) =>
        isRecord(event) &&
        typeof event.phase === "string" &&
        typeof event.timestamp === "string",
    )
  );
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  orders?: OrderCardData[],
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    ...(orders?.length ? { orders } : {}),
  };
}

export function ChatInterface({
  initialMessage = "",
  compact = false,
  onClosePanel,
}: {
  initialMessage?: string;
  compact?: boolean;
  onClosePanel?: () => void;
}) {
  const conversationSnapshot = useSyncExternalStore(
    subscribeToConversationState,
    getConversationSnapshot,
    getServerConversationSnapshot,
  );
  const conversationState = useMemo(
    () => parseConversationState(conversationSnapshot),
    [conversationSnapshot],
  );
  const [draft, setDraft] = useState(initialMessage);
  const [isHistoryVisible, setIsHistoryVisible] = useState(!compact);
  const [pendingConversationId, setPendingConversationId] = useState<
    string | null
  >(null);
  const [chatError, setChatError] = useState<ChatError | null>(null);
  const isSending = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const activeConversation = getActiveConversation(conversationState);
  const messages = activeConversation?.messages ?? [];
  const isActiveConversationLoading =
    pendingConversationId === conversationState.activeConversationId;
  const visibleError =
    chatError?.conversationId === conversationState.activeConversationId
      ? chatError
      : null;

  useEffect(() => {
    ensureInitialConversation();
    if (new URL(window.location.href).searchParams.has("message")) {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname,
      );
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversationSnapshot, pendingConversationId, visibleError]);

  async function sendMessage(
    message: string,
    conversationId: string,
    options: { appendUser: boolean; clearDraft: boolean },
  ) {
    const normalizedMessage = message.trim();
    if (!normalizedMessage || isSending.current) return;

    isSending.current = true;
    setPendingConversationId(conversationId);
    setChatError(null);
    if (options.appendUser) {
      updateConversationState((current) =>
        appendMessage(
          current,
          conversationId,
          createMessage("user", normalizedMessage),
        ),
      );
    }

    try {
      let response: Response;
      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: normalizedMessage }),
        });
      } catch {
        throw new Error(
          "No se pudo conectar con Picker Copilot. Comprueba tu conexión e inténtalo de nuevo.",
        );
      }
      const payload: unknown = await response.json().catch(() => null);

      if (!isRecord(payload)) {
        throw new Error(
          "El servidor devolvió una respuesta no válida. Inténtalo de nuevo.",
        );
      }
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "No se pudo procesar la consulta.",
        );
      }
      if (typeof payload.response !== "string" || !payload.response.trim()) {
        throw new Error("El asistente devolvió una respuesta vacía.");
      }

      const result: ChatResponse = {
        response: payload.response,
        orders: Array.isArray(payload.orders)
          ? payload.orders.filter(isOrderCardData)
          : undefined,
      };
      updateConversationState((current) =>
        appendMessage(
          current,
          conversationId,
          createMessage("assistant", result.response, result.orders),
        ),
      );
      setChatError(null);
      if (options.clearDraft) setDraft("");
    } catch (caught) {
      setChatError({
        conversationId,
        message:
          caught instanceof Error
            ? caught.message
            : "No se pudo conectar con Picker Copilot. Inténtalo de nuevo.",
        retryMessage: normalizedMessage,
      });
    } finally {
      isSending.current = false;
      setPendingConversationId(null);
    }
  }

  function startNewConversation() {
    const conversation = createConversation(crypto.randomUUID());
    updateConversationState((current) => ({
      conversations: [conversation, ...current.conversations],
      activeConversationId: conversation.id,
    }));
    setDraft("");
    setChatError(null);
  }

  function handleDeleteConversation(conversationId: string) {
    const fallbackConversation = createConversation(crypto.randomUUID());
    updateConversationState((current) => {
      const updated = deleteConversation(current, conversationId);
      if (updated.conversations.length > 0) return updated;
      return {
        conversations: [fallbackConversation],
        activeConversationId: fallbackConversation.id,
      };
    });
    if (chatError?.conversationId === conversationId) setChatError(null);
    setDraft("");
  }

  function handleSubmit() {
    if (!activeConversation) return;
    void sendMessage(draft, activeConversation.id, {
      appendUser: true,
      clearDraft: true,
    });
  }

  const handleOrderAction = (message: string) => {
    if (!activeConversation) return;
    void sendMessage(message, activeConversation.id, {
      appendUser: true,
      clearDraft: false,
    });
  };

  return (
    <main
      className={`flex flex-col bg-slate-50 text-slate-800 ${
        compact ? "h-full min-h-0" : "h-dvh min-h-[480px]"
      }`}
    >
      <ChatHeader
        onNewConversation={startNewConversation}
        disabled={false}
        compact={compact}
        onClosePanel={onClosePanel}
      />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ConversationList
          conversations={conversationState.conversations}
          activeConversationId={conversationState.activeConversationId}
          isVisible={isHistoryVisible}
          onToggleVisibility={() =>
            setIsHistoryVisible((visible) => !visible)
          }
          onSelect={(conversationId) => {
            updateConversationState((current) =>
              selectConversation(current, conversationId),
            );
            setDraft("");
          }}
          onDelete={handleDeleteConversation}
        />
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          aria-label="Chat con Picker Copilot"
        >
          <MessageList
            messages={messages}
            isLoading={isActiveConversationLoading}
            error={visibleError?.message ?? null}
            canRetry={visibleError !== null}
            onExample={(message) => {
              if (!activeConversation) return;
              void sendMessage(message, activeConversation.id, {
                appendUser: true,
                clearDraft: true,
              });
            }}
            onOrderAction={handleOrderAction}
            onRetry={() => {
              if (visibleError) {
                void sendMessage(
                  visibleError.retryMessage,
                  visibleError.conversationId,
                  { appendUser: false, clearDraft: false },
                );
              }
            }}
            endRef={endRef}
          />
          <footer className="shrink-0 border-t border-slate-200 bg-slate-50">
            <ChatInput
              value={draft}
              isLoading={isActiveConversationLoading}
              isBusy={pendingConversationId !== null}
              onChange={setDraft}
              onSubmit={handleSubmit}
            />
          </footer>
        </section>
      </div>
    </main>
  );
}
