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
      borderRadius: 10,
      background: "#052b2a",
      border: "1px solid #0e6c69",
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
