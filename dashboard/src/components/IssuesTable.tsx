import { useState, useMemo } from 'react';
import type { Issue, Site } from '../types/audit';

interface IssuesTableProps {
  critical: Issue[];
  frequent: Issue[];
  occasional: Issue[];
  sites: Site[];
}

type TabType = 'critical' | 'frequent' | 'occasional';

function getPageSpeedUrl(domain: string): string {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;
  return `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}`;
}

export function IssuesTable({ critical, frequent, occasional, sites }: IssuesTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('critical');

  // Mapa de issue -> site de exemplo
  const exampleSites = useMemo(() => {
    const map: Record<string, string> = {};
    const successfulSites = sites.filter(s => !s.error && s.issues);

    // Para cada site, mapeia seus issues
    successfulSites.forEach(site => {
      (site.issues || []).forEach(issue => {
        // Guarda o primeiro site encontrado para cada issue
        if (!map[issue.id]) {
          map[issue.id] = site.dominio;
        }
      });
    });

    return map;
  }, [sites]);

  const tabs: { id: TabType; label: string; count: number; color: string }[] = [
    { id: 'critical', label: 'Críticos (>70%)', count: critical.length, color: 'red' },
    { id: 'frequent', label: 'Frequentes (30-70%)', count: frequent.length, color: 'yellow' },
    { id: 'occasional', label: 'Ocasionais (<30%)', count: occasional.length, color: 'blue' },
  ];

  const issues = activeTab === 'critical' ? critical : activeTab === 'frequent' ? frequent : occasional;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? `border-${tab.color}-500 text-${tab.color}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? `bg-${tab.color}-100 text-${tab.color}-800` : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sites Afetados</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">%</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exemplo</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {issues.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Nenhum issue encontrado nesta categoria
                </td>
              </tr>
            ) : (
              issues.map((issue) => {
                const exampleDomain = exampleSites[issue.id];
                return (
                  <tr key={issue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{issue.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-md" title={issue.description}>
                        {issue.description.replace(/<[^>]*>/g, '').slice(0, 100)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        issue.category === 'performance' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {issue.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{issue.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{issue.percentage}%</span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              issue.percentage > 70 ? 'bg-red-500' : issue.percentage > 30 ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(issue.percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {exampleDomain ? (
                        <a
                          href={getPageSpeedUrl(exampleDomain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                          title={`Ver no PageSpeed: ${exampleDomain}`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Ver exemplo
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
