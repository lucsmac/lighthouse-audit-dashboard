export interface CoreWebVitals {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  tbt: number | null;
  si: number | null;
}

export interface Scores {
  performance: number;
  seo: number;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  count: number;
  percentage: number;
  temas: string[];
}

export interface SiteIssue {
  id: string;
  title: string;
  score: number;
}

export interface Site {
  id: number;
  nome: string;
  slug: string;
  marca: string;
  dominio: string;
  conta: string;
  temas: string[];
  scores: Scores | null;
  core_web_vitals: CoreWebVitals | null;
  issues_count: number;
  issues: SiteIssue[];
  error: boolean;
}

export interface ThemeData {
  avg_performance: number;
  avg_seo: number;
  sites_count: number;
  sites: string[];
}

export interface AuditReport {
  metadata: {
    generated_at: string;
    total_sites: number;
    successful_audits: number;
    version: string;
  };
  summary: {
    avg_performance: number;
    avg_seo: number;
    core_web_vitals: CoreWebVitals;
  };
  common_issues: {
    critical: Issue[];
    frequent: Issue[];
    occasional: Issue[];
  };
  by_site: Site[];
  by_theme: Record<string, ThemeData>;
  themes: string[];
}
