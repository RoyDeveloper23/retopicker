import { Suspense } from "react";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function Home(props: PageProps<"/">) {
  return (
    <Suspense
      fallback={
        <main className="flex h-dvh items-center justify-center bg-slate-50 text-sm text-slate-600">
          Cargando asistente...
        </main>
      }
    >
      <ChatPage searchParams={props.searchParams} />
    </Suspense>
  );
}

async function ChatPage({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const { message } = await searchParams;
  return (
    <ChatInterface
      initialMessage={typeof message === "string" ? message.slice(0, 2_000) : ""}
    />
  );
}
