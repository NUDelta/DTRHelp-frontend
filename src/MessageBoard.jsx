import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabaseclient";

export default function MessageBoard() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyText, setReplyText] = useState({});
  const [dbError, setDbError] = useState(null);

  async function loadMessages() {
    const { data: msgs, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !msgs) { setDbError(error?.message || "fetch failed"); return; }
    setDbError(null);

    const { data: reps } = await supabase
      .from("replies")
      .select("*")
      .order("created_at", { ascending: true });

    setMessages(msgs.map((m) => ({
      ...m,
      replies: (reps || []).filter((r) => r.message_id === m.id),
    })));
  }

  async function postMessage() {
    if (!text.trim()) return;
    const { error } = await supabase.from("messages").insert([{ content: text }]);
    if (error) { setDbError("insert failed: " + error.message); return; }
    setText("");
    loadMessages();
  }

  async function postReply(messageId) {
    const val = replyText[messageId];
    if (!val?.trim()) return;
    await supabase.from("replies").insert([{ message_id: messageId, content: val }]);
    setReplyText((prev) => ({ ...prev, [messageId]: "" }));
    loadMessages();
  }

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>DTR Yap Board</h2>
        <Link to="/pair-connect" style={{ fontSize: 14 }}>Pair Connect</Link>
      </div>

      {dbError && <div style={{ color: "red", marginBottom: 12 }}>Error: {dbError}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write something..."
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={postMessage}>Post</button>
      </div>

      <div>
        {messages.map((m) => (
          <div key={m.id} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: "bold" }}>{m.content}</div>
            <div style={{ marginTop: 10, marginLeft: 10 }}>
              {m.replies?.map((r) => (
                <div key={r.id} style={{ fontSize: 14 }}>↳ {r.content}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <input
                value={replyText[m.id] || ""}
                onChange={(e) => setReplyText((p) => ({ ...p, [m.id]: e.target.value }))}
                placeholder="Reply..."
                style={{ flex: 1 }}
              />
              <button onClick={() => postReply(m.id)}>Reply</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
