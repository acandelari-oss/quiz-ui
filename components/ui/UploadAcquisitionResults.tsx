import { useTranslation } from 'react-i18next';
import { AcquisitionReport, acquisitionStatus, acquisitionReadingErrors } from '../../utils/uploadAcquisition';

export default function UploadAcquisitionResults({ reports, phase }: { reports: AcquisitionReport[]; phase: string }) {
  // DOUNO registers common.json under i18next's default `translation` namespace.
  const { t } = useTranslation();
  if (!reports.length) return null;
  const reasonLabel = (reason: string) => t(`acquisition.reasons.${reason}`, { defaultValue: reason.replace(/_/g, ' ') });
  return <section aria-live="polite" style={{ boxSizing: 'border-box', width: '100%', maxWidth: 1080, margin: '0 auto 24px', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: 22, padding: 'clamp(20px, 3vw, 30px)', background: 'linear-gradient(135deg, rgba(12, 21, 38, 0.96), rgba(8, 14, 28, 0.94))', color: '#e2e8f0', minWidth: 0, textAlign: 'left', lineHeight: 1.6 }}>
    <h3 style={{ margin: '0 0 16px', color: '#f8fafc', fontSize: 20, fontWeight: 800 }}>{t('acquisition.title')}</h3>
    {reports.map((report, index) => {
      const status = acquisitionStatus(report, phase);
      const visualNotice = report.units.some(unit => unit.reasons.includes('unresolved_visuals')) || report.limitations.some(entry => (typeof entry === 'string' ? entry : entry.reason) === 'unresolved_visuals');
      const affected = report.units
        .map(unit => ({ ...unit, reasons: unit.reasons.filter(reason => reason !== 'unresolved_visuals') }))
        .filter(unit => unit.reasons.length || unit.status === 'blank' || unit.status === 'failed' || unit.better_copy);
      const diagnosticLimitations = report.limitations.filter(entry => (typeof entry === 'string' ? entry : entry.reason) !== 'unresolved_visuals');
      return <div key={index} style={{ paddingTop: index ? 20 : 0, marginTop: index ? 20 : 0, borderTop: index ? '1px solid rgba(148, 163, 184, 0.16)' : undefined, overflowWrap: 'anywhere', minWidth: 0 }}>
        <strong style={{ color: '#f8fafc', fontSize: 16 }}>{report.filename}</strong>
        <p style={{ margin: '6px 0 16px', color: status === 'failed' ? '#fca5a5' : '#36f2ed', fontSize: 14 }}>{t(`acquisition.${status}`)}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 28px', fontSize: 14, marginBottom: 12 }}>
          {report.total !== null && <span>{t(report.unit_kind === 'slide' ? 'acquisition.slidesProcessed' : 'acquisition.pagesProcessed')}: <strong>{report.total}</strong></span>}
          <span>{t('acquisition.readingErrors')}: <strong>{acquisitionReadingErrors(report)}</strong></span>
        </div>
        {report.total === null && <p style={{ color: '#94a3b8', fontSize: 14 }}>{t('acquisition.noPageCount')}</p>}
        {visualNotice && <div style={{ margin: '12px 0', color: '#cbd5e1', fontSize: 14 }}>
          <p style={{ margin: '0 0 8px' }}>{t('acquisition.visualNotice')}</p>
        </div>}
        {(affected.length > 0 || diagnosticLimitations.length > 0) && <details data-acquisition-details="diagnostics" style={{ marginTop: 16, fontSize: 14 }}>
          <summary style={{ cursor: 'pointer', color: '#a5b4fc', fontWeight: 700 }}>{t('acquisition.details')}</summary>
          <ul style={{ paddingLeft: 20, color: '#cbd5e1' }}>
            {affected.map((unit, i) => <li key={i} style={{ marginTop: 8 }}>
              {unit.number !== null ? `${t(`acquisition.${report.unit_kind}`)} ${unit.number}: ` : ''}
              {unit.status === 'blank' && <>{t('acquisition.blank')} </>}
              {unit.status === 'failed' && <>{t('acquisition.failedUnits')}: </>}
              {unit.reasons.map(reasonLabel).join(' ')}
              {unit.better_copy && <> {t('acquisition.betterCopy')}</>}
            </li>)}
            {diagnosticLimitations.map((entry, i) => <li key={`limit-${i}`} style={{ marginTop: 8 }}>
              {typeof entry !== 'string' && entry.unit !== null ? `${t(`acquisition.${report.unit_kind}`)} ${entry.unit}: ` : ''}
              {reasonLabel(typeof entry === 'string' ? entry : entry.reason)}
            </li>)}
          </ul>
        </details>}
      </div>;
    })}
  </section>;
}
