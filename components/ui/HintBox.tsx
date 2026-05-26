export default function HintBox({
  text
}:{
  text:string
}) {

  return (

    <div style={{
      marginBottom: 20,
      padding: 14,
      borderRadius: 10,
      background: "rgba(34,197,94,0.08)",
      border: "1px solid rgba(34,197,94,0.25)",
      color: "#ffffff",
      fontSize: 18,
      lineHeight: 1.6
    }}>

      <b style={{
        color: "#22c55e"
      }}>
        💡 Study tip
      </b>

      <div style={{
        marginTop: 6
      }}>
        {text}
      </div>

    </div>

  )

}