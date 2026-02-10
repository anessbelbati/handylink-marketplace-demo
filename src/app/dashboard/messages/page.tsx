import { ConversationList } from "@/components/conversation-list";

export default function MessagesIndexPage() {
  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6 shadow-soft">
        <h1 className="text-2xl font-semibold text-slate-950">Messages</h1>
        <p className="mt-1 text-sm text-slate-600">
          Conversations update instantly. Pick one to open the thread.
        </p>
      </div>

      <div className="md:hidden">
        <ConversationList />
      </div>

      <div className="hidden md:block">
        <div className="glass rounded-3xl p-10 text-center text-sm text-slate-600 shadow-soft">
          Select a conversation to view messages.
        </div>
      </div>
    </div>
  );
}

