import { ConversationList } from "@/components/conversation-list";

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-12">
      <aside className="hidden md:col-span-4 md:block">
        <ConversationList />
      </aside>
      <div className="md:col-span-8">{children}</div>
    </div>
  );
}

