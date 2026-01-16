import type { ThemeData } from '../types/audit';

interface ThemeFilterProps {
  themes: Record<string, ThemeData>;
  selectedTheme: string | null;
  onSelectTheme: (theme: string | null) => void;
}

export function ThemeFilter({ themes, selectedTheme, onSelectTheme }: ThemeFilterProps) {
  const sortedThemes = Object.entries(themes).sort((a, b) => b[1].sites_count - a[1].sites_count);

  return (
    <div className="mb-6">
      <label htmlFor="theme-filter" className="block text-sm font-medium text-gray-700 mb-2">
        Filtrar por Tema
      </label>
      <select
        id="theme-filter"
        value={selectedTheme || ''}
        onChange={(e) => onSelectTheme(e.target.value || null)}
        className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Todos os temas</option>
        {sortedThemes.map(([theme, data]) => (
          <option key={theme} value={theme}>
            {theme} ({data.sites_count} sites)
          </option>
        ))}
      </select>
    </div>
  );
}
