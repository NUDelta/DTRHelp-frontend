import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabaseclient";
import { getName, getRole, getMaxMentees, getConsent, setName, setRole, setMaxMentees, setConsent, clearSession } from "./auth";
import people from "./hard-coded-data/people.json";

const MEETING_GUIDELINES = `Be empathetic and non-judgmental. Stay positive and relatable — share something real from your own experience. Make the topic feel approachable, not scary. Before the meeting ends, help them commit to one concrete action or deliverable they'll do during or right after — even something small. The goal is to show them the first step isn't as hard as it looks.`;

function Nav({ name, onReset }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
      <h2 style={{ margin: 0 }}>Pair Connect</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {name && <span style={{ fontSize: 14, color: "#555" }}>{name}</span>}
        <Link to="/board" style={{ fontSize: 14 }}>Message Board</Link>
        {name && (
          <button onClick={onReset} style={{ fontSize: 13, padding: "4px 10px" }}>
            Not {name}?
          </button>
        )}
      </div>
    </div>
  );
}

function Pool({ pool }) {
  if (!pool.length) return (
    <div style={{ color: "#888", fontSize: 14, marginTop: 8 }}>No concerns submitted yet.</div>
  );
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
          <th style={{ padding: "8px 10px", border: "1px solid #ddd", width: 120 }}>Name</th>
          <th style={{ padding: "8px 10px", border: "1px solid #ddd" }}>Concern</th>
          <th style={{ padding: "8px 10px", border: "1px solid #ddd" }}>Wants help with</th>
        </tr>
      </thead>
      <tbody>
        {pool.map((c) => (
          <tr key={c.id}>
            <td style={{ padding: "8px 10px", border: "1px solid #ddd", color: c.anonymous ? "#888" : "#000" }}>
              {c.anonymous ? "Anonymous" : c.person_name}
            </td>
            <td style={{ padding: "8px 10px", border: "1px solid #ddd" }}>{c.concern_text}</td>
            <td style={{ padding: "8px 10px", border: "1px solid #ddd" }}>{c.help_wanted_text}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RatingProgress({ progress }) {
  const { totalRatings, uniqueMentors, totalConcerns } = progress;
  const max = uniqueMentors * totalConcerns;
  const pct = max > 0 ? Math.round((totalRatings / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <strong>Rating progress</strong>
        <span style={{ color: "#555" }}>
          {totalRatings} / {max} ratings &nbsp;·&nbsp; {uniqueMentors} mentor{uniqueMentors !== 1 ? "s" : ""} &nbsp;·&nbsp; {totalConcerns} mentee{totalConcerns !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ background: "#e8e8e8", borderRadius: 4, height: 10, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: pct === 100 ? "#2d7d46" : "#555",
          borderRadius: 4,
          transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
        {max === 0
          ? "No mentors have rated yet."
          : pct === 100
          ? "All ratings complete — ready to run matching!"
          : `${pct}% complete`}
      </div>
    </div>
  );
}

export default function PairConnect() {
  const [name, setNameState] = useState(getName);
  const [role, setRoleState] = useState(getRole);
  const [maxMentees, setMaxMenteesState] = useState(getMaxMentees);

  // Name picker step
  const [pickedName, setPickedName] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Role picker step
  const [roleChoice, setRoleChoice] = useState("mentee");
  const [maxChoice, setMaxChoice] = useState(2);

  // Pool (all concerns)
  const [pool, setPool] = useState([]);
  const [progress, setProgress] = useState({ totalRatings: 0, uniqueMentors: 0, totalConcerns: 0 });

  // Mentee state
  const [concernText, setConcernText] = useState("");
  const [helpWantedText, setHelpWantedText] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [existingConcern, setExistingConcern] = useState(null);
  const [editingConcern, setEditingConcern] = useState(false);
  const [concernSaving, setConcernSaving] = useState(false);
  const [myMatch, setMyMatch] = useState(null);

  // Mentor state
  const [myRatings, setMyRatings] = useState({});
  const [myMatches, setMyMatches] = useState([]);

  // Consent
  const [consentGiven, setConsentGiven] = useState(getConsent);
  const [consentChecked, setConsentChecked] = useState(false);

  // Matching
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingError, setMatchingError] = useState("");

  // -------------------------------------------------------
  // Pool — shared, always visible, polled
  // -------------------------------------------------------
  const loadPool = useCallback(async () => {
    const { data } = await supabase
      .from("concerns")
      .select("*")
      .order("created_at", { ascending: true });
    setPool(data || []);

    const { data: ratings } = await supabase.from("ratings").select("mentor_name");
    const uniqueMentors = new Set((ratings || []).map((r) => r.mentor_name)).size;
    setProgress({
      totalRatings: (ratings || []).length,
      uniqueMentors,
      totalConcerns: (data || []).length,
    });
  }, []);

  useEffect(() => {
    loadPool();
    const interval = setInterval(loadPool, 3000);
    return () => clearInterval(interval);
  }, [loadPool]);

  // -------------------------------------------------------
  // Load mentee data when name+role known
  // -------------------------------------------------------
  useEffect(() => {
    if (!name || role !== "mentee") return;
    (async () => {
      const { data } = await supabase.from("concerns").select("*").eq("person_name", name).single();
      if (data) {
        setExistingConcern(data);
        setConcernText(data.concern_text);
        setHelpWantedText(data.help_wanted_text);
        setAnonymous(data.anonymous);
      }
      // load match
      if (data) {
        const { data: match } = await supabase
          .from("matches")
          .select("mentor_name")
          .eq("concern_id", data.id)
          .single();
        setMyMatch(match || null);
      }
    })();
  }, [name, role]);

  // -------------------------------------------------------
  // Load mentor data when name+role known
  // -------------------------------------------------------
  useEffect(() => {
    if (!name || role !== "mentor") return;
    loadMentorData();
  }, [name, role]);

  async function loadMentorData() {
    const { data: ratings } = await supabase
      .from("ratings")
      .select("concern_id, score")
      .eq("mentor_name", name);
    const map = {};
    (ratings || []).forEach((r) => { map[r.concern_id] = r.score; });
    setMyRatings(map);

    const { data: matches } = await supabase
      .from("matches")
      .select("*, concerns(person_name, concern_text, help_wanted_text, anonymous)")
      .eq("mentor_name", name);
    setMyMatches(matches || []);
  }

  // -------------------------------------------------------
  // Name selection
  // -------------------------------------------------------
  function confirmName() {
    setName(pickedName);
    setNameState(pickedName);
    setConfirming(false);
  }

  function resetSession() {
    clearSession();
    setNameState(null);
    setRoleState(null);
    setPickedName("");
    setConfirming(false);
    setExistingConcern(null);
    setMyMatch(null);
    setMyMatches([]);
    setMyRatings({});
    setConsentGiven(false);
    setConsentChecked(false);
  }

  // -------------------------------------------------------
  // Consent
  // -------------------------------------------------------
  function confirmConsent() {
    setConsent();
    setConsentGiven(true);
  }

  // -------------------------------------------------------
  // Role selection
  // -------------------------------------------------------
  function confirmRole() {
    setRole(roleChoice);
    setRoleState(roleChoice);
    if (roleChoice === "mentor") {
      setMaxMentees(maxChoice);
      setMaxMenteesState(maxChoice);
    }
  }

  // -------------------------------------------------------
  // Mentee: save concern
  // -------------------------------------------------------
  async function saveConcern() {
    if (!concernText.trim() || !helpWantedText.trim()) return;
    setConcernSaving(true);
    await supabase.from("concerns").upsert(
      { person_name: name, concern_text: concernText, help_wanted_text: helpWantedText, anonymous },
      { onConflict: "person_name" }
    );
    setConcernSaving(false);
    setEditingConcern(false);
    // reload both concern and pool
    const { data } = await supabase.from("concerns").select("*").eq("person_name", name).single();
    setExistingConcern(data || null);
    loadPool();
  }

  // -------------------------------------------------------
  // Mentor: rate concern
  // -------------------------------------------------------
  async function rateConcern(concernId, score) {
    await supabase.from("ratings").upsert(
      { mentor_name: name, concern_id: concernId, score },
      { onConflict: "mentor_name,concern_id" }
    );
    setMyRatings((prev) => ({ ...prev, [concernId]: score }));
  }

  // -------------------------------------------------------
  // Clear everything
  // -------------------------------------------------------
  async function clearAll() {
    if (!window.confirm("Delete all concerns, ratings, and matches? This cannot be undone.")) return;
    const uuid0 = "00000000-0000-0000-0000-000000000000";
    await supabase.from("matches").delete().gt("id", uuid0);
    await supabase.from("ratings").delete().gt("id", uuid0);
    await supabase.from("concerns").delete().gt("id", uuid0);
    setPool([]);
    setProgress({ totalRatings: 0, uniqueMentors: 0, totalConcerns: 0 });
    setMyRatings({});
    setMyMatches([]);
    setExistingConcern(null);
    setMyMatch(null);
    setConcernText("");
    setHelpWantedText("");
    setEditingConcern(false);
  }

  // -------------------------------------------------------
  // Matching
  // -------------------------------------------------------
  async function runMatching() {
    setMatchingLoading(true);
    setMatchingError("");
    try {
      await supabase.from("matches").delete().gt("id", "00000000-0000-0000-0000-000000000000");

      const { data: allConcerns } = await supabase
        .from("concerns")
        .select("*, ratings(*)")
        .order("created_at", { ascending: true });
      const { data: allRatings } = await supabase.from("ratings").select("*");

      if (!allConcerns?.length) { setMatchingError("No concerns yet."); return; }

      // build mentor load map from localStorage for max_mentees
      // We only know max_mentees for the current user; for others we default 2
      // Build mentor capacity map from ratings (all unique mentor names)
      const mentorNames = [...new Set((allRatings || []).map((r) => r.mentor_name))];
      const mentorLoad = {};
      const mentorMax = {};
      mentorNames.forEach((n) => {
        mentorLoad[n] = 0;
        mentorMax[n] = n === name && role === "mentor" ? maxMentees : 2;
      });

      const newMatches = [];

      for (const concern of allConcerns) {
        const concernRatings = (allRatings || []).filter((r) => r.concern_id === concern.id);
        if (!concernRatings.length) continue;

        let candidates = concernRatings
          .map((r) => {
            const mn = r.mentor_name;
            if (mentorLoad[mn] >= mentorMax[mn]) return null;
            return { mentor_name: mn, score: r.score - mentorLoad[mn] };
          })
          .filter(Boolean);

        if (!candidates.length) continue;

        candidates.sort((a, b) => b.score - a.score);
        const topScore = candidates[0].score;
        const tied = candidates.filter((c) => c.score === topScore);
        const pick = tied[Math.floor(Math.random() * tied.length)];

        newMatches.push({ mentor_name: pick.mentor_name, concern_id: concern.id });
        mentorLoad[pick.mentor_name] += 1;
      }

      if (newMatches.length) {
        await supabase.from("matches").insert(newMatches);
      }

      await loadMentorData();
      // reload mentee match if applicable
      if (role === "mentee" && existingConcern) {
        const { data: match } = await supabase
          .from("matches")
          .select("mentor_name")
          .eq("concern_id", existingConcern.id)
          .single();
        setMyMatch(match || null);
      }
    } catch (e) {
      setMatchingError("Matching failed: " + e.message);
    } finally {
      setMatchingLoading(false);
    }
  }

  // -------------------------------------------------------
  // STEP 1: Pick name
  // -------------------------------------------------------
  if (!name) {
    return (
      <div style={{ maxWidth: 500, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
        <Nav name={null} onReset={resetSession} />
        <div style={{ border: "1px solid #ddd", padding: 20, borderRadius: 4 }}>
          {!confirming ? (
            <>
              <strong>Who are you?</strong>
              <div style={{ marginTop: 14 }}>
                <select
                  value={pickedName}
                  onChange={(e) => setPickedName(e.target.value)}
                  style={{ padding: 8, fontSize: 15, width: "100%" }}
                >
                  <option value="">— Select your name —</option>
                  {people.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button
                onClick={() => setConfirming(true)}
                disabled={!pickedName}
                style={{ marginTop: 14, padding: "8px 18px" }}
              >
                That&apos;s me
              </button>
            </>
          ) : (
            <>
              <strong style={{ fontSize: 18 }}>You&apos;re {pickedName}, right?</strong>
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button onClick={confirmName} style={{ padding: "8px 18px" }}>Yes, that&apos;s me</button>
                <button
                  onClick={() => setConfirming(false)}
                  style={{ padding: "8px 18px", background: "none", border: "1px solid #ccc" }}
                >
                  Go back
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 28 }}>
          <strong style={{ fontSize: 14 }}>Mentee Pool</strong>
          <div style={{ marginTop: 10 }}><Pool pool={pool} /></div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // STEP 2: Pick role
  // -------------------------------------------------------
  if (!role) {
    return (
      <div style={{ maxWidth: 500, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
        <Nav name={name} onReset={resetSession} />
        <div style={{ border: "1px solid #ddd", padding: 20, borderRadius: 4 }}>
          <strong>What&apos;s your role?</strong>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="radio" name="role" value="mentee" checked={roleChoice === "mentee"} onChange={() => setRoleChoice("mentee")} />
              Mentee — I want support with something
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="radio" name="role" value="mentor" checked={roleChoice === "mentor"} onChange={() => setRoleChoice("mentor")} />
              Mentor — I want to help others
            </label>
          </div>
          {roleChoice === "mentor" && (
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 14 }}>
                Max mentees I can take on (0–4):&nbsp;
                <input
                  type="number"
                  min={0}
                  max={4}
                  value={maxChoice}
                  onChange={(e) => setMaxChoice(Number(e.target.value))}
                  style={{ width: 48, padding: 4, fontSize: 14 }}
                />
              </label>
            </div>
          )}
          <button onClick={confirmRole} style={{ marginTop: 16, padding: "8px 18px" }}>Continue</button>
        </div>

        <div style={{ marginTop: 28 }}>
          <strong style={{ fontSize: 14 }}>Mentee Pool</strong>
          <div style={{ marginTop: 10 }}><Pool pool={pool} /></div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // STEP 2.5: Consent / confidentiality gate
  // -------------------------------------------------------
  if (!consentGiven) {
    const isMentee = role === "mentee";
    return (
      <div style={{ maxWidth: 500, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
        <Nav name={name} onReset={resetSession} />
        <div style={{ border: "1px solid #ddd", padding: 20, borderRadius: 4 }}>
          <strong style={{ fontSize: 17 }}>{isMentee ? "Before you continue" : "Confidentiality Notice"}</strong>
          <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: "#333" }}>
            {isMentee ? (
              <>
                <p style={{ margin: "0 0 12px 0" }}>
                  Your regulation gaps and previously tracked issues from CAP notes (recorded by Haoqi)
                  will be shared with your matched mentor. This helps your mentor connect your concerns
                  to relevant regulatory guidelines — it&apos;s essential to how this process works.
                </p>
                <p style={{ margin: 0 }}>
                  Please confirm below to continue.
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 12px 0" }}>
                  Mentee concerns shared through this system may include sensitive personal or academic
                  information. By continuing, you agree to keep all mentee information strictly
                  confidential — do not share it outside this mentoring relationship.
                </p>
              </>
            )}
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 18, cursor: "pointer", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span>
              {isMentee
                ? "I understand and consent to my regulation gaps being shared with my mentor"
                : "I agree to keep mentee information confidential"}
            </span>
          </label>
          <button
            onClick={confirmConsent}
            disabled={!consentChecked}
            style={{ marginTop: 18, padding: "8px 18px" }}
          >
            {isMentee ? "Continue" : "I agree, continue"}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // STEP 3a: Mentee main view
  // -------------------------------------------------------
  if (role === "mentee") {
    const hasExisting = !!existingConcern && !editingConcern;
    return (
      <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
        <Nav name={name} onReset={resetSession} />

        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 4, marginBottom: 20 }}>
          {hasExisting ? (
            <>
              <strong>Your concern</strong>
              <div style={{ marginTop: 10, background: "#f9f9f9", padding: 12, borderRadius: 4 }}>
                <div style={{ marginBottom: 6 }}>{existingConcern.concern_text}</div>
                <div style={{ fontSize: 13, color: "#555" }}>Wants help with: {existingConcern.help_wanted_text}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                  Showing in pool as: {existingConcern.anonymous ? "Anonymous" : name}
                </div>
              </div>
              <button onClick={() => setEditingConcern(true)} style={{ marginTop: 10, fontSize: 13, padding: "4px 10px" }}>Edit</button>
            </>
          ) : (
            <>
              <strong>{existingConcern ? "Edit your concern" : "Share your concern"}</strong>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <textarea
                  value={concernText}
                  onChange={(e) => setConcernText(e.target.value)}
                  placeholder="What's on your mind? What's the concern?"
                  rows={3}
                  style={{ padding: 8, fontSize: 14, resize: "vertical" }}
                />
                <textarea
                  value={helpWantedText}
                  onChange={(e) => setHelpWantedText(e.target.value)}
                  placeholder="What kind of help are you looking for?"
                  rows={2}
                  style={{ padding: 8, fontSize: 14, resize: "vertical" }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                  <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                  Post anonymously (default)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveConcern} disabled={concernSaving || !concernText.trim() || !helpWantedText.trim()}>
                    {concernSaving ? "Saving…" : "Save"}
                  </button>
                  {editingConcern && (
                    <button onClick={() => setEditingConcern(false)} style={{ background: "none", border: "1px solid #ccc" }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {existingConcern && (
          <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 4, marginBottom: 20 }}>
            <strong>Your mentor</strong>
            <div style={{ marginTop: 8 }}>
              {myMatch
                ? <span style={{ fontWeight: "bold" }}>{myMatch.mentor_name}</span>
                : <span style={{ color: "#888" }}>Matching hasn&apos;t run yet.</span>}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <strong>Mentee Pool</strong>
          <div style={{ marginTop: 10 }}><Pool pool={pool} /></div>
        </div>

        <RatingProgress progress={progress} />

        <MatchingSection loading={matchingLoading} error={matchingError} onRun={runMatching} onClear={clearAll} />
      </div>
    );
  }

  // -------------------------------------------------------
  // STEP 3b: Mentor main view
  // -------------------------------------------------------
  return (
    <div style={{ maxWidth: 750, margin: "40px auto", fontFamily: "Arial", padding: "0 16px" }}>
      <Nav name={name} onReset={resetSession} />

      <div style={{ marginBottom: 24 }}>
        <strong>Mentee Pool</strong>
        <div style={{ marginTop: 10 }}><Pool pool={pool} /></div>
      </div>

      <RatingProgress progress={progress} />

      <div style={{ marginBottom: 24 }}>
        <strong>Rate concerns (1 = can&apos;t help · 5 = lots of experience + confidence)</strong>
        {pool.length === 0 && (
          <div style={{ color: "#888", fontSize: 14, marginTop: 8 }}>No concerns submitted yet.</div>
        )}
        {pool.map((c) => {
          const displayName = c.anonymous ? "Anonymous" : c.person_name;
          const currentScore = myRatings[c.id];
          return (
            <div key={c.id} style={{ border: "1px solid #ddd", padding: 14, borderRadius: 4, marginTop: 12 }}>
              <div style={{ fontWeight: "bold", marginBottom: 4 }}>{displayName}</div>
              <div style={{ marginBottom: 4 }}>{c.concern_text}</div>
              <div style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
                Wants help with: {c.help_wanted_text}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => rateConcern(c.id, n)}
                    style={{
                      padding: "5px 12px",
                      background: currentScore === n ? "#333" : "#f0f0f0",
                      color: currentScore === n ? "#fff" : "#333",
                      border: "1px solid #ccc",
                      borderRadius: 3,
                      cursor: "pointer",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {myMatches.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <strong>Your matched mentees</strong>
          {myMatches.map((m) => {
            const c = m.concerns;
            const menteeName = c?.person_name || "—";
            return (
              <div key={m.id} style={{ border: "1px solid #ddd", padding: 14, borderRadius: 4, marginTop: 12 }}>
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>{menteeName}</div>
                <div style={{ marginBottom: 4 }}>{c?.concern_text}</div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
                  Wants help with: {c?.help_wanted_text}
                </div>
                <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 13, borderLeft: "3px solid #888" }}>
                  <strong>Meeting guidelines</strong>
                  <div style={{ marginTop: 6, lineHeight: 1.6 }}>{MEETING_GUIDELINES}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MatchingSection loading={matchingLoading} error={matchingError} onRun={runMatching} onClear={clearAll} />
    </div>
  );
}

function MatchingSection({ loading, error, onRun, onClear }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 4 }}>
      <strong>Run Matching</strong>
      <div style={{ marginTop: 10 }}>
        <button onClick={onRun} disabled={loading} style={{ padding: "8px 18px" }}>
          {loading ? "Running…" : "Run Matching"}
        </button>
        {error && <div style={{ color: "red", fontSize: 13, marginTop: 8 }}>{error}</div>}
        <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
          Clears old matches and re-runs. All mentors should rate concerns before running.
        </div>
      </div>
      <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 14 }}>
        <button
          onClick={onClear}
          style={{ padding: "7px 16px", background: "#fff", border: "1px solid #d00", color: "#d00", borderRadius: 3, cursor: "pointer" }}
        >
          Clear Everything
        </button>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 5 }}>
          Wipes all concerns, ratings, and matches. Use to start a fresh pool.
        </div>
      </div>
    </div>
  );
}
