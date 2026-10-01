import { useTranslation } from "react-i18next"

export default function OralAudioToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  const { t } = useTranslation()
  return <button type="button" role="switch" aria-checked={enabled} aria-label={t("oralAudio.label")} onClick={() => onChange(!enabled)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", marginTop: 12, padding: "10px 12px", border: "1px solid #374151", borderRadius: 8, background: "#111827", color: "white", cursor: "pointer" }}>
    <span>{t("oralAudio.label")}</span>
    <span style={{ color: enabled ? "#7dd3fc" : "#9ca3af" }}>{t(enabled ? "oralAudio.on" : "oralAudio.off")}</span>
  </button>
}
