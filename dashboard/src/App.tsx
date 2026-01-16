import { useState, useEffect, useMemo } from 'react';
import type { AuditReport, Issue, CoreWebVitals } from './types/audit';

// Métricas principais do Lighthouse (são resultados, não oportunidades)
// Estas são excluídas da lista de issues
const METRIC_AUDITS = new Set([
  'largest-contentful-paint',
  'first-contentful-paint',
  'speed-index',
  'interactive',
  'total-blocking-time',
  'cumulative-layout-shift',
  'max-potential-fid',
  'first-meaningful-paint',
  'server-response-time',
]);
import { ScoreCards } from './components/ScoreCards';
import { IssuesTable } from './components/IssuesTable';
import { ThemeFilter } from './components/BrandFilter';
import { AuditHistory } from './components/AuditHistory';
import { SitesList } from './components/SitesList';
import { ThemeChart } from './components/BrandChart';
import { CoreWebVitalsSection } from './components/CoreWebVitalsSection';

function App() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [audits, setAudits] = useState<string[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega lista de auditorias disponíveis
  useEffect(() => {
    async function loadAuditsList() {
      try {
        const response = await fetch('/data/audits/index.json');
        if (response.ok) {
          const data = await response.json();
          setAudits(data.audits || []);
          if (data.audits?.length > 0) {
            setSelectedAudit(data.audits[0]);
          }
        } else {
          const fallbackResponse = await fetch('/data/audits/latest.json');
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            setReport(data);
            setAudits(['latest.json']);
            setSelectedAudit('latest.json');
          } else {
            setError('Nenhuma auditoria encontrada. Execute o script Python primeiro.');
          }
        }
      } catch {
        setError('Erro ao carregar lista de auditorias.');
      } finally {
        setLoading(false);
      }
    }

    loadAuditsList();
  }, []);

  // Carrega auditoria selecionada
  useEffect(() => {
    if (!selectedAudit) return;

    async function loadAudit() {
      setLoading(true);
      try {
        const response = await fetch(`/data/audits/${selectedAudit}`);
        const text = await response.text();

        if (response.ok && text) {
          const data = JSON.parse(text);

          // Compatibilidade com JSONs antigos (by_brand -> by_theme)
          if (!data.by_theme && data.by_brand) {
            data.by_theme = data.by_brand;
          }
          if (!data.by_theme) {
            data.by_theme = {};
          }
          if (!data.themes) {
            data.themes = Object.keys(data.by_theme);
          }

          // Garante que sites tenham array de temas
          if (data.by_site) {
            data.by_site = data.by_site.map((site: Record<string, unknown>) => ({
              ...site,
              temas: site.temas || (site.marca ? [site.marca] : [])
            }));
          }

          // Garante que issues tenham array de temas
          ['critical', 'frequent', 'occasional'].forEach(category => {
            if (data.common_issues?.[category]) {
              data.common_issues[category] = data.common_issues[category].map((issue: Record<string, unknown>) => ({
                ...issue,
                temas: issue.temas || []
              }));
            }
          });

          setReport(data);
          setError(null);
        } else {
          setError(`Erro ao carregar auditoria: ${selectedAudit} (${response.status})`);
        }
      } catch (e) {
        console.error('Erro ao carregar:', e);
        setError(`Erro ao carregar auditoria: ${selectedAudit}`);
      } finally {
        setLoading(false);
      }
    }

    loadAudit();
  }, [selectedAudit]);

  // Filtra dados pelo tema selecionado
  const filteredData = useMemo(() => {
    if (!report) return null;

    // Função para filtrar métricas principais
    const filterMetrics = (issues: Issue[]) =>
      issues.filter(issue => !METRIC_AUDITS.has(issue.id));

    // Se nenhum tema selecionado, retorna dados originais (mas filtra métricas)
    if (!selectedTheme) {
      return {
        sites: report.by_site,
        issues: {
          critical: filterMetrics(report.common_issues.critical),
          frequent: filterMetrics(report.common_issues.frequent),
          occasional: filterMetrics(report.common_issues.occasional),
        },
        summary: report.summary,
      };
    }

    // Filtra sites pelo tema
    const filteredSites = report.by_site.filter(
      (site) => (site.temas || []).includes(selectedTheme)
    );

    // Recalcula métricas para os sites filtrados
    const successfulSites = filteredSites.filter(s => !s.error && s.scores);
    const totalPerformance = successfulSites.reduce((sum, s) => sum + (s.scores?.performance || 0), 0);
    const totalSeo = successfulSites.reduce((sum, s) => sum + (s.scores?.seo || 0), 0);
    const count = successfulSites.length || 1;

    // Recalcula Core Web Vitals
    const cwvMetrics = ['lcp', 'fid', 'cls', 'fcp', 'tbt', 'si'] as const;
    const cwvTotals: Record<string, { sum: number; count: number }> = {};
    cwvMetrics.forEach(m => { cwvTotals[m] = { sum: 0, count: 0 }; });

    successfulSites.forEach(site => {
      if (site.core_web_vitals) {
        cwvMetrics.forEach(metric => {
          const value = site.core_web_vitals?.[metric];
          if (value !== null && value !== undefined) {
            cwvTotals[metric].sum += value;
            cwvTotals[metric].count += 1;
          }
        });
      }
    });

    const avgCwv: CoreWebVitals = {
      lcp: cwvTotals.lcp.count > 0 ? cwvTotals.lcp.sum / cwvTotals.lcp.count : null,
      fid: cwvTotals.fid.count > 0 ? cwvTotals.fid.sum / cwvTotals.fid.count : null,
      cls: cwvTotals.cls.count > 0 ? cwvTotals.cls.sum / cwvTotals.cls.count : null,
      fcp: cwvTotals.fcp.count > 0 ? cwvTotals.fcp.sum / cwvTotals.fcp.count : null,
      tbt: cwvTotals.tbt.count > 0 ? cwvTotals.tbt.sum / cwvTotals.tbt.count : null,
      si: cwvTotals.si.count > 0 ? cwvTotals.si.sum / cwvTotals.si.count : null,
    };

    // Recalcula issues baseado nos sites filtrados
    const issueCountsInTheme: Record<string, number> = {};

    // Conta quantas vezes cada issue aparece nos sites do tema
    successfulSites.forEach(site => {
      (site.issues || []).forEach(issue => {
        issueCountsInTheme[issue.id] = (issueCountsInTheme[issue.id] || 0) + 1;
      });
    });

    // Cria lista única de issues com contagens recalculadas
    const allIssues = [
      ...report.common_issues.critical,
      ...report.common_issues.frequent,
      ...report.common_issues.occasional,
    ];

    // Remove duplicatas, métricas principais e recalcula
    const uniqueIssues = new Map<string, Issue>();
    allIssues.forEach(issue => {
      // Exclui métricas principais (LCP, FCP, etc.)
      if (METRIC_AUDITS.has(issue.id)) return;
      if (!uniqueIssues.has(issue.id)) {
        uniqueIssues.set(issue.id, issue);
      }
    });

    const recalculatedIssues: Issue[] = Array.from(uniqueIssues.values())
      .map(issue => {
        const newCount = issueCountsInTheme[issue.id] || 0;
        const newPercentage = count > 0 ? Math.round((newCount / count) * 1000) / 10 : 0;
        return {
          ...issue,
          count: newCount,
          percentage: newPercentage,
        };
      })
      .filter(issue => issue.count > 0)
      .sort((a, b) => b.count - a.count);

    // Classifica por frequência
    const critical = recalculatedIssues.filter(i => i.percentage > 70);
    const frequent = recalculatedIssues.filter(i => i.percentage >= 30 && i.percentage <= 70);
    const occasional = recalculatedIssues.filter(i => i.percentage < 30);

    return {
      sites: filteredSites,
      issues: { critical, frequent, occasional },
      summary: {
        avg_performance: Math.round(totalPerformance / count * 10) / 10,
        avg_seo: Math.round(totalSeo / count * 10) / 10,
        core_web_vitals: avgCwv,
      },
      totalSites: filteredSites.length,
      successfulAudits: successfulSites.length,
    };
  }, [report, selectedTheme]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !report || !filteredData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar dados</h1>
          <p className="text-gray-600 mb-4">{error || 'Dados não encontrados'}</p>
          <div className="text-left bg-gray-50 rounded p-4 text-sm">
            <p className="font-medium mb-2">Para gerar dados:</p>
            <code className="block bg-gray-200 p-2 rounded">
              python src/lighthouse_runner.py --limit 5
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Lighthouse Audit Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerado em: {new Date(report.metadata.generated_at).toLocaleString('pt-BR')}
            {selectedTheme && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                Filtrado: {selectedTheme}
              </span>
            )}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <AuditHistory
            audits={audits}
            selectedAudit={selectedAudit}
            onSelectAudit={setSelectedAudit}
          />
          <ThemeFilter
            themes={report.by_theme}
            selectedTheme={selectedTheme}
            onSelectTheme={setSelectedTheme}
          />
        </div>

        <ScoreCards
          avgPerformance={filteredData.summary.avg_performance}
          avgSeo={filteredData.summary.avg_seo}
          coreWebVitals={filteredData.summary.core_web_vitals}
          totalSites={filteredData.totalSites ?? report.metadata.total_sites}
          successfulAudits={filteredData.successfulAudits ?? report.metadata.successful_audits}
        />

        <CoreWebVitalsSection sites={filteredData.sites} />

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Issues Comuns
            {selectedTheme && <span className="text-sm font-normal text-gray-500 ml-2">({selectedTheme})</span>}
          </h2>
          <IssuesTable
            critical={filteredData.issues.critical}
            frequent={filteredData.issues.frequent}
            occasional={filteredData.issues.occasional}
            sites={filteredData.sites}
          />
        </div>

        <ThemeChart themes={report.by_theme} />

        <SitesList sites={filteredData.sites} selectedTheme={selectedTheme} />
      </main>

      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Lighthouse Performance Audit Analysis
        </div>
      </footer>
    </div>
  );
}

export default App;
