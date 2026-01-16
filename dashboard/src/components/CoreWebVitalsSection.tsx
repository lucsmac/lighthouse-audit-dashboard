import type { Site } from '../types/audit';

interface CoreWebVitalsSectionProps {
  sites: Site[];
}

interface MetricThresholds {
  good: number;
  poor: number;
  unit: string;
  label: string;
  description: string;
}

const METRICS: Record<string, MetricThresholds> = {
  lcp: {
    good: 2500,
    poor: 4000,
    unit: 's',
    label: 'Largest Contentful Paint (LCP)',
    description: 'Tempo até o maior elemento visível ser renderizado',
  },
  fcp: {
    good: 1800,
    poor: 3000,
    unit: 's',
    label: 'First Contentful Paint (FCP)',
    description: 'Tempo até o primeiro conteúdo ser renderizado',
  },
  cls: {
    good: 0.1,
    poor: 0.25,
    unit: '',
    label: 'Cumulative Layout Shift (CLS)',
    description: 'Mudanças inesperadas no layout da página',
  },
  tbt: {
    good: 200,
    poor: 600,
    unit: 'ms',
    label: 'Total Blocking Time (TBT)',
    description: 'Tempo total de bloqueio da thread principal',
  },
  si: {
    good: 3400,
    poor: 5800,
    unit: 's',
    label: 'Speed Index (SI)',
    description: 'Velocidade de carregamento visual da página',
  },
};

function formatValue(value: number, metric: string): string {
  if (metric === 'cls') return value.toFixed(3);
  if (METRICS[metric].unit === 's') return (value / 1000).toFixed(2) + 's';
  return value.toFixed(0) + 'ms';
}

function getStatus(value: number, metric: string): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = METRICS[metric];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

export function CoreWebVitalsSection({ sites }: CoreWebVitalsSectionProps) {
  const successfulSites = sites.filter(s => !s.error && s.core_web_vitals);

  // Calcula estatísticas para cada métrica
  const stats = Object.keys(METRICS).map(metric => {
    const values: number[] = [];
    let good = 0, needsImprovement = 0, poor = 0;

    successfulSites.forEach(site => {
      const value = site.core_web_vitals?.[metric as keyof typeof site.core_web_vitals];
      if (value !== null && value !== undefined) {
        values.push(value);
        const status = getStatus(value, metric);
        if (status === 'good') good++;
        else if (status === 'needs-improvement') needsImprovement++;
        else poor++;
      }
    });

    const total = values.length;
    const avg = total > 0 ? values.reduce((a, b) => a + b, 0) / total : 0;
    const median = total > 0 ? values.sort((a, b) => a - b)[Math.floor(total / 2)] : 0;

    return {
      metric,
      ...METRICS[metric],
      avg,
      median,
      total,
      good,
      needsImprovement,
      poor,
      goodPercent: total > 0 ? (good / total) * 100 : 0,
      needsImprovementPercent: total > 0 ? (needsImprovement / total) * 100 : 0,
      poorPercent: total > 0 ? (poor / total) * 100 : 0,
    };
  });

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Core Web Vitals</h2>
      <p className="text-sm text-gray-500 mb-6">
        Distribuição de performance dos {successfulSites.length} sites analisados
      </p>

      <div className="space-y-6">
        {stats.map(stat => (
          <div key={stat.metric} className="border-b border-gray-100 pb-4 last:border-0">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-gray-900">{stat.label}</h3>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {formatValue(stat.median, stat.metric)}
                </div>
                <div className="text-xs text-gray-500">mediana</div>
              </div>
            </div>

            {/* Barra de distribuição */}
            <div className="flex h-4 rounded-full overflow-hidden bg-gray-100 mb-2">
              {stat.goodPercent > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${stat.goodPercent}%` }}
                  title={`Bom: ${stat.good} sites (${stat.goodPercent.toFixed(1)}%)`}
                />
              )}
              {stat.needsImprovementPercent > 0 && (
                <div
                  className="bg-yellow-500 transition-all"
                  style={{ width: `${stat.needsImprovementPercent}%` }}
                  title={`Precisa melhorar: ${stat.needsImprovement} sites (${stat.needsImprovementPercent.toFixed(1)}%)`}
                />
              )}
              {stat.poorPercent > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${stat.poorPercent}%` }}
                  title={`Ruim: ${stat.poor} sites (${stat.poorPercent.toFixed(1)}%)`}
                />
              )}
            </div>

            {/* Legenda */}
            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-gray-600">Bom: {stat.good} ({stat.goodPercent.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span className="text-gray-600">Médio: {stat.needsImprovement} ({stat.needsImprovementPercent.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-gray-600">Ruim: {stat.poor} ({stat.poorPercent.toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
