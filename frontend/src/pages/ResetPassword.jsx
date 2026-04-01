import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig";

export default function ResetPassword() {
  const navigate = useNavigate();
  const token = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get("token") || "";
    } catch {
      return "";
    }
  }, []);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link (missing token).");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rf-auth">
      <div className="rf-auth-card rf-reveal" style={{ "--delay": "40ms" }}>
        <div className="rf-auth-head">
          <div className="rf-auth-mark" aria-hidden="true">RF</div>
          <div style={{ minWidth: 0 }}>
            <p className="rf-auth-title">Set New Password</p>
            <p className="rf-auth-sub">Weka password mpya ya account yako.</p>
          </div>
        </div>

        {error ? (
          <div className="rf-empty" style={{ borderColor: "#f8d7da", color: "#8a1a1a", marginBottom: 10 }}>
            {error}
          </div>
        ) : null}

        {done ? (
          <div className="rf-empty" style={{ borderColor: "#d1fae5", color: "#065f46", marginBottom: 10 }}>
            Password imebadilika. Unaelekezwa kwenye login...
          </div>
        ) : null}

        <form className="rf-auth-form" onSubmit={handleSubmit}>
          <input
            name="password"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading || done}
            required
          />
          <input
            name="confirm"
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            disabled={loading || done}
            required
          />

          <button className="rf-btn rf-btn-primary" type="submit" disabled={loading || done}>
            {loading ? "Saving..." : "Reset Password"}
          </button>
        </form>

        <div className="rf-auth-actions">
          <button type="button" className="rf-auth-linkbtn" onClick={() => navigate("/login")}>
            Rudi Login
          </button>
        </div>
      </div>
    </div>
  );
}

