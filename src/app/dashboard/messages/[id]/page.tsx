import ConversationThread from "./thread";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConversationThread conversationId={id} />;
}

