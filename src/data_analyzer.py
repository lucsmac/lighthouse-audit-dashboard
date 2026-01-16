#!/usr/bin/env python3
"""
Data Analyzer - Analisa e cruza dados das auditorias Lighthouse.
"""

from collections import defaultdict
from typing import Any

# Métricas principais do Lighthouse (são resultados, não oportunidades de melhoria)
# Estas são excluídas da lista de issues porque são as métricas finais
METRIC_AUDITS = {
    'largest-contentful-paint',
    'first-contentful-paint',
    'speed-index',
    'interactive',
    'total-blocking-time',
    'cumulative-layout-shift',
    'max-potential-fid',
    'first-meaningful-paint',
    'server-response-time',  # TTFB
}

# Pesos das métricas no score de Performance (Lighthouse 10+)
# TBT: 30%, LCP: 25%, CLS: 25%, FCP: 10%, SI: 10%
METRIC_WEIGHTS = {
    'TBT': 30,
    'LCP': 25,
    'CLS': 25,
    'FCP': 10,
    'SI': 10,
}

# Mapeamento de audits para métricas afetadas e impacto
# Baseado na documentação oficial do Lighthouse
# impact: 'high' = afeta LCP/TBT/CLS, 'medium' = afeta FCP/SI, 'low' = diagnóstico
AUDIT_IMPACT_MAP = {
    # === MÉTRICAS PRINCIPAIS (aparecem como issues quando falham) ===
    'largest-contentful-paint': {'impact': 'high', 'metrics': ['LCP']},
    'first-contentful-paint': {'impact': 'medium', 'metrics': ['FCP']},
    'speed-index': {'impact': 'medium', 'metrics': ['SI']},
    'interactive': {'impact': 'high', 'metrics': ['TBT']},
    'total-blocking-time': {'impact': 'high', 'metrics': ['TBT']},
    'cumulative-layout-shift': {'impact': 'high', 'metrics': ['CLS']},
    'max-potential-fid': {'impact': 'high', 'metrics': ['TBT']},

    # === ALTO IMPACTO (afetam LCP, TBT ou CLS) ===
    # LCP (25%)
    'render-blocking-resources': {'impact': 'high', 'metrics': ['LCP', 'FCP']},
    'render-blocking-insight': {'impact': 'high', 'metrics': ['LCP', 'FCP']},
    'unused-javascript': {'impact': 'high', 'metrics': ['LCP', 'TBT']},
    'unused-css-rules': {'impact': 'high', 'metrics': ['LCP', 'FCP']},
    'offscreen-images': {'impact': 'high', 'metrics': ['LCP']},
    'unminified-css': {'impact': 'high', 'metrics': ['LCP', 'FCP']},
    'unminified-javascript': {'impact': 'high', 'metrics': ['LCP', 'TBT']},
    'efficient-animated-content': {'impact': 'high', 'metrics': ['LCP']},
    'preload-lcp-image': {'impact': 'high', 'metrics': ['LCP']},
    'lcp-lazy-loaded': {'impact': 'high', 'metrics': ['LCP']},
    'prioritize-lcp-image': {'impact': 'high', 'metrics': ['LCP']},
    'image-delivery-insight': {'impact': 'high', 'metrics': ['LCP']},
    'modern-image-formats': {'impact': 'high', 'metrics': ['LCP']},
    'uses-optimized-images': {'impact': 'high', 'metrics': ['LCP']},
    'uses-responsive-images': {'impact': 'high', 'metrics': ['LCP']},
    'uses-webp-images': {'impact': 'high', 'metrics': ['LCP']},
    'network-dependency-tree-insight': {'impact': 'high', 'metrics': ['LCP', 'FCP']},

    # TBT (30%)
    'bootup-time': {'impact': 'high', 'metrics': ['TBT']},
    'mainthread-work-breakdown': {'impact': 'high', 'metrics': ['TBT']},
    'long-tasks': {'impact': 'high', 'metrics': ['TBT']},
    'third-party-summary': {'impact': 'high', 'metrics': ['TBT', 'LCP']},
    'third-party-facades': {'impact': 'high', 'metrics': ['TBT']},
    'script-treemap-data': {'impact': 'high', 'metrics': ['TBT']},
    'legacy-javascript': {'impact': 'high', 'metrics': ['TBT']},
    'legacy-javascript-insight': {'impact': 'high', 'metrics': ['TBT']},
    'duplicated-javascript': {'impact': 'high', 'metrics': ['TBT']},
    'duplicated-javascript-insight': {'impact': 'high', 'metrics': ['TBT']},
    'forced-reflow-insight': {'impact': 'high', 'metrics': ['TBT']},

    # CLS (25%)
    'unsized-images': {'impact': 'high', 'metrics': ['CLS']},
    'non-composited-animations': {'impact': 'high', 'metrics': ['CLS']},
    'layout-shifts': {'impact': 'high', 'metrics': ['CLS']},
    'layout-shift-elements': {'impact': 'high', 'metrics': ['CLS']},

    # === MÉDIO IMPACTO (afetam FCP/SI ou economia significativa) ===
    'uses-text-compression': {'impact': 'medium', 'metrics': ['FCP', 'LCP']},
    'uses-rel-preconnect': {'impact': 'medium', 'metrics': ['FCP', 'LCP']},
    'uses-rel-preload': {'impact': 'medium', 'metrics': ['FCP', 'LCP']},
    'font-display': {'impact': 'medium', 'metrics': ['FCP', 'CLS']},
    'redirects': {'impact': 'medium', 'metrics': ['FCP', 'LCP']},
    'dom-size': {'impact': 'medium', 'metrics': ['TBT', 'FCP']},
    'document-latency-insight': {'impact': 'medium', 'metrics': ['FCP']},
    'server-response-time': {'impact': 'medium', 'metrics': ['FCP', 'LCP']},
    'critical-request-chains': {'impact': 'medium', 'metrics': ['FCP']},
    'user-timings': {'impact': 'medium', 'metrics': ['SI']},
    'total-byte-weight': {'impact': 'medium', 'metrics': ['FCP', 'LCP']},
    'lcp-breakdown-insight': {'impact': 'medium', 'metrics': ['LCP']},

    # === BAIXO IMPACTO (diagnósticos ou otimizações menores) ===
    'uses-long-cache-ttl': {'impact': 'low', 'metrics': []},
    'cache-insight': {'impact': 'low', 'metrics': []},
    'uses-http2': {'impact': 'low', 'metrics': []},
    'uses-passive-event-listeners': {'impact': 'low', 'metrics': []},
    'no-document-write': {'impact': 'low', 'metrics': ['FCP']},
    'image-aspect-ratio': {'impact': 'low', 'metrics': ['CLS']},
    'image-size-responsive': {'impact': 'low', 'metrics': []},
    'deprecations': {'impact': 'low', 'metrics': []},
    'errors-in-console': {'impact': 'low', 'metrics': []},
    'js-libraries': {'impact': 'low', 'metrics': []},
    'inspector-issues': {'impact': 'low', 'metrics': []},
    'valid-source-maps': {'impact': 'low', 'metrics': []},
    'preload-fonts': {'impact': 'low', 'metrics': ['FCP']},
    'network-rtt': {'impact': 'low', 'metrics': []},
    'network-server-latency': {'impact': 'low', 'metrics': []},
    'viewport': {'impact': 'low', 'metrics': []},
}


