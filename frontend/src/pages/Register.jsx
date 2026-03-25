import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "landlord",
  });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (localStorage.getItem("user")) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post("/auth/register", form);
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Registration failed");
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
            <p className="rf-auth-title">Create Account</p>
            <p className="rf-auth-sub">Start managing rentals with a clean, modern dashboard.</p>
          </div>
        </div>

        {error ? (
          <div className="rf-empty" style={{ borderColor: "#f8d7da", color: "#8a1a1a", marginBottom: 10 }}>
            {error}
          </div>
        ) : null}

        <form className="rf-auth-form" onSubmit={handleSubmit}>
          <input name="name" placeholder="Full name" value={form.name} onChange={handleChange} autoComplete="name" />
          <input name="email" placeholder="Email" value={form.email} onChange={handleChange} autoComplete="email" />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
          />
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="landlord">Landlord</option>
            <option value="tenant">Tenant</option>
          </select>
          <button className="rf-btn rf-btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </button>
        </form>

        <div className="rf-auth-actions">
          <p style={{ margin: 0, color: "var(--rf-muted)", fontSize: 13 }}>Una account tayari?</p>
          <button type="button" className="rf-auth-linkbtn" onClick={() => navigate("/login")}>
            Ingia hapa
          </button>
        </div>
      </div>
    </div>
  );
}
