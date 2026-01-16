import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ThemeData } from '../types/audit';

interface ThemeChartProps {
  themes: Record<string, ThemeData>;
}

export function ThemeChart({ themes }: ThemeChartProps) {
  const data = Object.entries(themes)
    .map(([name, data]) => ({
      name: name.replace('showroom_', '').replace('_', ' '),
      Performance: data.avg_performance,
      SEO: data.avg_seo,
      sites: data.sites_count,
    }))
    .sort((a, b) => b.sites - a.sites);

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Scores por Tema</h2>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Performance" fill="#8b5cf6" />
            <Bar dataKey="SEO" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