def _get_audit_impact(audit_id: str, audit_data: dict) -> dict:
    """
    Determina o impacto de uma auditoria no score de performance.

    Usa o mapeamento estático e também extrai metricSavings da API quando disponível.
    """
    # Primeiro tenta usar o mapeamento estático
    if audit_id in AUDIT_IMPACT_MAP:
        impact_info = AUDIT_IMPACT_MAP[audit_id]
        return {
            'impact': impact_info['impact'],
            'affectedMetrics': impact_info['metrics'],
        }

    # Se não está no mapeamento, tenta inferir do metricSavings da API
    metric_savings = audit_data.get('metricSavings', {})
    if metric_savings:
        affected_metrics = list(metric_savings.keys())
        # Calcula impacto baseado nos pesos das métricas afetadas
        total_weight = sum(METRIC_WEIGHTS.get(m, 0) for m in affected_metrics)
        if total_weight >= 25:
            impact = 'high'
        elif total_weight >= 10:
            impact = 'medium'
        else:
            impact = 'low'
        return {
            'impact': impact,
            'affectedMetrics': affected_metrics,
            'metricSavings': metric_savings,
        }

    # Fallback: impacto baixo para audits desconhecidos
    return {
        'impact': 'low',
        'affectedMetrics': [],
    }


def extract_failed_audits(lighthouse_result: dict) -> list[dict]:
    """
    Extrai auditorias que falharam (score < 1) do resultado do Lighthouse.

    Exclui métricas principais (LCP, FCP, etc.) e retorna apenas oportunidades
    e diagnósticos que podem ser acionados.

    Args:
        lighthouse_result: Resultado bruto do Lighthouse

    Returns:
        Lista de auditorias que falharam com detalhes
    """
    failed = []
    audits = lighthouse_result.get('audits', {})

    for audit_id, audit_data in audits.items():
        # Ignora métricas principais (LCP, FCP, etc.)
        if audit_id in METRIC_AUDITS:
            continue

        score = audit_data.get('score')

        # Ignora audits informativos (score None) ou que passaram (score 1)
        if score is None or score == 1:
            continue

        # Ignora audits manuais ou não aplicáveis
        if audit_data.get('scoreDisplayMode') in ['manual', 'notApplicable', 'informative']:
            continue

        # Obtém informações de impacto
        impact_info = _get_audit_impact(audit_id, audit_data)

        failed.append({
            'id': audit_id,
            'title': audit_data.get('title', audit_id),
            'description': audit_data.get('description', ''),
            'score': score,
            'displayValue': audit_data.get('displayValue', ''),
            'category': _get_audit_category(audit_id, lighthouse_result),
            'impact': impact_info['impact'],
            'affectedMetrics': impact_info['affectedMetrics'],
            'metricSavings': impact_info.get('metricSavings'),
        })

    return failed


