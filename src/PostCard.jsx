import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function PostCard({ post }) {
  const [replies, setReplies] = useState([]);
  const [reply, setReply] = useState("");

  async function fetchReplies() {
    const { data } = await supabase
      .from("replies")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    setReplies(data || []);
  }

  async function addReply() {
    if (!reply.trim()) return;

    await supabase.from("replies").insert([
      { post_id: post.id, content: reply },
    ]);

    setReply("");
  }

  useEffect(() => {
    fetchReplies();

    const channel = supabase
      .channel(`replies-${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "replies",
          filter: `post_id=eq.${post.id}`,
        },
        () => fetchReplies()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [post.id]);

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: "bold" }}>{post.content}</div>

      <div style={{ marginTop: 10 }}>
        {replies.map((r) => (
          <div key={r.id} style={{ fontSize: 14, marginLeft: 10 }}>
            ↳ {r.content}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", marginTop: 10, gap: 6 }}>
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply..."
          style={{ flex: 1 }}
        />
        <button onClick={addReply}>Reply</button>
      </div>
    </div>
  );
}