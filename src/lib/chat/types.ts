export interface OrderCardData {
  orderId: number;
  merchant: string;
  branch: string;
  customer: string;
  city: string;
  status: string;
  provider: string | null;
  courier: string | null;
  eta: string | null;
  deliveredAt: string | null;
  incident: string | null;
  tracking: Array<{
    phase: string;
    timestamp: string;
  }>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  orders?: OrderCardData[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string;
}
