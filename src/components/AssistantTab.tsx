import { useEffect, useRef, useState } from "react";
import { Crown, Lock, Send, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { openPremiumCheckout } from "../lib/billing";

const MCGILL_RED = "#ED1B2F";
const LIGHT_BG = "#F6F7F9";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What events are happening this week?",
  "What events match my interests?",
  "How do I get involved in clubs at McGill?",
  "Tips for surviving first year at McGill?",
];

export function AssistantTab() {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsPremium((data as any)?.is_premium === true));
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: newMessages },
      });

      if (error) {
        let msg = error.message ?? "Something went wrong.";
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I ran into an error: ${msg}` }]);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  if (isPremium === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ background: LIGHT_BG }}>
        <p className="text-sm text-black/40">Loading...</p>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center" style={{ background: LIGHT_BG }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
          <Lock className="h-8 w-8 text-amber-500" />
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Crown className="h-3.5 w-3.5" /> Premium Feature
        </span>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-black">AI Assistant</h2>
        <p className="mt-2 max-w-sm text-sm text-black/55">
          Ask anything about McGill campus life, get event recommendations based on your interests, and more.
        </p>
        <button
          onClick={openPremiumCheckout}
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: MCGILL_RED }}
        >
          <Crown className="h-4 w-4" /> Upgrade to Premium
        </button>
        <p className="mt-3 text-xs text-black/35">Vybin Premium — $10/month</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-24 md:pb-0" style={{ background: LIGHT_BG }}>

      {/* Header */}
      <div className="border-b border-black/5 bg-white px-4 py-4 sm:px-5">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: MCGILL_RED }}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-black">AI Assistant</h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <Crown className="h-3 w-3" /> Premium
                </span>
              </div>
              <p className="text-xs text-black/45">Ask anything about McGill campus life</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="mx-auto max-w-2xl space-y-4">

          {messages.length === 0 && (
            <>
              {/* Welcome */}
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <p className="font-semibold text-black">Hey! I'm your Vybin assistant 👋</p>
                <p className="mt-1 text-sm text-black/55">
                  I know what's happening on campus and can help you find events, navigate McGill life, and answer your student questions.
                </p>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-xl border border-black/8 bg-white px-4 py-3 text-left text-sm text-black/70 shadow-sm transition hover:border-[#ED1B2F]/30 hover:bg-red-50 hover:text-black"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: MCGILL_RED }}>
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-white"
                    : "border border-black/8 bg-white text-black/80 shadow-sm"
                }`}
                style={msg.role === "user" ? { background: MCGILL_RED } : {}}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: MCGILL_RED }}>
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="rounded-2xl border border-black/8 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-black/25" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-black/25" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-black/25" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-black/5 bg-white px-4 py-3 sm:px-5">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about McGill..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-black/10 bg-[#F6F7F9] px-4 py-3 text-sm text-black outline-none transition focus:border-[#ED1B2F]/40 focus:bg-white disabled:opacity-60"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: MCGILL_RED }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mx-auto mt-1.5 max-w-2xl text-center text-[10px] text-black/30">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
