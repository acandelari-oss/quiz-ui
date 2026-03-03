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

  async function register() {

    setLoading(true);
    setStatus("Creating account...");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Account created. Check your email.");
  }

  return (

    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "linear-gradient(#ffffff,#88bcbf,#203a43,#2c5364)",
    }}>

      {/* LOGO */}
      <div style={{ marginBottom: 30 }}>
        <Image
          src="/logo.png"
          width={220}
          height={140}
          alt="StudyQuiz Logo"
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
          StudyQuiz Login
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

        <button
          onClick={register}
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 10,
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Register
        </button>

        <p style={{
          color: "#cbd5e1",
          marginTop: 20,
          textAlign: "center"
        }}>
          {status}
        </p>

      </div>

    </div>

  );
}