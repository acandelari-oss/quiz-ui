export default function QuizView({
  quiz,
  answers,
  selectAnswer,
  finished,
  started,
  submitQuiz,
  score,
  expanded,
  setExpanded,
  generatingQuiz,
  formatTime,
  answeredCount
}: any) {

return (

<div style={quizBox}>

{generatingQuiz && (
  <div style={{
    display:"flex",
    alignItems:"center",
    gap:10,
    marginBottom:20,
    fontWeight:600
  }}>
    
    <div style={{
      width:18,
      height:18,
      border:"3px solid #e5e7eb",
      borderTop:"3px solid #2FA4A9",
      borderRadius:"50%",
      animation:"spin 1s linear infinite"
    }}/>

    Generating quiz...
  </div>
)}

{quiz.map((q:any,i:number)=>{

  return (
    <div key={i} style={question}>

      <h3>{i+1}. {q.question}</h3>

      {(q.options || []).map((opt:string,j:number)=>{

        const selected = answers[i] === opt;

        const correctRaw = (q.correct ?? "").toString().trim();
        const optTextNorm = opt?.toString().trim().toLowerCase();
        const correctTextNorm = correctRaw.toLowerCase();
        const optLetter = String.fromCharCode(65 + j);

        const correct =
          correctTextNorm === optTextNorm ||
          correctRaw === optLetter ||
          String(Number(correctRaw)) === String(j);

        let color = "#020617"

        if (finished) {
          if (correct) color = "#065f46"
          if (selected && !correct) color = "#7f1d1d"
        } else {
          if (selected) color = "#1f2937"
        }

        if (finished) {
          if (correct) color = "#2FA4A9";
          if (selected && !correct) color = "#ff6b6b";
        } else {
          if (selected) color = "#2FA4A9";
        }

        return(
          <div
          key={j}
          onClick={()=>selectAnswer(i,opt)}
          style={{
          display:"flex",
          alignItems:"center",
          gap:10,
          padding:"10px 12px",
          marginTop:6,
          cursor:"pointer",
          borderRadius:8,
          border:"1px solid #374151",
          background: color,
          color:"white",
          transition:"all 0.15s"
          }}
          >
          <span
          style={{
          fontWeight:600,
          color:"#9ca3af",
          minWidth:18
          }}
          >
          {String.fromCharCode(65+j)}
          </span>

          <span>
          {opt}
          </span>

          </div>
        );
      })}

      {finished && (

      <div style={{
      marginTop:10,
      background:"#020617",
      padding:12,
      borderRadius:8,
      border:"1px solid #374151",
      fontSize:14
      }}>

      <div style={{color:"#2FA4A9",marginBottom:6,fontWeight:600}}>
      Explanation
      </div>

      <div style={{color:"#d1d5db"}}>
      {q.explanation}
      </div>

      {q.explanation_long && (

      <div style={{
      marginTop:6,
      color:"#9ca3af",
      fontSize:13
      }}>
      {q.explanation_long}
      </div>

      )}

      {q.source_document && (

      <div style={{
      marginTop:8,
      fontSize:12,
      color:"#6b7280"
      }}>
      Source: {q.source_document} – page {q.source_page}
      </div>

      )}

      </div>

      )}

      </div>
  );
})}

{started && !finished && (
  <button
    onClick={submitQuiz}
    style={{ ...button, marginTop: 20 }}
  >
    Submit Quiz
  </button>
)}

{finished && (
  <div style={{ marginTop: 20 }}>
    <h2>Score: {score()} / {quiz.length}</h2>
  </div>
)}

</div>

);
}

const quizBox = {
  background:"#111827",
  border:"1px solid #374151",
  color:"white",
  padding: 35,
  borderRadius: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
};

const question = {
  marginBottom: 20
};

const button = {
  marginTop: 10,
  background: "#2FA4A9",
  color: "white",
  padding: "10px 14px",
  border: "none",
  borderRadius: 6,
  cursor: "pointer"
};

const title = {
color:"white",
marginBottom:10
}