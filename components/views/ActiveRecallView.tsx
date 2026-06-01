import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import { useTranslation } from 'react-i18next';
import jsPDF from "jspdf"


export default function ActiveRecallView({
  projectId,
  selectedTopics,
  selectedTopic,
  useGlobalKnowledge,
  setUseGlobalKnowledge
}: {
  projectId: string,
  selectedTopics: any[],
  useGlobalKnowledge: boolean,
  setUseGlobalKnowledge: any
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [sessionStarted, setSessionStarted] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [aiAnswer, setAiAnswer] = useState("")
  const [input, setInput] = useState("")
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [answerHistory, setAnswerHistory] = useState<string[]>([])
  const maxQuestions = 5
  const [recording, setRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [topicIndex, setTopicIndex] = useState(0)
  const [questionLoaded, setQuestionLoaded] = useState(false)

  // --- LOGICA TOPICS ---
  const topicsToUse =
    selectedTopics && selectedTopics.length > 0
      ? selectedTopics
      : selectedTopic
      ? [selectedTopic]
      : ["__ALL__"];

  const normalizedTopics = topicsToUse.map(t => {
    const value = typeof t === 'object' && t !== null ? (t.topic || t.value) : t;
    return String(value || "__ALL__").trim();
  });

  const isAllMode = normalizedTopics.includes("__ALL__");

  // --- HELPER ---
  function ensureString(value: any) {
    if (typeof value === "string") return value
    if (value == null) return ""
    return String(value)
  }
  const { t: translate, i18n } = useTranslation();
  function downloadSessionPDF() {

    const doc = new jsPDF()
    const logo = new Image()

    logo.src = "/logoSTXd.png"

    const selectedTopicName =
      selectedTopics?.length > 0
        ? (
            typeof selectedTopics[0] === "string"
              ? selectedTopics[0]
              : selectedTopics[0]?.topic
          )
        : "Full Project Review"

    let y = 20

    // ===== LOGO =====

    doc.addImage(
      logo,
      "PNG",
      20,
      14,
      38,
      16
    )

    // ===== TITLE =====

    doc.setFontSize(24)

    doc.setTextColor(15, 15, 15)

    doc.text(
      "ORAL EXAM SESSION",
      20,
      52
    )

    // ===== INFO =====

    doc.setFontSize(12)

    doc.setTextColor(40, 40, 40)

    doc.text(
      `Topic: ${selectedTopicName}`,
      20,
      72
    )

    doc.text(
      `Date: ${new Date().toLocaleString()}`,
      20,
      82
    )

    // ===== DIVIDER =====

    doc.setDrawColor(180)

    doc.line(
      20,
      94,
      190,
      94
    )

    // ===== START CONTENT =====

    y = 110

    // CHAT CONTENT
    messages.forEach((msg: any) => {

      const role =
        msg.role === "user"
          ? "YOUR ANSWER"
          : "AI"

      doc.setFontSize(13)

      doc.setTextColor(30, 30, 30)

      doc.text(`${role}:`, 20, y)

      y += 7

      const splitText = doc.splitTextToSize(
        msg.content,
        170
      )

      doc.setFontSize(11)

      doc.setTextColor(60, 60, 60)

      doc.text(splitText, 20, y)

      y += splitText.length * 6

      y += 10

      // PAGE BREAK
      if(y > 250){

        // FOOTER
        doc.setFontSize(10)

        doc.setTextColor(120, 120, 120)

        doc.text(
          "Generated with StutorX AI • www.stutorx.com",
          20,
          285
        )

        doc.addPage()

        y = 20
      }

    })

    // FINAL FOOTER
    doc.setFontSize(10)

    doc.setTextColor(120, 120, 120)

    doc.text(
      "Generated with StutorX AI • www.stutorx.com",
      20,
      285
    )

    doc.save(
      `oral_exam_${selectedTopicName}.pdf`
    )
  }
  const hasFetchedRef = useRef(false);

  // --- FUNZIONE: GENERATE QUESTION ---
  async function generateQuestion() {
    if (loading || questionCount >= maxQuestions) return;
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const { data: { session } } = await supabase.auth.getSession();

      // COSTRUIAMO IL PAYLOAD IN MODO CHE PYTHON SIA FELICE
      const payload = {
        index: questionCount,
        // Se è isAllMode, mandiamo ["__ALL__"] invece di [] o null.
        // Se il backend crasha ancora con [], questa stringa evita il crash 
        // perché la lista NON è None e NON è vuota.
        use_global_knowledge: useGlobalKnowledge,
        topics: isAllMode ? ["__ALL__"] : normalizedTopics,
        language: i18n.language === "it"
          ? "Italian"
          : "English"
      };
      console.log(
        "🌍 ACTIVE RECALL LANGUAGE:",
        i18n.language
      );
      console.log("📤 TENTATIVO PAYLOAD FINALE:", payload);
      
      const res = await fetch(`${apiUrl}/projects/${projectId}/active_recall_question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();

      if (data && data.question) {
        const questionText = String(data.question);
        
        if (questionText.toLowerCase().includes("no context found") || questionText.toLowerCase().includes("no topics available")) {
          setMessages(prev => [...prev, { 
            role: "assistant", 
            content: translate('stats.no_material'),
            topic: "System"
          }]);
        } else {
          setMessages(prev => [...prev, { 
            role: "assistant", 
            content: questionText,  
            topic: isAllMode ? "Generale" : (normalizedTopics[0] || "Specifico") 
          }]);
          setCurrentQuestion(questionText);
          setQuestionCount(prev => prev + 1);
        }
      }

    } catch (e) {
      console.error("❌ Errore generateQuestion:", e);
    } finally {
      setLoading(false);
      setShowAnswer(false);
      setInput("");
    }
  }

  // --- FUNZIONE: SUBMIT ANSWER (Ripristinata) ---
  async function submitAnswer() {
    if (!input.trim() || loading) return;
    
    setLoading(true);
    const userMessage = input;
    
    // Add user message to the chat
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      // URL mapped to your backend: @app.post("/active_recall_evaluate")
      const res = await fetch(`${apiUrl}/active_recall_evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          question: currentQuestion,
          student_answer: userMessage, // Matches 'req.student_answer' in Python
          history: messages.map(m => `${m.role}: ${m.content}`).slice(-5)
        })
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      
      // Formatting the evaluation response in English
      const evaluationHeader = `Evaluation: ${data.evaluation.toUpperCase()}`;
      const feedbackBody = data.feedback || "No feedback provided.";
      const explanationPart = data.explanation ? `\n\nExplanation: ${data.explanation}` : "";
      const hintPart = data.hint ? `\n\n💡 Hint: ${data.hint}` : "";

      const finalContent = `${evaluationHeader}\n\n${feedbackBody}${explanationPart}${hintPart}`;

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: finalContent,
        topic: "Evaluation"
      }]);
      
    } catch (e) {
      console.error("❌ Error in submitAnswer:", e);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: translate('stats.An error occurred while evaluating your answer. Please try again.'),

      }]);
    } finally {
      setLoading(false);
      setInput("");
    }
  }

  // --- FUNZIONE: FETCH ANSWER (Corretta) ---
  async function fetchAnswer() {
    if (!currentQuestion) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          question: `Explain me the right answer: ${currentQuestion}`,
          topics: isAllMode ? [] : normalizedTopics,
          history: messages.slice(-4)
        })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `${translate('stats.suggested_answer')}: ${data.answer}`,
        topic: translate('stats.suggestion_label') 
      }]);
    } catch (e) {
      console.error("❌ Errore fetchAnswer:", e);
    } finally {
      setLoading(false);
    }
  }

  // --- AUDIO LOGIC ---
  function startRecording() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech not supported");

    const recog = new SpeechRecognition();
    recog.lang = "it-IT";
    recog.onresult = (event: any) => setInput(prev => prev + " " + event.results[0][0].transcript);
    recog.onend = () => setRecording(false);
    setRecognition(recog);
    setRecording(true);
    recog.start();
  }

  function toggleRecording() {
    if (recording) { recognition?.stop(); setRecording(false); }
    else { startRecording(); }
  }

  // --- EFFECTS ---
  useEffect(() => {
    if (!projectId || normalizedTopics.length === 0) return;
    if (hasFetchedRef.current) return;

    hasFetchedRef.current = true;
    setSessionStarted(true);
    generateQuestion();
  }, [projectId]);

  const handleNext = () => generateQuestion();

  // --- RENDERING ---
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", color: "white", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>{translate('stats.Memory Check Trainer')}</h3>
        <div style={{
          background: "#f59e0b",
          color: "white",
          padding: "6px 14px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "bold"
        }}>
          {isAllMode ? "MODUS: FULL PROJECT" : `TOPIC: ${normalizedTopics[0]}`}
        </div>
      </div>
      <div style={{
        marginBottom: '15px',
        padding: '10px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        border: '1px solid #374151'
      }}>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>

            <span style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#22c55e'
            }}>
              Search Mode: {
                useGlobalKnowledge
                  ? "Global AI Knowledge"
                  : "Strict Document Search"
              }
            </span>

            <span style={{
              fontSize: '11px',
              color: '#9ca3af'
            }}>
              {
                useGlobalKnowledge
                  ? "The AI can expand beyond your uploaded material."
                  : "The AI uses ONLY your uploaded study material."
              }
            </span>

          </div>

          <div
            onClick={() =>
              setUseGlobalKnowledge(!useGlobalKnowledge)
            }
            style={{
              width: '44px',
              height: '22px',
              backgroundColor: useGlobalKnowledge
                ? '#10b981'
                : '#4b5563',
              borderRadius: '20px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
              flexShrink: 0
            }}
          >

            <div style={{
              width: '18px',
              height: '18px',
              backgroundColor: 'white',
              borderRadius: '50%',
              position: 'absolute',
              top: '2px',
              left: useGlobalKnowledge
                ? '24px'
                : '2px',
              transition: 'left 0.3s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />

          </div>

        </div>

      </div>
      
      <div style={{ flex: 1, overflowY: "auto", marginBottom: 20 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            background: m.role === "user" ? "#2FA4A9" : "#1f2937",
            padding: 15,
            borderRadius: 10,
            marginBottom: 15,
            maxWidth: "85%",
            marginLeft: m.role === "user" ? "auto" : "0"
          }}>
            <strong>{m.role === "assistant" ? "AI:" : "Tu:"}</strong>
            {m.topic && <div style={{ fontSize: "11px", color: "#2FA4A9" }}>Focus: {m.topic}</div>}
            <p style={{ marginTop: 5 }}>{m.content}</p>
          </div>
        ))}
        {loading && <p>{translate('stats.Thinking...')}</p>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          style={{ background: "#111827", color: "white", padding: 10, borderRadius: 8, border: "1px solid #374151" }}
          placeholder={translate('stats.Write your answer...')}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={toggleRecording} style={{ background: recording ? "#ef4444" : "#111827", border: "1px solid #374151", color: "white", padding: 10, borderRadius: 5 }}>
            {recording ? "⏹️" : "🎙️"}
          </button>
          <button onClick={submitAnswer} style={{ background: "#2FA4A9", color: "white", padding: 10, borderRadius: 5, flex: 1 }}>
            {translate('stats.Submit Answer')}
          </button>
          <button onClick={fetchAnswer} style={{ background: "#ef4444", color: "white", padding: 10, borderRadius: 5 }}>
            {translate('stats.Show answer')}  
          </button>
          {questionCount < maxQuestions && (
            <button onClick={handleNext} style={{ background: "#374151", color: "white", padding: 10, borderRadius: 5 }}>
              {translate('stats.Next question')}
            </button>
          
          )}
          <button
            onClick={downloadSessionPDF}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "8px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13
            }}
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}