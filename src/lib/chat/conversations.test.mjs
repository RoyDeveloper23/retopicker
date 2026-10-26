import assert from "node:assert/strict";
import test from "node:test";

import {
  appendMessage,
  createConversation,
  deleteConversation,
  getActiveConversation,
  loadConversationState,
  parseConversationState,
  saveConversationState,
  selectConversation,
} from "./conversations.ts";

function createStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem() {
      return value;
    },
    setItem(_key, nextValue) {
      value = nextValue;
    },
    get value() {
      return value;
    },
  };
}

function message(id, role, content, createdAt) {
  return { id, role, content, createdAt };
}

test("persists conversations and restores a valid active conversation", () => {
  const storage = createStorage();
  const first = createConversation("first", "2026-10-25T10:00:00.000Z");
  const second = createConversation("second", "2026-10-25T11:00:00.000Z");
  let state = {
    conversations: [first, second],
    activeConversationId: "first",
  };
  state = appendMessage(
    state,
    "first",
    message("message-1", "user", "  Revisa   el pedido 12345  ", "2026-10-25T12:00:00.000Z"),
  );
  state = selectConversation(state, "second");

  assert.equal(saveConversationState(storage, state), true);
  const restored = loadConversationState(storage);

  assert.equal(restored.activeConversationId, "second");
  assert.equal(restored.conversations.length, 2);
  assert.equal(getActiveConversation(restored).id, "second");
  const savedFirst = restored.conversations.find(({ id }) => id === "first");
  assert.equal(savedFirst.title, "Revisa el pedido 12345");
  assert.equal(savedFirst.messages.length, 1);
});

test("switching conversations preserves updates to the original conversation", () => {
  const first = createConversation("first", "2026-10-25T10:00:00.000Z");
  const second = createConversation("second", "2026-10-25T11:00:00.000Z");
  const initial = {
    conversations: [first, second],
    activeConversationId: "first",
  };
  const withUserMessage = appendMessage(
    initial,
    "first",
    message("user-1", "user", "Pedido 12340", "2026-10-25T12:00:00.000Z"),
  );
  const switched = selectConversation(withUserMessage, "second");
  const withAssistantReply = appendMessage(
    switched,
    "first",
    message("assistant-1", "assistant", "Está en ruta.", "2026-10-25T12:01:00.000Z"),
  );

  assert.equal(withAssistantReply.activeConversationId, "second");
  assert.equal(getActiveConversation(withAssistantReply).id, "second");
  assert.deepEqual(
    withAssistantReply.conversations.find(({ id }) => id === "first").messages
      .map(({ role }) => role),
    ["user", "assistant"],
  );
  assert.equal(
    withAssistantReply.conversations.find(({ id }) => id === "first").title,
    "Pedido 12340",
  );
});

test("deleting the active conversation selects another without deleting it", () => {
  const state = {
    conversations: [
      createConversation("older", "2026-10-25T10:00:00.000Z"),
      createConversation("active", "2026-10-25T11:00:00.000Z"),
    ],
    activeConversationId: "active",
  };

  const updated = deleteConversation(state, "active");

  assert.equal(updated.activeConversationId, "older");
  assert.deepEqual(updated.conversations.map(({ id }) => id), ["older"]);
});

test("ignores malformed, invalid, and duplicate stored conversations safely", () => {
  assert.deepEqual(parseConversationState("not json"), {
    conversations: [],
    activeConversationId: "",
  });
  assert.deepEqual(parseConversationState(JSON.stringify({ version: 1 })), {
    conversations: [],
    activeConversationId: "",
  });

  const valid = createConversation("valid", "2026-10-25T10:00:00.000Z");
  const parsed = parseConversationState(
    JSON.stringify({
      version: 1,
      activeConversationId: "missing",
      conversations: [
        valid,
        valid,
        { ...valid, id: "invalid", messages: [{ role: "system" }] },
      ],
    }),
  );

  assert.deepEqual(parsed.conversations.map(({ id }) => id), ["valid"]);
  assert.equal(parsed.activeConversationId, "valid");
});

test("handles unavailable storage without throwing", () => {
  const storage = {
    getItem() {
      throw new Error("storage unavailable");
    },
    setItem() {
      throw new Error("storage unavailable");
    },
  };

  assert.deepEqual(loadConversationState(storage), {
    conversations: [],
    activeConversationId: "",
  });
  assert.equal(
    saveConversationState(storage, {
      conversations: [],
      activeConversationId: "",
    }),
    false,
  );
});
