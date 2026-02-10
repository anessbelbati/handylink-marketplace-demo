"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCheck, ImagePlus, Send } from "lucide-react";

import { api } from "@convex/_generated/api";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { useDemoAuth } from "@/lib/demo-auth";

export default function ConversationThread({
  conversationId,
}: {
  conversationId: string;
}) {
  const router = useRouter();
  const { demoClerkId } = useDemoAuth();
  const demoArg = demoClerkId ?? undefined;

  const me = useQuery(api.users.getMe, { demoClerkId: demoArg });
  const conversation = useQuery(api.conversations.getConversation, {
    demoClerkId: demoArg,
    conversationId: conversationId as any,
  });
  const typing = useQuery(api.messages.getTyping, {
    demoClerkId: demoArg,
    conversationId: conversationId as any,
  });

  const markAsRead = useMutation(api.messages.markAsRead);
  const sendMessage = useMutation(api.messages.sendMessage);
  const setTyping = useMutation(api.messages.setTyping);
  const generateUploadUrl = useAction(api.files.generateUploadUrl);

  const {
    results: messagesDesc,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.messages.getMessages,
    {
      demoClerkId: demoArg,
      conversationId: conversationId as any,
    },
    { initialNumItems: 50 },
  );

  const messages = useMemo(() => [...messagesDesc].reverse(), [messagesDesc]);
  const imageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of messages) if (m.imageStorageId) ids.add(m.imageStorageId);
    return Array.from(ids);
  }, [messages]);

  const imageUrls = useQuery(
    api.files.getUrls,
    imageIds.length > 0
      ? {
          storageIds: imageIds as any,
        }
      : "skip",
  );

  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastTypingSentAtRef = useRef<number>(0);

  useEffect(() => {
    if (!conversationId) return;
    // best effort; ignore errors
    markAsRead({
      demoClerkId: demoArg,
      conversationId: conversationId as any,
    }).catch(() => {});
  }, [conversationId, markAsRead, messagesDesc.length, demoArg]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function uploadImage(file: File) {
    const uploadUrl = await generateUploadUrl(
      demoArg ? { demoClerkId: demoArg } : {},
    );
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    return json.storageId as string;
  }

  async function onSend() {
    if (!me) return;
    const content = text.trim();
    if (!content && !imageFile) return;
    setIsSending(true);
    try {
      let imageStorageId: string | undefined;
      if (imageFile) {
        imageStorageId = await uploadImage(imageFile);
      }
      await sendMessage({
        demoClerkId: demoArg,
        conversationId: conversationId as any,
        content: content || (imageStorageId ? "" : " "),
        imageStorageId: imageStorageId ? (imageStorageId as any) : undefined,
      });
      setText("");
      setImageFile(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setIsSending(false);
    }
  }

  if (conversation === null) {
    return (
      <div className="glass rounded-3xl p-6 shadow-soft">
        <div className="text-sm font-semibold text-slate-950">
          Conversation not found
        </div>
        <div className="mt-4">
          <Button href="/dashboard/messages" variant="outline">
            Back
          </Button>
        </div>
      </div>
    );
  }

  const other = conversation?.otherUser;

  return (
    <div className="glass flex h-[70vh] min-h-[520px] flex-col overflow-hidden rounded-3xl shadow-soft">
      <header className="flex items-center justify-between gap-3 border-b bg-white/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-white/70 text-slate-800 shadow-soft md:hidden"
            onClick={() => router.push("/dashboard/messages")}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Avatar name={other?.fullName ?? "User"} url={other?.avatarUrl} size={40} />
          <div>
            <div className="text-sm font-semibold text-slate-950">
              {other?.fullName ?? "Conversation"}
            </div>
            {typing?.otherTyping ? (
              <div className="text-xs font-medium text-emerald-700">
                Typing...
              </div>
            ) : conversation?.request ? (
              <Link
                href={`/dashboard/requests/${conversation.request._id}`}
                className="text-xs text-slate-600 hover:underline"
              >
                {conversation.request.title}
              </Link>
            ) : (
              <div className="text-xs text-slate-600">Direct message</div>
            )}
          </div>
        </div>

        <div className="hidden md:block">
          <Button href="/dashboard/messages" variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            All chats
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-[radial-gradient(1000px_300px_at_50%_0%,rgba(16,185,129,0.08),transparent_60%)] p-4">
        {status === "CanLoadMore" ? (
          <div className="mb-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMore(50)}
              disabled={isLoading}
            >
              Load earlier
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          {messages.map((m) => {
            const mine = me && m.senderId === me._id;
            const imgUrl = m.imageStorageId
              ? (imageUrls?.[m.imageStorageId] as string | null | undefined)
              : null;
            return (
              <div
                key={m._id}
                className={cn(
                  "flex",
                  mine ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-3xl border px-4 py-3 text-sm shadow-soft",
                    mine
                      ? "bg-brand-600 text-white border-transparent"
                      : "bg-white/70 text-slate-900",
                  )}
                >
                  {imgUrl ? (
                    <div className="relative mb-2 aspect-[4/3] w-[240px] overflow-hidden rounded-2xl bg-slate-900/10">
                      <Image
                        src={imgUrl}
                        alt="Message image"
                        fill
                        sizes="240px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}

                  {m.content ? <div className="whitespace-pre-wrap">{m.content}</div> : null}

                  <div
                    className={cn(
                      "mt-2 flex items-center justify-end gap-2 text-[11px]",
                      mine ? "text-white/80" : "text-slate-500",
                    )}
                  >
                    <span>{formatTime(m.createdAt)}</span>
                    {mine ? (
                      m.isRead ? (
                        <CheckCheck className="h-4 w-4 text-sky-200" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div ref={bottomRef} />
      </div>

      <footer className="border-t bg-white/50 p-3">
        <div className="flex items-center gap-2">
          <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border bg-white/70 text-slate-800 shadow-soft hover:bg-white">
            <ImagePlus className="h-4 w-4" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Input
            value={text}
            onChange={(e) => {
              const next = e.target.value;
              setText(next);

              if (!me) return;
              if (!next.trim()) return;
              const now = Date.now();
              if (now - lastTypingSentAtRef.current < 1200) return;
              lastTypingSentAtRef.current = now;
              // Best-effort, ignore failures.
              setTyping({
                demoClerkId: demoArg,
                conversationId: conversationId as any,
              }).catch(() => {});
            }}
            placeholder="Message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <Button onClick={onSend} disabled={isSending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {imageFile ? (
          <div className="mt-2 text-xs text-slate-600">
            Image ready: <span className="font-medium">{imageFile.name}</span>
          </div>
        ) : null}
      </footer>
    </div>
  );
}
