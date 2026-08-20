import { useState, useRef, useEffect } from "react";
import client from "../../api/client";
import FormattedAnswer from "../../components/FormattedAnswer";

/**
 * Reused as-is for student/teacher (protected) and guest chat - only the
 * endpoint prop changes. Shows the detected intent as a small tag on each
 * reply so the routing (results/notifications/announcements/general) is visible.
 */
export default function ChatPanel({ endpoint, placeholder, prefillMessage, onPrefillConsumed }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When something outside (e.g. a PYQ's "Ask AI" button) hands us a
  // question to start from, drop it into the input box - editable, not
  // auto-sent - then tell the parent it's been applied so it doesn't
  // re-fire on every re-render.
  useEffect(() => {
    if (prefillMessage) {
      setInput(prefillMessage);
      onPrefillConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillMessage]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await client.post(endpoint, { message: userMsg.text });
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer, intent: data.intent }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: err.response?.data?.message || "Something went wrong.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-slate/10 rounded-sm flex flex-col h-[65vh]">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <p className="text-slate text-sm">Ask about results, policies, announcements, or anything else.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-sm text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-indigo text-cream"
                  : m.error
                  ? "bg-rust/10 text-rust"
                  : "bg-parchment2 text-ink"
              }`}
            >
              {m.intent && (
                <span className="block text-[10px] uppercase tracking-wide text-brass mb-1">{m.intent}</span>
              )}
              {m.role === "assistant" ? <FormattedAnswer text={m.text} /> : m.text}
            </div>
          </div>
        ))}
        {loading && <p className="text-slate text-xs">Thinking...</p>}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="border-t border-slate/10 p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brass"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo text-cream px-5 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
