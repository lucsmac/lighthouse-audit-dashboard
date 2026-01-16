interface AuditHistoryProps {
  audits: string[];
  selectedAudit: string;
  onSelectAudit: (audit: string) => void;
}

function formatAuditName(filename: string): string {
  // audit_20240115_143022.json -> 15/01/2024 14:30:22
  const match = filename.match(/audit_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.json/);
  if (match) {
    const [, year, month, day, hour, min, sec] = match;
    return `${day}/${month}/${year} ${hour}:${min}:${sec}`;
  }
  return filename;
}

export function AuditHistory({ audits, selectedAudit, onSelectAudit }: AuditHistoryProps) {
  if (audits.length <= 1) return null;

  return (
    <div className="mb-6">
      <label htmlFor="audit-history" className="block text-sm font-medium text-gray-700 mb-2">
        Histórico de Auditorias
      </label>
      <select
        id="audit-history"
        value={selectedAudit}
        onChange={(e) => onSelectAudit(e.target.value)}
        className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        {audits.map((audit) => (
          <option key={audit} value={audit}>
            {formatAuditName(audit)}
          </option>
        ))}
      </select>
    </div>
  );
}
