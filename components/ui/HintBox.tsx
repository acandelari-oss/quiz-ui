import { useTranslation } from 'react-i18next';
export default function HintBox({

  
  text
}:{
  text:string
}) {
const { t: translate } = useTranslation();
  return (

    <div style={{
      marginBottom: 20,
      padding: 14,
      borderRadius: 16,
      background: "linear-gradient(135deg, rgba(12, 21, 38, 0.94), rgba(8, 14, 28, 0.92))",
      border: "1px solid rgba(47, 164, 255, 0.22)",
      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
      color: "#ffffff",
      fontSize: 18,
      lineHeight: 1.6
    }}>

      <b style={{
        color: "#36F2ED"
      }}>
        {translate('stats.💡 Study tip')}
      </b>

      <div style={{
        marginTop: 6
      }}>
        {text}
      </div>

    </div>

  )
  
}
