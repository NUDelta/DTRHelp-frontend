import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInOrRegister, saveSession, getSession } from "./auth";

export default function SignIn() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getSession()) navigate("/pair-connect", { replace: true });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    const { user, error: err } = await signInOrRegister(name.trim(), password);
    setLoading(false);
    if (err) { setError(err); return; }
    saveSession(user);
    navigate("/pair-connect", { replace: true });
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <h2 style={{ marginBottom: 24 }}>DTR Help</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          autoComplete="username"
          style={{ padding: 8, fontSize: 15 }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          style={{ padding: 8, fontSize: 15 }}
        />
        {error && <div style={{ color: "red", fontSize: 14 }}>{error}</div>}
        <button type="submit" disabled={loading || !name.trim() || !password.trim()} style={{ padding: 8, fontSize: 15 }}>
          {loading ? "Loading…" : "Sign in / Register"}
        </button>
      </form>
    </div>
  );
}
