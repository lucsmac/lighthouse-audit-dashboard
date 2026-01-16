import type { CoreWebVitals } from '../types/audit';

interface ScoreCardsProps {
  avgPerformance: number;
  avgSeo: number;
  coreWebVitals: CoreWebVitals;
  totalSites: number;
  successfulAudits: number;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function formatCWV(value: number | null, metric: string): string {
  if (value === null) return 'N/A';
  if (metric === 'cls') return value.toFixed(3);
  return `${(value / 1000).toFixed(2)}s`;
}

export function ScoreCards({ avgPerformance, avgSeo, coreWebVitals, totalSites, successfulAudits }: ScoreCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Performance Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Performance</h3>
        <div className="mt-2 flex items-baseline">
          <span className={`text-4xl font-bold ${avgPerformance >= 90 ? 'text-green-600' : avgPerformance >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {avgPerformance.toFixed(0)}
          </span>
          <span className="ml-2 text-gray-500">/100</span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full ${getScoreColor(avgPerformance)}`} style={{ width: `${avgPerformance}%` }}></div>
        </div>
      </div>

      {/* SEO Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">SEO</h3>
        <div className="mt-2 flex items-baseline">
          <span className={`text-4xl font-bold ${avgSeo >= 90 ? 'text-green-600' : avgSeo >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {avgSeo.toFixed(0)}
          </span>
          <span className="ml-2 text-gray-500">/100</span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full ${getScoreColor(avgSeo)}`} style={{ width: `${avgSeo}%` }}></div>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Core Web Vitals</h3>
        <div className="mt-2 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">LCP</span>
            <span className="font-medium">{formatCWV(coreWebVitals.lcp, 'lcp')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">FID</span>
            <span className="font-medium">{formatCWV(coreWebVitals.fid, 'fid')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">CLS</span>
            <span className="font-medium">{formatCWV(coreWebVitals.cls, 'cls')}</span>
          </div>
        </div>
      </div>

      {/* Sites Audited */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Sites Auditados</h3>
        <div className="mt-2 flex items-baseline">
          <span className="text-4xl font-bold text-gray-900">{successfulAudits}</span>
          <span className="ml-2 text-gray-500">/ {totalSites}</span>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          {((successfulAudits / totalSites) * 100).toFixed(0)}% de sucesso
        </div>
      </div>
    </div>
  );
}
