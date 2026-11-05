export type AcquisitionReport = {
  document_id?: string; filename: string; module_id: string; unit_kind: 'page' | 'slide' | 'document';
  total: number | null; acquired: number; partial: number; failed: number; blank: number;
  status: 'completed' | 'completed_with_warnings' | 'failed'; accepted: boolean;
  units: { number: number | null; status: string; reasons: string[]; better_copy: boolean }[];
  limitations: (string | { reason: string; unit: number | null })[];
}
export function acquisitionReports(stream: string): AcquisitionReport[] {
  const reports = new Map<string, AcquisitionReport>();
  for (const line of stream.split('\n').slice(0, -1)) {
    if (!line.startsWith('ACQUISITION_REPORT|')) continue;
    try {
      const report = JSON.parse(line.slice('ACQUISITION_REPORT|'.length));
      if (typeof report.filename === 'string' && Array.isArray(report.units)) {
        reports.set(report.document_id || report.filename, report);
      }
    } catch { /* Wait for a complete, valid report. */ }
  }
  return [...reports.values()];
}
export function acquisitionStatus(report: AcquisitionReport, phase: string) {
  if (phase === 'failed' || !report.accepted) return 'failed';
  if (phase !== 'completed') return 'processing';
  return report.status;
}

export function uploadPublished(stream: string) {
  return /^Upload complete ✅\r?$/m.test(stream) && !/^UPLOAD_FAILED\|/m.test(stream);
}

// Count source units with reading problems, never visual uncertainty alone.
export function acquisitionReadingErrors(report: AcquisitionReport) {
  const readingReasons = new Set(['parser_error', 'ocr_error', 'inspection_error', 'no_recoverable_text']);
  return report.units.filter(unit =>
    unit.reasons.some(reason => readingReasons.has(reason)) ||
    (unit.status === 'failed' && !(unit.reasons.length > 0 && unit.reasons.every(reason => reason === 'unresolved_visuals')))
  ).length;
}
