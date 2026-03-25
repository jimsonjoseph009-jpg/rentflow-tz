import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosConfig";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("user")) {
      const userRaw = localStorage.getItem("user");
      const role = userRaw ? JSON.parse(userRaw)?.role : null;
      navigate(role === "tenant" ? "/tenant" : "/dashboard", { replace: true });
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
      const res = await axios.post("/auth/login", form);

      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate(res.data?.user?.role === "tenant" ? "/tenant" : "/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Login failed");
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
            <p className="rf-auth-title">RentFlow-TZ</p>
            <p className="rf-auth-sub">Login to manage properties, tenants, and payments.</p>
          </div>
        </div>

        {error ? (
          <div className="rf-empty" style={{ borderColor: "#f8d7da", color: "#8a1a1a", marginBottom: 10 }}>
            {error}
          </div>
        ) : null}

        <form className="rf-auth-form" onSubmit={handleSubmit}>
          <input name="email" placeholder="Email" value={form.email} onChange={handleChange} autoComplete="email" />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
          />
          <button className="rf-btn rf-btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="rf-auth-actions">
          <p style={{ margin: 0, color: "var(--rf-muted)", fontSize: 13 }}>Hamna account?</p>
          <button type="button" className="rf-auth-linkbtn" onClick={() => navigate("/register")}>
            Jifungue hapa
          </button>
        </div>
      </div>
    </div>
  );
}