def _get_audit_category(audit_id: str, lighthouse_result: dict) -> str:
    """Determina a categoria de um audit (performance ou seo)."""
    categories = lighthouse_result.get('categories', {})

    for cat_id, cat_data in categories.items():
        audit_refs = cat_data.get('auditRefs', [])
        for ref in audit_refs:
            if ref.get('id') == audit_id:
                return cat_id

    return 'unknown'


def extract_scores(lighthouse_result: dict) -> dict:
    """Extrai scores das categorias."""
    categories = lighthouse_result.get('categories', {})

    return {
        'performance': (categories.get('performance', {}).get('score') or 0) * 100,
        'seo': (categories.get('seo', {}).get('score') or 0) * 100
    }


def extract_core_web_vitals(lighthouse_result: dict) -> dict:
    """Extrai métricas Core Web Vitals."""
    audits = lighthouse_result.get('audits', {})

    def get_numeric_value(audit_id: str) -> float | None:
        audit = audits.get(audit_id, {})
        return audit.get('numericValue')

    return {
        'lcp': get_numeric_value('largest-contentful-paint'),  # ms
        'fid': get_numeric_value('max-potential-fid'),  # ms (usando max-potential-fid como proxy)
        'cls': get_numeric_value('cumulative-layout-shift'),  # score
        'fcp': get_numeric_value('first-contentful-paint'),  # ms
        'tbt': get_numeric_value('total-blocking-time'),  # ms
        'si': get_numeric_value('speed-index'),  # ms
    }


