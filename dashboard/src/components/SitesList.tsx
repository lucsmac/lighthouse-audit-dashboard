import { useState } from 'react';
import type { Site } from '../types/audit';

interface SitesListProps {
  sites: Site[];
  selectedTheme: string | null;
}

function getScoreClass(score: number): string {
  if (score >= 90) return 'text-green-600 bg-green-50';
  if (score >= 50) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

export function SitesList({ sites, selectedTheme }: SitesListProps) {
  const [sortBy, setSortBy] = useState<'nome' | 'performance' | 'seo' | 'issues'>('performance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const filteredSites = sites.filter((site) => {
    // Filtra por tema (verifica se o site pertence ao tema selecionado)
    const siteTemas = site.temas || [];
    if (selectedTheme && !siteTemas.includes(selectedTheme)) return false;
    // Filtra por busca
    if (search && !site.nome.toLowerCase().includes(search.toLowerCase()) && !site.dominio.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sortedSites = [...filteredSites].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'nome':
        comparison = a.nome.localeCompare(b.nome);
        break;
      case 'performance':
        comparison = (a.scores?.performance || 0) - (b.scores?.performance || 0);
        break;
      case 'seo':
        comparison = (a.scores?.seo || 0) - (b.scores?.seo || 0);
        break;
      case 'issues':
        comparison = a.issues_count - b.issues_count;
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'nome' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ column }: { column: typeof sortBy }) => (
    <span className="ml-1">
      {sortBy === column ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
    </span>
  );

  return (
    <div className="bg-white rounded-lg shadow mt-8">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Sites ({filteredSites.length})</h2>
          <input
            type="text"
            placeholder="Buscar site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 md:w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('nome')}
              >
                Site <SortIcon column="nome" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temas</th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('performance')}
              >
                Performance <SortIcon column="performance" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('seo')}
              >
                SEO <SortIcon column="seo" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('issues')}
              >
                Issues <SortIcon column="issues" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedSites.map((site) => (
              <tr key={site.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{site.nome}</div>
                  <a
                    href={`https://${site.dominio}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {site.dominio}
                  </a>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {(site.temas || []).map((tema) => (
                      <span
                        key={tema}
                        className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700"
                        title={tema}
                      >
                        {tema.replace('showroom_', '').replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {site.error ? (
                    <span className="text-red-500 text-sm">Erro</span>
                  ) : (
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreClass(site.scores?.performance || 0)}`}>
                      {site.scores?.performance.toFixed(0)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {site.error ? (
                    <span className="text-red-500 text-sm">Erro</span>
                  ) : (
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreClass(site.scores?.seo || 0)}`}>
                      {site.scores?.seo.toFixed(0)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {site.issues_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
