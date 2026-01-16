#!/usr/bin/env python3
"""
Report Generator - Gera relatório JSON estruturado.
"""

from datetime import datetime
from typing import Any


def generate_report(raw_results: list[dict], analysis: dict[str, Any]) -> dict:
    """
    Gera o relatório final em formato JSON.

    Args:
        raw_results: Resultados brutos das auditorias
        analysis: Análise processada

    Returns:
        Dict com relatório completo para o dashboard
    """
    return {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_sites': analysis['summary']['total_sites'],
            'successful_audits': analysis['summary']['successful_audits'],
            'version': '1.0.0'
        },
        'summary': {
            'avg_performance': analysis['summary']['avg_performance'],
            'avg_seo': analysis['summary']['avg_seo'],
            'core_web_vitals': analysis['summary']['core_web_vitals']
        },
        'common_issues': {
            'critical': _simplify_issues(analysis['common_issues']['critical']),
            'frequent': _simplify_issues(analysis['common_issues']['frequent']),
            'occasional': _simplify_issues(analysis['common_issues']['occasional'])
        },
        'by_site': _prepare_sites_data(analysis['by_site']),
        'by_theme': analysis['by_theme'],
        'themes': analysis['themes']
    }


def _simplify_issues(issues: list[dict]) -> list[dict]:
    """Remove lista de sites dos issues para reduzir tamanho do JSON."""
    return [
        {
            'id': issue['id'],
            'title': issue['title'],
            'description': issue['description'],
            'category': issue['category'],
            'count': issue['count'],
            'percentage': issue['percentage'],
            'temas': issue.get('temas', [])
        }
        for issue in issues
    ]


def _prepare_sites_data(sites: list[dict]) -> list[dict]:
    """Prepara dados dos sites para o dashboard."""
    return [
        {
            'id': site['id'],
            'nome': site['nome'],
            'slug': site['slug'],
            'marca': site['marca'],
            'dominio': site['dominio'],
            'conta': site['conta'],
            'temas': site.get('temas', []),
            'scores': site.get('scores'),
            'core_web_vitals': site.get('core_web_vitals'),
            'issues_count': len(site.get('issues', [])),
            'issues': site.get('issues', []),
            'error': site.get('error', False)
        }
        for site in sites
    ]
