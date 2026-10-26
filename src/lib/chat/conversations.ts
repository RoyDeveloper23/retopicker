import type {
  ChatMessage,
  Conversation,
  ConversationState,
  OrderCardData,
} from "./types";

export const CONVERSATION_STORAGE_KEY = "picker-copilot-conversations-v1";
export const MAX_CONVERSATION_TITLE_LENGTH = 52;

const defaultTitle = "Nueva conversación";
const emptyState: ConversationState = {
  conversations: [],
  activeConversationId: "",
};
const emptyStateSnapshot = JSON.stringify({ version: 1, ...emptyState });
const snapshotListeners = new Set<() => void>();
let fallbackSnapshot = emptyStateSnapshot;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
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

function isChatMessage(value: unknown): value is ChatMessage {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    (value.role !== "user" && value.role !== "assistant") ||
    typeof value.content !== "string" ||
    !isIsoDate(value.createdAt)
  ) {
    return false;
  }

  return (
    value.orders === undefined ||
    (Array.isArray(value.orders) && value.orders.every(isOrderCardData))
  );
}

function isConversation(value: unknown): value is Conversation {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.title === "string" &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt) &&
    Array.isArray(value.messages) &&
    value.messages.every(isChatMessage)
  );
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function parseConversationState(
  storedValue: string | null,
): ConversationState {
  if (!storedValue) {
    return { conversations: [], activeConversationId: "" };
  }

  try {
    const parsed: unknown = JSON.parse(storedValue);
    if (
      !isRecord(parsed) ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.conversations) ||
      typeof parsed.activeConversationId !== "string"
    ) {
      return { conversations: [], activeConversationId: "" };
    }

    const uniqueConversations = new Map<string, Conversation>();
    for (const value of parsed.conversations) {
      if (isConversation(value) && !uniqueConversations.has(value.id)) {
        uniqueConversations.set(value.id, value);
      }
    }

    const conversations = sortConversations([...uniqueConversations.values()]);
    const activeConversationId = conversations.some(
      (conversation) => conversation.id === parsed.activeConversationId,
    )
      ? parsed.activeConversationId
      : (conversations[0]?.id ?? "");

    return { conversations, activeConversationId };
  } catch {
    return { conversations: [], activeConversationId: "" };
  }
}

export function createConversation(
  id: string,
  now = new Date().toISOString(),
): Conversation {
  return {
    id,
    title: defaultTitle,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function appendMessage(
  state: ConversationState,
  conversationId: string,
  message: ChatMessage,
): ConversationState {
  const conversations = state.conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation;

    const isFirstUserMessage =
      message.role === "user" &&
      !conversation.messages.some((item) => item.role === "user");
    const title = isFirstUserMessage
      ? message.content.replace(/\s+/g, " ").trim().slice(
          0,
          MAX_CONVERSATION_TITLE_LENGTH,
        ) || defaultTitle
      : conversation.title;

    return {
      ...conversation,
      title,
      updatedAt: message.createdAt,
      messages: [...conversation.messages, message],
    };
  });

  return { ...state, conversations: sortConversations(conversations) };
}

export function selectConversation(
  state: ConversationState,
  conversationId: string,
): ConversationState {
  if (!state.conversations.some((conversation) => conversation.id === conversationId)) {
    return state;
  }
  return { ...state, activeConversationId: conversationId };
}

export function deleteConversation(
  state: ConversationState,
  conversationId: string,
): ConversationState {
  const conversations = state.conversations.filter(
    (conversation) => conversation.id !== conversationId,
  );
  const activeConversationId =
    state.activeConversationId === conversationId
      ? (sortConversations(conversations)[0]?.id ?? "")
      : state.activeConversationId;

  return {
    conversations: sortConversations(conversations),
    activeConversationId,
  };
}

export function getActiveConversation(
  state: ConversationState,
): Conversation | undefined {
  return state.conversations.find(
    (conversation) => conversation.id === state.activeConversationId,
  );
}

export function serializeConversationState(
  state: ConversationState,
): string {
  return JSON.stringify({ version: 1, ...state });
}

export interface ConversationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadConversationState(
  storage: ConversationStorage,
): ConversationState {
  try {
    return parseConversationState(storage.getItem(CONVERSATION_STORAGE_KEY));
  } catch {
    return { conversations: [], activeConversationId: "" };
  }
}

export function saveConversationState(
  storage: ConversationStorage,
  state: ConversationState,
): boolean {
  try {
    storage.setItem(
      CONVERSATION_STORAGE_KEY,
      serializeConversationState(state),
    );
    return true;
  } catch {
    return false;
  }
}

export function getConversationSnapshot(): string {
  try {
    const storedValue = window.localStorage.getItem(CONVERSATION_STORAGE_KEY);
    if (storedValue !== null) {
      fallbackSnapshot = storedValue;
      return storedValue;
    }
  } catch {
    return fallbackSnapshot;
  }
  return fallbackSnapshot;
}

export function getServerConversationSnapshot(): string {
  return emptyStateSnapshot;
}

export function subscribeToConversationState(
  listener: () => void,
): () => void {
  snapshotListeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== CONVERSATION_STORAGE_KEY && event.key !== null) return;
    fallbackSnapshot = event.newValue ?? emptyStateSnapshot;
    for (const notify of snapshotListeners) notify();
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    snapshotListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function notifySnapshotListeners(): void {
  for (const listener of snapshotListeners) listener();
}

export function updateConversationState(
  update: (state: ConversationState) => ConversationState,
): void {
  const nextState = update(parseConversationState(getConversationSnapshot()));
  fallbackSnapshot = serializeConversationState(nextState);
  try {
    window.localStorage.setItem(CONVERSATION_STORAGE_KEY, fallbackSnapshot);
  } catch {
    // Retain the current session in memory when browser storage is unavailable.
  }
  notifySnapshotListeners();
}

export function ensureInitialConversation(): void {
  const state = parseConversationState(getConversationSnapshot());
  if (state.conversations.length > 0) return;

  const conversation = createConversation(crypto.randomUUID());
  updateConversationState(() => ({
    conversations: [conversation],
    activeConversationId: conversation.id,
  }));
}
