import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../lib/supabase";

export default function LoginPage() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {

    setLoading(true);
    setStatus("Logging in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Login success");
    router.push("/");
  }

  return (

    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background:"#0f172a",
    }}>

      {/* LOGO */}
      <div style={{ marginBottom: 30 }}>
        <Image
          src="/logodun.png"
          width={220}
          height={60}
          alt="StutorX Logo"
        />
      </div>

      {/* LOGIN BOX */}
      <div style={{
  background: "#1e293b",
  paddingTop: 30,
  paddingBottom: 30,
  paddingLeft: 20,
  paddingRight: 20,
  borderRadius: 12,
  width: 380,
  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
  boxSizing: "border-box"
}}>

        <h2 style={{ color: "white", textAlign: "center" }}>
          DO-U-NO Login
        </h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "92%",
            padding: 12,
            marginTop: 15,
            borderRadius: 6,
            border: "none"
          }}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "92%",
            padding: 12,
            marginTop: 10,
            borderRadius: 6,
            border: "none"
          }}
        />

        <button
          onClick={login}
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 20,
            background: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Login
        </button>

        <p style={{
          color: "#cbd5e1",
          marginTop: 20,
          textAlign: "center"
        }}>
          {status}
        </p>

        <div style={{
          marginTop: 22,
          paddingTop: 18,
          borderTop: "1px solid rgba(148, 163, 184, 0.2)",
          color: "#cbd5e1",
          fontSize: 14,
          lineHeight: 1.5,
          textAlign: "center"
        }}>
          <div>DOUNO is currently in private beta.</div>
          <a
            href="https://douno.ai/beta-tester"
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#60a5fa",
              fontWeight: 700,
              textDecoration: "none"
            }}
          >
            Apply for beta access
          </a>
        </div>

      </div>

    </div>

  );
}
