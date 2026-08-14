import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../../lib/supabase";

type ConfirmationState = "verifying" | "error";

function getSingleQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default function AuthConfirmPage() {
  const router = useRouter();
  const [state, setState] = useState<ConfirmationState>("verifying");
  const [message, setMessage] = useState("Confirming your DOUNO invitation...");

  useEffect(() => {
    if (!router.isReady) return;

    let active = true;

    async function confirmInvitation() {
      const tokenHash = getSingleQueryValue(router.query.token_hash);
      const type = getSingleQueryValue(router.query.type);

      if (!tokenHash || type !== "invite") {
        if (!active) return;
        setState("error");
        setMessage("This invitation link is invalid. Please use the latest invitation email or contact DOUNO support.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "invite"
      });

      if (!active) return;

      if (error) {
        setState("error");
        setMessage(error.message || "This invitation is invalid or has expired. Please request a new invitation.");
        return;
      }

      router.replace("/set-password");
    }

    confirmInvitation();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "radial-gradient(circle at top, rgba(124, 58, 237, 0.18), transparent 34%), #0f172a",
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
        boxSizing: "border-box",
        textAlign: "center"
      }}>
        <div style={{ marginBottom: 28 }}>
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
          margin: "0 0 10px"
        }}>
          {state === "verifying" ? "Confirming invitation" : "Invitation problem"}
        </h1>

        <p style={{
          color: "#cbd5e1",
          fontSize: 15,
          lineHeight: 1.55,
          margin: "0"
        }}>
          {message}
        </p>

        {state === "verifying" && (
          <div style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "3px solid rgba(96, 165, 250, 0.22)",
            borderTopColor: "#60a5fa",
            margin: "26px auto 0",
            animation: "dounoSpin 0.9s linear infinite"
          }} />
        )}

        {state === "error" && (
          <button
            type="button"
            onClick={() => router.push("/login")}
            style={{
              width: "100%",
              padding: 14,
              marginTop: 24,
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 14px 32px rgba(37, 99, 235, 0.28)"
            }}
          >
            Back to login
          </button>
        )}

        <style jsx>{`
          @keyframes dounoSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
