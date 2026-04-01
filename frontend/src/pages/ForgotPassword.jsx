import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post("/auth/forgot-password", { email });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to request reset link");
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
            <p className="rf-auth-title">Reset Password</p>
            <p className="rf-auth-sub">Weka email yako ili tupate kukutumia link ya kubadilisha password.</p>
          </div>
        </div>

        {error ? (
          <div className="rf-empty" style={{ borderColor: "#f8d7da", color: "#8a1a1a", marginBottom: 10 }}>
            {error}
          </div>
        ) : null}

        {done ? (
          <div className="rf-empty" style={{ borderColor: "#d1fae5", color: "#065f46", marginBottom: 10 }}>
            Kama email ipo kwenye mfumo, tumekutumia link ya kubadilisha password. Tafadhali angalia inbox/spam.
          </div>
        ) : null}

        <form className="rf-auth-form" onSubmit={handleSubmit}>
          <input
            name="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading || done}
            required
          />

          <button className="rf-btn rf-btn-primary" type="submit" disabled={loading || done}>
            {loading ? "Sending..." : "Send Reset Link"}
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

