import { useState } from "react";

async function safeRead(res: Response) {
  const raw = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(raw), raw };
  } catch {
    return { ok: res.ok, status: res.status, json: null, raw };
  }
}

type UploadRow = {
  name: string;
  status: "queued" | "uploading" | "success" | "failed";
  error?: string;
};

export default function Home() {
  const [status, setStatus] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");

  // Files selection + upload UI
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([]);
  const [uploadSummary, setUploadSummary] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);

  // Uploaded docs list
  const [documents, setDocuments] = useState<any[]>([]);

  // Quiz settings
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [language, setLanguage] = useState<"English" | "Italian">("English");

  // Quiz
  const [quiz, setQuiz] = useState<any[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // -------------------------
  // Helpers
  // -------------------------
  async function loadDocuments(pid: string) {
    if (!pid) return;

    const res = await fetch(`/api/list-documents?project_id=${encodeURIComponent(pid)}`);
    const r = await safeRead(res);

    if (!r.ok) {
      setStatus(`Error listing documents (${r.status}): ${r.json ? JSON.stringify(r.json) : r.raw}`);
      return;
    }

    setDocuments(r.json?.documents || []);
  }

  // -------------------------
  // Create project
  // -------------------------
  async function createProject() {
    setStatus("Creating project...");
    setQuiz(null);
    setDocuments([]);
    setSelectedFiles([]);
    setUploadRows([]);
    setUploadSummary("");
    setAnswers({});
    setScore(null);
    setExpanded({});

    const res = await fetch("/api/create-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Study Project" }),
    });

    const r = await safeRead(res);

    if (!r.ok) {
      setStatus(`Error creating project (${r.status}): ${r.json ? JSON.stringify(r.json) : r.raw}`);
      return;
    }

    const pid = r.json?.project_id;
    if (!pid) {
      setStatus(`Create project returned no project_id. Raw: ${r.raw}`);
      return;
    }

    setProjectId(pid);
    setStatus("Project created ✅");
    await loadDocuments(pid);
  }

  // -------------------------
  // Select files (no auto-upload)
  // -------------------------
  function onChooseFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const arr = Array.from(files);
    setSelectedFiles(arr);

    // Show queued rows
    setUploadRows(arr.map((f) => ({ name: f.name, status: "queued" })));
    setUploadSummary(`${arr.length} file(s) selected. Click Upload to start.`);

    // reset input
    e.target.value = "";
  }

  // -------------------------
  // Upload button
  // -------------------------
  async function uploadSelectedFiles() {
    if (!projectId) {
      setStatus("Create a project first.");
      return;
    }
    if (selectedFiles.length === 0) {
      setUploadSummary("No files selected.");
      return;
    }

    setUploading(true);
    setUploadSummary("Uploading...");
    setUploadRows((prev) => prev.map((r) => ({ ...r, status: "uploading", error: undefined })));

    try {
      const fd = new FormData();
      fd.append("project_id", projectId);
      for (const f of selectedFiles) fd.append("files", f);

      const res = await fetch("/api/upload-files", {
        method: "POST",
        body: fd,
      });

      const r = await safeRead(res);

      if (!r.ok) {
        setUploadSummary(`Upload failed (${r.status}): ${r.json ? JSON.stringify(r.json) : r.raw}`);
        setUploadRows((prev) => prev.map((row) => ({ ...row, status: "failed", error: r.raw })));
        return;
      }

      const results: Array<{ file: string; status: string; error?: string }> = r.json?.results || [];

      // map result per file
      setUploadRows((prev) =>
        prev.map((row) => {
          const match = results.find((x) => x.file === row.name);
          if (!match) return { ...row, status: "failed", error: "No result returned for this file." };
          if (match.status === "success") return { ...row, status: "success" };
          return { ...row, status: "failed", error: match.error || "Unknown error" };
        })
      );

      const okCount = results.filter((x) => x.status === "success").length;
      const failCount = results.filter((x) => x.status !== "success").length;
      setUploadSummary(`Upload complete ✅  Success: ${okCount}, Failed: ${failCount}`);

      // refresh backend documents list
      await loadDocuments(projectId);
    } finally {
      setUploading(false);
    }
  }

  // -------------------------
  // Generate quiz
  // -------------------------
  async function generateQuiz() {
    if (!projectId) {
      setStatus("Create a project first.");
      return;
    }

    setStatus("Generating quiz...");
    setQuiz(null);
    setAnswers({});
    setScore(null);
    setExpanded({});

    const res = await fetch("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        num_questions: numQuestions,
        difficulty,
        language,
        group_by_macro_topics: false,
        answers_at_end: false,
      }),
    });

    const r = await safeRead(res);

    if (!r.ok) {
      // QUI VEDRAI L’ERRORE VERO
      setStatus(`Error generating quiz (${r.status}): ${r.json ? JSON.stringify(r.json) : r.raw}`);
      return;
    }

    const questions = r.json?.questions;
    if (!Array.isArray(questions)) {
      setStatus(`Backend did not return questions[]. Raw: ${r.raw}`);
      return;
    }

    setQuiz(questions);
    setStatus("Quiz ready ✅");
  }

  function submitQuiz() {
    if (!quiz) return;
    let correct = 0;
    quiz.forEach((q: any, i: number) => {
      if (answers[i] === q.correct_answer) correct++;
    });
    setScore(correct);
  }

  function toggleExpand(i: number) {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  // -------------------------
  // UI
  // -------------------------
  return (
    <div style={{ padding: 40, fontFamily: "Arial, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Medical Quiz Generator</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
        <button onClick={createProject}>Create Project</button>

        <div style={{ marginTop: 10 }}>
          <b>Status:</b> {status}
        </div>

        <div style={{ marginTop: 6, color: "#555" }}>
          <b>Project ID:</b> {projectId || "(none yet)"}
        </div>
      </div>

      {projectId && (
        <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Upload files</h2>

          <input type="file" multiple accept=".pdf,.txt" onChange={onChooseFiles} disabled={uploading} />

          <div style={{ marginTop: 10 }}>
            <button onClick={uploadSelectedFiles} disabled={uploading || selectedFiles.length === 0}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <b>Upload status:</b> {uploadSummary || "(select files first)"}
          </div>

          {uploadRows.length > 0 && (
            <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
              {uploadRows.map((r) => (
                <div key={r.name} style={{ padding: "6px 0", borderBottom: "1px solid #f2f2f2" }}>
                  <b>{r.name}</b>{" "}
                  <span style={{ marginLeft: 8 }}>
                    {r.status === "queued" && "Queued"}
                    {r.status === "uploading" && "Uploading..."}
                    {r.status === "success" && "✅ Success"}
                    {r.status === "failed" && "❌ Failed"}
                  </span>
                  {r.status === "failed" && r.error && (
                    <div style={{ color: "crimson", marginTop: 4, whiteSpace: "pre-wrap" }}>{r.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <h3 style={{ marginTop: 16 }}>Uploaded files (from backend)</h3>
          {documents.length === 0 ? <div style={{ color: "#666" }}>(No files yet)</div> : null}
          {documents.map((d: any, i: number) => (
            <div key={i}>{d.title ?? d.filename ?? JSON.stringify(d)}</div>
          ))}
        </div>
      )}

      {projectId && (
        <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Quiz settings</h2>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <label>
              Difficulty:&nbsp;
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}>
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </label>

            <label>
              Questions:&nbsp;
              <input
                type="number"
                min={1}
                max={200}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                style={{ width: 80 }}
              />
            </label>

            <label>
              Language:&nbsp;
              <select value={language} onChange={(e) => setLanguage(e.target.value as any)}>
                <option value="English">English</option>
                <option value="Italian">Italian</option>
              </select>
            </label>

            <button onClick={generateQuiz}>Generate quiz</button>
          </div>
        </div>
      )}

      {quiz && (
        <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Quiz</h2>

          {quiz.map((q: any, i: number) => (
            <div key={i} style={{ marginTop: 18, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>
                {i + 1}. {q.question}
              </h3>

              {q.options?.map((opt: string, j: number) => (
                <div key={j}>
                  <label>
                    <input
                      type="radio"
                      name={`q${i}`}
                      checked={answers[i] === opt}
                      onChange={() => setAnswers((prev) => ({ ...prev, [i]: opt }))}
                    />
                    &nbsp;{opt}
                  </label>
                </div>
              ))}

              {score !== null && (
                <>
                  <p>
                    <b>Correct answer:</b> {q.correct_answer}
                  </p>

                  <p>
                    <b>Source:</b> {q.source_file ?? "(not provided)"} | <b>Page:</b> {q.source_page ?? "(not provided)"}
                  </p>

                  <p>
                    <b>Explanation:</b>{" "}
                    {expanded[i] ? q.explanation : (q.explanation || "").slice(0, 160)}
                    {(q.explanation || "").length > 160 ? "..." : ""}
                  </p>

                  <button onClick={() => toggleExpand(i)}>
                    {expanded[i] ? "Collapse" : "Expand explanation"}
                  </button>
                </>
              )}
            </div>
          ))}

          {score === null ? (
            <button style={{ marginTop: 18 }} onClick={submitQuiz}>
              Submit quiz
            </button>
          ) : (
            <h2 style={{ marginTop: 18 }}>
              SCORE: {score} / {quiz.length}
            </h2>
          )}
        </div>
      )}
    </div>
  );
}