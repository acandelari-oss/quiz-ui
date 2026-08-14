import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../lib/supabase";

const MIN_PASSWORD_LENGTH = 6;

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("Checking your invitation...");
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        setStatus(error.message);
        return;
      }

      if (!data.session) {
        setStatus("This invitation session is no longer active. Please open the invitation link again or log in if you already created a password.");
        return;
      }

      setSessionReady(true);
      setStatus("");
    }

    checkSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (session) {
        setSessionReady(true);
        setStatus("");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function setAccountPassword() {
    const newPassword = password.trim();

    if (!newPassword || !confirmPassword.trim()) {
      setStatus("Please enter and confirm your password.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setStatus(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }

    if (newPassword !== confirmPassword.trim()) {
      setStatus("The passwords do not match.");
      return;
    }

    setLoading(true);
    setStatus("Saving your password...");

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Password created. Opening DOUNO...");
    router.replace("/");
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "radial-gradient(circle at top, rgba(37, 99, 235, 0.18), transparent 34%), #0f172a",
      boxSizing: "border-box"
    }}>
      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96))",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        borderRadius: 20,
        padding: 32,
        boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        boxSizing: "border-box"
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Image
            src="/logodun.png"
            width={190}
            height={52}
            alt="DOUNO"
            style={{ objectFit: "contain" }}
          />
        </div>

        <h1 style={{
          color: "white",
          fontSize: 28,
          lineHeight: 1.15,
          margin: "0 0 10px",
          textAlign: "center"
        }}>
          Create your password
        </h1>

        <p style={{
          color: "#cbd5e1",
          fontSize: 15,
          lineHeight: 1.55,
          margin: "0 0 26px",
          textAlign: "center"
        }}>
          Welcome to the DOUNO private beta. Choose a password so you can sign in normally next time.
        </p>

        <label style={{ display: "block", color: "#e2e8f0", fontSize: 14, marginBottom: 8 }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={!sessionReady || loading}
          autoComplete="new-password"
          placeholder="At least 6 characters"
          style={{
            width: "100%",
            padding: "13px 14px",
            borderRadius: 10,
            border: "1px solid rgba(148, 163, 184, 0.28)",
            background: "rgba(15, 23, 42, 0.78)",
            color: "white",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 16
          }}
        />

        <label style={{ display: "block", color: "#e2e8f0", fontSize: 14, marginBottom: 8 }}>
          Confirm password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={!sessionReady || loading}
          autoComplete="new-password"
          placeholder="Repeat your password"
          onKeyDown={(event) => {
            if (event.key === "Enter" && sessionReady && !loading) {
              setAccountPassword();
            }
          }}
          style={{
            width: "100%",
            padding: "13px 14px",
            borderRadius: 10,
            border: "1px solid rgba(148, 163, 184, 0.28)",
            background: "rgba(15, 23, 42, 0.78)",
            color: "white",
            outline: "none",
            boxSizing: "border-box"
          }}
        />

        <button
          type="button"
          onClick={setAccountPassword}
          disabled={!sessionReady || loading}
          style={{
            width: "100%",
            padding: 14,
            marginTop: 22,
            borderRadius: 12,
            border: "none",
            background: sessionReady && !loading
              ? "linear-gradient(135deg, #7c3aed, #2563eb)"
              : "rgba(148, 163, 184, 0.28)",
            color: "white",
            fontWeight: 700,
            cursor: sessionReady && !loading ? "pointer" : "not-allowed",
            boxShadow: sessionReady && !loading ? "0 14px 32px rgba(37, 99, 235, 0.28)" : "none"
          }}
        >
          {loading ? "Saving..." : "Set password / Continue"}
        </button>

        {status && (
          <p style={{
            color: status.includes("Opening") || status.includes("Saving") ? "#93c5fd" : "#cbd5e1",
            margin: "18px 0 0",
            fontSize: 14,
            lineHeight: 1.45,
            textAlign: "center"
          }}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
