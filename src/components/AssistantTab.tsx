import { useEffect, useRef, useState } from "react";
import { Crown, Lock, RotateCcw, Send, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { openPremiumCheckout } from "../lib/billing";

const MCGILL_RED = "#ED1B2F";
const LIGHT_BG = "#F6F7F9";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What events are on campus this week?",
  "How do I register for courses on Minerva?",
  "Tips for surviving first year at McGill?",
  "What student services should I know about?",
  "How does the GPA system work at McGill?",
  "Where can I get free tutoring on campus?",
];

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-black">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={key++} className="mb-2 space-y-1 pl-4">
        {listItems.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-black/40" />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      flushList();
      elements.push(<p key={key++} className="mb-1 mt-3 text-sm font-bold text-black">{renderInline(line.slice(4))}</p>);
    } else if (line.startsWith("## ")) {
      flushList();
      elements.push(<p key={key++} className="mb-1 mt-3 text-sm font-bold text-black">{renderInline(line.slice(3))}</p>);
    } else if (line.startsWith("# ")) {
      flushList();
      elements.push(<p key={key++} className="mb-1.5 mt-3 font-bold text-black">{renderInline(line.slice(2))}</p>);
    } else if (line.match(/^[-*] /)) {
      listItems.push(line.slice(2));
    } else if (line.match(/^\d+\. /)) {
      listItems.push(line.replace(/^\d+\. /, ""));
    } else if (line.trim() === "---" || line.trim() === "***") {
      flushList();
      elements.push(<hr key={key++} className="my-3 border-black/10" />);
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      elements.push(<p key={key++} className="mb-1.5">{renderInline(line)}</p>);
    }
  }

  flushList();

  return <div className="space-y-0.5 text-sm leading-relaxed text-black/75">{elements}</div>;
}

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
        let msg = "Something went wrong. Please try again.";
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
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
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-black">Vybin AI</h2>
        <p className="mt-2 max-w-sm text-sm text-black/55">
          Your personal McGill expert. Ask anything about campus life, events, courses, services, and more.
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
    <div className="flex h-[calc(100vh-4rem)] flex-col md:h-[calc(100vh-6rem)]" style={{ background: LIGHT_BG }}>

      {/* Header */}
      <div className="flex-shrink-0 border-b border-black/5 bg-white px-4 py-3 sm:px-5">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
              style={{ background: MCGILL_RED }}
            >
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-black">Vybin AI</h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <Crown className="h-3 w-3" /> Premium
                </span>
              </div>
              <p className="text-[11px] text-black/40">Your McGill campus expert</p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-black/50 transition hover:bg-black/5"
            >
              <RotateCcw className="h-3 w-3" />
              New chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="mx-auto max-w-2xl space-y-5">

          {messages.length === 0 && (
            <>
              <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ background: MCGILL_RED }}
                  >
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-black">Hey, I'm Vybin AI 👋</p>
                    <p className="mt-0.5 text-sm text-black/55">
                      I know everything about McGill — events, courses, services, campus life. Ask me anything.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-black/30">Suggestions</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-xl border border-black/8 bg-white px-4 py-3 text-left text-sm text-black/65 shadow-sm transition hover:border-[#ED1B2F]/25 hover:bg-red-50/50 hover:text-black"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div
                  className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: MCGILL_RED }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-tr-sm text-white"
                    : "rounded-tl-sm border border-black/8 bg-white text-black/80 shadow-sm"
                }`}
                style={msg.role === "user" ? { background: MCGILL_RED } : {}}
              >
                {msg.role === "assistant" ? (
                  <MarkdownMessage content={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div
                className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: MCGILL_RED }}
              >
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-black/8 bg-white px-4 py-3.5 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-black/20" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-black/20" style={{ animationDelay: "160ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-black/20" style={{ animationDelay: "320ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-black/5 bg-white px-4 py-3 sm:px-5">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-end gap-2 rounded-2xl border border-black/10 bg-[#F6F7F9] px-4 py-2.5 transition focus-within:border-[#ED1B2F]/30 focus-within:bg-white">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about McGill..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-sm text-black outline-none placeholder:text-black/35 disabled:opacity-60"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-white transition hover:opacity-90 disabled:opacity-35"
              style={{ background: MCGILL_RED }}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-black/25">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
