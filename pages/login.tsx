import { useState } from "react";
import { useRouter } from "next/router";
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
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "#0f172a",

    }}>


      <div style={{

        background: "#1e293b",
        padding: 30,
        borderRadius: 10,
        width: 350,

      }}>


        <h2 style={{ color: "white" }}>

          StudyQuiz Login

        </h2>


        <input

          placeholder="Email"

          value={email}

          onChange={(e) => setEmail(e.target.value)}

          style={{

            width: "100%",
            padding: 10,
            marginTop: 10

          }}

        />


        <input

          placeholder="Password"

          type="password"

          value={password}

          onChange={(e) => setPassword(e.target.value)}

          style={{

            width: "100%",
            padding: 10,
            marginTop: 10

          }}

        />


        <button

          onClick={login}

          disabled={loading}

          style={{

            width: "100%",
            padding: 10,
            marginTop: 20,
            background: "#22c55e",
            color: "white",
            border: "none"

          }}

        >

          Login

        </button>


        <button

          onClick={register}

          disabled={loading}

          style={{

            width: "100%",
            padding: 10,
            marginTop: 10,
            background: "#3b82f6",
            color: "white",
            border: "none"

          }}

        >

          Register

        </button>


        <p style={{ color: "white", marginTop: 20 }}>

          {status}

        </p>


      </div>


    </div>

  );

}