def analyze_results(raw_results: list[dict]) -> dict[str, Any]:
    """
    Analisa todos os resultados e agrupa issues por frequência.

    Args:
        raw_results: Lista de resultados brutos das auditorias

    Returns:
        Dict com análise completa
    """
    # Contagem de issues (global e por tema)
    issue_counts: dict[str, dict] = defaultdict(lambda: {
        'count': 0,
        'title': '',
        'description': '',
        'category': '',
        'sites': [],
        'temas': set(),  # Temas onde o issue aparece
        'impact': 'low',
        'affectedMetrics': [],
    })

    # Scores por site e tema
    site_data = []
    theme_data: dict[str, dict] = defaultdict(lambda: {
        'total_performance': 0,
        'total_seo': 0,
        'count': 0,
        'sites': []
    })

    # Métricas agregadas
    total_performance = 0
    total_seo = 0
    cwv_totals = defaultdict(lambda: {'sum': 0, 'count': 0})
    successful_count = 0

    # Coleta todos os temas únicos
    all_themes = set()

    for result in raw_results:
        site_info = result['site_info']
        lighthouse = result.get('lighthouse')
        site_temas = site_info.get('temas', [])

        # Adiciona temas à lista global
        for tema in site_temas:
            all_themes.add(tema)

        if not lighthouse or result.get('error'):
            site_data.append({
                **site_info,
                'scores': None,
                'core_web_vitals': None,
                'issues': [],
                'error': True
            })
            continue

        # Extrai dados
        scores = extract_scores(lighthouse)
        cwv = extract_core_web_vitals(lighthouse)
        failed_audits = extract_failed_audits(lighthouse)

        # Adiciona dados do site
        site_entry = {
            **site_info,
            'scores': scores,
            'core_web_vitals': cwv,
            'issues': [{'id': a['id'], 'title': a['title'], 'score': a['score']} for a in failed_audits]
        }
        site_data.append(site_entry)

        # Agrega scores
        total_performance += scores['performance']
        total_seo += scores['seo']
        successful_count += 1

        # Agrega CWV
        for metric, value in cwv.items():
            if value is not None:
                cwv_totals[metric]['sum'] += value
                cwv_totals[metric]['count'] += 1

        # Agrega por tema
        for tema in site_temas:
            theme_data[tema]['total_performance'] += scores['performance']
            theme_data[tema]['total_seo'] += scores['seo']
            theme_data[tema]['count'] += 1
            theme_data[tema]['sites'].append(site_info['nome'])

        # Conta issues e registra em quais temas aparecem
        for audit in failed_audits:
            issue_id = audit['id']
            issue_counts[issue_id]['count'] += 1
            issue_counts[issue_id]['title'] = audit['title']
            issue_counts[issue_id]['description'] = audit['description']
            issue_counts[issue_id]['category'] = audit['category']
            issue_counts[issue_id]['sites'].append(site_info['nome'])
            issue_counts[issue_id]['impact'] = audit['impact']
            issue_counts[issue_id]['affectedMetrics'] = audit['affectedMetrics']
            # Adiciona os temas do site ao issue
            for tema in site_temas:
                issue_counts[issue_id]['temas'].add(tema)

    # Classifica issues por frequência
    total_sites = successful_count or 1
    critical = []  # >70%
    frequent = []  # 30-70%
    occasional = []  # <30%

    for issue_id, data in issue_counts.items():
        percentage = (data['count'] / total_sites) * 100
        issue_entry = {
            'id': issue_id,
            'title': data['title'],
            'description': data['description'],
            'category': data['category'],
            'count': data['count'],
            'percentage': round(percentage, 1),
            'sites': data['sites'],
            'temas': list(data['temas']),  # Converte set para lista
            'impact': data['impact'],
            'affectedMetrics': data['affectedMetrics'],
        }

        if percentage > 70:
            critical.append(issue_entry)
        elif percentage >= 30:
            frequent.append(issue_entry)
        else:
            occasional.append(issue_entry)

    # Ordena por contagem
    critical.sort(key=lambda x: x['count'], reverse=True)
    frequent.sort(key=lambda x: x['count'], reverse=True)
    occasional.sort(key=lambda x: x['count'], reverse=True)

    # Calcula médias
    avg_performance = total_performance / successful_count if successful_count else 0
    avg_seo = total_seo / successful_count if successful_count else 0

    avg_cwv = {}
    for metric, data in cwv_totals.items():
        if data['count'] > 0:
            avg_cwv[metric] = round(data['sum'] / data['count'], 2)
        else:
            avg_cwv[metric] = None

    # Processa dados por tema
    by_theme = {}
    for tema, data in theme_data.items():
        count = data['count']
        if count > 0:
            by_theme[tema] = {
                'avg_performance': round(data['total_performance'] / count, 1),
                'avg_seo': round(data['total_seo'] / count, 1),
                'sites_count': count,
                'sites': data['sites']
            }

    return {
        'summary': {
            'avg_performance': round(avg_performance, 1),
            'avg_seo': round(avg_seo, 1),
            'core_web_vitals': avg_cwv,
            'total_sites': len(raw_results),
            'successful_audits': successful_count
        },
        'common_issues': {
            'critical': critical,
            'frequent': frequent,
            'occasional': occasional
        },
        'by_site': site_data,
        'by_theme': by_theme,
        'themes': sorted(list(all_themes))
    }
