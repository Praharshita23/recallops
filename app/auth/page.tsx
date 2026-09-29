"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState("");

  // --------------------------------------------------
  // CHECK EXISTING SESSION
  // --------------------------------------------------

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session) {
        router.replace("/");
        return;
      }

      setCheckingSession(false);
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  // --------------------------------------------------
  // LOGIN / SIGN UP
  // --------------------------------------------------

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setMessage("Please enter email and password.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    // ------------------------------------------------
    // LOGIN
    // ------------------------------------------------

    if (isLogin) {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        console.error("Login error:", error);
        setMessage(error.message);
        setLoading(false);
        return;
      }

      console.log("Login successful:", data.user);

      // Give Supabase a moment to persist the session
      await supabase.auth.getSession();

      router.replace("/");
      router.refresh();

      return;
    }

    // ------------------------------------------------
    // SIGN UP
    // ------------------------------------------------

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.error("Signup error:", error);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    console.log("Signup successful:", data.user);

    if (data.session) {
      setMessage("Account created successfully!");

      router.replace("/");
      router.refresh();

      return;
    }

    setMessage(
      "Account created! Please check your email to confirm your account."
    );

    setLoading(false);
  }

  // --------------------------------------------------
  // LOADING SESSION
  // --------------------------------------------------

  if (checkingSession) {
    return (
      <main style={pageStyle}>
        <div style={authCardStyle}>
          <h1 style={{ margin: 0 }}>RecallOps</h1>

          <p style={{ color: "#777" }}>
            Checking your session...
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main style={pageStyle}>
      <div style={authCardStyle}>

        {/* HEADER */}

        <div style={{ marginBottom: "30px" }}>
          <h1
            style={{
              fontSize: "32px",
              margin: 0,
            }}
          >
            RecallOps
          </h1>

          <p
            style={{
              color: "#777",
              marginTop: "8px",
            }}
          >
            {isLogin
              ? "Welcome back."
              : "Create your RecallOps account."}
          </p>
        </div>

        {/* FORM */}

        <form onSubmit={handleAuth}>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              isLogin ? "current-password" : "new-password"
            }
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Please wait..."
              : isLogin
              ? "Login"
              : "Create Account"}
          </button>

        </form>

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              marginTop: "18px",
              padding: "12px",
              borderRadius: "8px",
              background: "#181818",
              border: "1px solid #292929",
              color: "#ccc",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            {message}
          </div>
        )}

        {/* SWITCH LOGIN / SIGNUP */}

        <div
          style={{
            marginTop: "25px",
            textAlign: "center",
            color: "#777",
            fontSize: "14px",
          }}
        >
          {isLogin
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            onClick={() => {
              setIsLogin((previous) => !previous);
              setMessage("");
              setEmail("");
              setPassword("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "white",
              marginLeft: "6px",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "14px",
            }}
          >
            {isLogin ? "Sign up" : "Login"}
          </button>
        </div>

      </div>
    </main>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#080808",
  color: "white",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};

const authCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "420px",
  background: "#111",
  border: "1px solid #242424",
  borderRadius: "18px",
  padding: "32px",
  boxSizing: "border-box",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  marginBottom: "14px",
  background: "#0b0b0b",
  border: "1px solid #333",
  borderRadius: "9px",
  color: "white",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  background: "white",
  color: "black",
  border: "none",
  borderRadius: "9px",
  fontSize: "15px",
  fontWeight: "600",
};