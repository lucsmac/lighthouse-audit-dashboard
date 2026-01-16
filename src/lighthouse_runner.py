#!/usr/bin/env python3
"""
Lighthouse Runner - Executa auditorias via PageSpeed Insights API.

Rate Limits da API (com API key):
- 25.000 requisições por dia
- 400 requisições por 100 segundos (~4 req/s)

Para 381 sites com delay de 1.5s = ~10 minutos de execução
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

from data_analyzer import analyze_results
from report_generator import generate_report

# Carrega variáveis do .env
load_dotenv()

PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

# Rate limit: 400 req / 100s = 4 req/s, usamos 1.5s para margem de segurança
DEFAULT_DELAY = 1.5
MAX_RETRIES = 3
RATE_LIMIT_WAIT = 60  # Segundos para esperar após rate limit


def load_sites(excel_path: str) -> pd.DataFrame:
    """Carrega sites de todas as abas da planilha Excel, identificando o tema de cada um."""
    xlsx = pd.ExcelFile(excel_path)
    all_sites = []

    for sheet_name in xlsx.sheet_names:
        df = pd.read_excel(xlsx, sheet_name=sheet_name)
        # Filtra apenas sites com domínio válido
        df = df[df['dominio'].notna() & (df['dominio'] != '')]
        # Adiciona coluna de tema
        df['tema'] = sheet_name
        all_sites.append(df)

    # Combina todos os sites
    combined = pd.concat(all_sites, ignore_index=True)

    # Agrupa por domínio para identificar sites que aparecem em múltiplos temas
    # (mantém primeiro registro mas agrega os temas)
    sites_themes = combined.groupby('dominio')['tema'].apply(list).reset_index()
    sites_themes.columns = ['dominio', 'temas']

    # Pega dados únicos dos sites (primeiro registro de cada domínio)
    unique_sites = combined.drop_duplicates(subset='dominio', keep='first').copy()

    # Adiciona lista de temas
    unique_sites = unique_sites.merge(sites_themes, on='dominio', how='left')

    # Remove coluna tema individual (agora temos temas como lista)
    unique_sites = unique_sites.drop(columns=['tema'])

    print(f"Temas encontrados: {xlsx.sheet_names}")

    return unique_sites


def normalize_url(domain: str) -> str:
    """Normaliza domínio para URL completa."""
    domain = domain.strip()
    if not domain.startswith(('http://', 'https://')):
        domain = f'https://{domain}'
    return domain


def run_lighthouse_api(url: str, api_key: str, retries: int = MAX_RETRIES) -> dict | None:
    """
    Executa auditoria via PageSpeed Insights API.

    Trata erros de forma robusta para não interromper a coleta.
    """
    params = {
        'url': url,
        'key': api_key,
        'category': ['performance', 'seo'],
        'strategy': 'mobile'
    }

    for attempt in range(retries):
        try:
            response = requests.get(
                PAGESPEED_API_URL,
                params=params,
                timeout=180  # Timeout maior para sites lentos
            )

            if response.status_code == 200:
                data = response.json()
                return data.get('lighthouseResult')

            elif response.status_code == 429:
                # Rate limit - espera progressivamente mais tempo
                wait_time = RATE_LIMIT_WAIT * (attempt + 1)
                print(f"  ⚠ Rate limit atingido. Aguardando {wait_time}s...")
                time.sleep(wait_time)
                continue

            elif response.status_code in [500, 502, 503, 504]:
                # Erros do servidor Google - pode ser temporário ou problema com o site
                try:
                    error_data = response.json().get('error', {})
                    error_msg = error_data.get('message', 'Erro do servidor')[:100]
                except:
                    error_msg = f"HTTP {response.status_code}"

                print(f"  ✗ Erro {response.status_code}: {error_msg}")

                # Tenta novamente para erros 502/503/504 (podem ser temporários)
                if response.status_code != 500 and attempt < retries - 1:
                    time.sleep(5)
                    continue
                return None

            else:
                # Outros erros (400, 401, 403, etc)
                try:
                    error_data = response.json().get('error', {})
                    error_msg = error_data.get('message', 'Erro desconhecido')[:100]
                except:
                    error_msg = f"HTTP {response.status_code}"

                print(f"  ✗ Erro {response.status_code}: {error_msg}")
                return None

        except requests.exceptions.Timeout:
            print(f"  ✗ Timeout (tentativa {attempt + 1}/{retries})")
            if attempt < retries - 1:
                time.sleep(5)
                continue
            return None

        except requests.exceptions.ConnectionError as e:
            print(f"  ✗ Erro de conexão: {str(e)[:50]}")
            if attempt < retries - 1:
                time.sleep(10)
                continue
            return None

        except requests.exceptions.RequestException as e:
            print(f"  ✗ Erro de requisição: {str(e)[:50]}")
            return None

        except json.JSONDecodeError:
            print(f"  ✗ Resposta inválida do servidor")
            return None

        except Exception as e:
            print(f"  ✗ Erro inesperado: {str(e)[:50]}")
            return None

    return None


def run_audits(df: pd.DataFrame, api_key: str, limit: int | None = None, delay: float = DEFAULT_DELAY) -> list[dict]:
    """
    Executa auditorias para todos os sites.

    NUNCA interrompe a execução por causa de erros individuais.
    """
    results = []
    sites = df.to_dict('records')

    if limit:
        sites = sites[:limit]

    total = len(sites)
    successful = 0
    failed = 0

    # Estimativa de tempo
    estimated_time = (total * delay) / 60
    print(f"\nIniciando auditoria de {total} sites via API...")
    print(f"Tempo estimado: ~{estimated_time:.1f} minutos (delay: {delay}s)")
    print("=" * 60)

    start_time = time.time()

    for i, site in enumerate(sites, 1):
        domain = site['dominio']
        url = normalize_url(domain)

        # Mostra progresso
        elapsed = time.time() - start_time
        if i > 1:
            avg_time = elapsed / (i - 1)
            remaining = avg_time * (total - i + 1)
            remaining_min = remaining / 60
            print(f"\n[{i}/{total}] {site['nome']} ({domain}) - ~{remaining_min:.1f}min restantes")
        else:
            print(f"\n[{i}/{total}] {site['nome']} ({domain})")

        try:
            lighthouse_result = run_lighthouse_api(url, api_key)

            # Extrai temas do site
            temas = site.get('temas', [])
            if isinstance(temas, str):
                temas = [temas]

            if lighthouse_result:
                results.append({
                    'site_info': {
                        'id': site['id'],
                        'nome': site['nome'],
                        'slug': site['slug'],
                        'marca': site['marca'],
                        'dominio': domain,
                        'conta': site['conta'],
                        'temas': temas
                    },
                    'lighthouse': lighthouse_result
                })

                # Exibe scores
                categories = lighthouse_result.get('categories', {})
                perf = categories.get('performance', {}).get('score', 0) or 0
                seo = categories.get('seo', {}).get('score', 0) or 0
                print(f"  ✓ Performance: {int(perf * 100)} | SEO: {int(seo * 100)}")
                successful += 1
            else:
                # Erro - registra mas continua
                results.append({
                    'site_info': {
                        'id': site['id'],
                        'nome': site['nome'],
                        'slug': site['slug'],
                        'marca': site['marca'],
                        'dominio': domain,
                        'conta': site['conta'],
                        'temas': temas
                    },
                    'lighthouse': None,
                    'error': True
                })
                failed += 1

        except Exception as e:
            # Captura qualquer erro não previsto para não parar a execução
            print(f"  ✗ Erro crítico: {str(e)[:50]}")
            temas = site.get('temas', [])
            if isinstance(temas, str):
                temas = [temas]
            results.append({
                'site_info': {
                    'id': site['id'],
                    'nome': site['nome'],
                    'slug': site['slug'],
                    'marca': site['marca'],
                    'dominio': domain,
                    'conta': site['conta'],
                    'temas': temas
                },
                'lighthouse': None,
                'error': True
            })
            failed += 1

        # Delay entre requisições (exceto na última)
        if i < total:
            time.sleep(delay)

    # Resumo final
    total_time = (time.time() - start_time) / 60
    print("\n" + "=" * 60)
    print(f"Coleta finalizada em {total_time:.1f} minutos")
    print(f"  ✓ Sucesso: {successful}/{total}")
    print(f"  ✗ Falhas: {failed}/{total}")

    return results


def main():
    parser = argparse.ArgumentParser(description='Executa auditorias Lighthouse via PageSpeed Insights API')
    parser.add_argument('--excel', default='showroom_por_tema_real.xlsx', help='Caminho da planilha Excel')
    parser.add_argument('--limit', type=int, help='Limitar número de sites (para testes)')
    parser.add_argument('--output-dir', default='data/audits', help='Diretório de saída')
    parser.add_argument('--delay', type=float, default=DEFAULT_DELAY,
                       help=f'Delay entre requisições em segundos (padrão: {DEFAULT_DELAY})')

    args = parser.parse_args()

    # Verifica API key
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("Erro: GOOGLE_API_KEY não encontrada.")
        print("Crie um arquivo .env com: GOOGLE_API_KEY=sua_chave")
        print("Ou exporte: export GOOGLE_API_KEY=sua_chave")
        sys.exit(1)

    # Carrega sites
    print(f"Carregando sites de {args.excel}...")
    df = load_sites(args.excel)
    print(f"Total de sites com domínio: {len(df)}")

    # Executa auditorias
    raw_results = run_audits(df, api_key, args.limit, args.delay)

    # Analisa resultados
    print("\nAnalisando resultados...")
    analysis = analyze_results(raw_results)

    # Gera relatório
    print("Gerando relatório...")
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = output_dir / f'audit_{timestamp}.json'

    report = generate_report(raw_results, analysis)

    # Converte NaN para None antes de salvar (NaN não é válido em JSON)
    import math

    def clean_nan(obj):
        if isinstance(obj, dict):
            return {k: clean_nan(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [clean_nan(item) for item in obj]
        elif isinstance(obj, float) and math.isnan(obj):
            return None
        return obj

    report = clean_nan(report)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # Cria symlink para latest.json
    latest_file = output_dir / 'latest.json'
    if latest_file.exists() or latest_file.is_symlink():
        latest_file.unlink()
    latest_file.symlink_to(output_file.name)

    # Atualiza index.json com lista de auditorias
    audit_files = sorted(
        [f.name for f in output_dir.glob('audit_*.json')],
        reverse=True
    )
    index_file = output_dir / 'index.json'
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump({'audits': audit_files}, f, ensure_ascii=False, indent=2)

    # Copia para pasta do dashboard (se não for symlink para o mesmo diretório)
    dashboard_data_dir = Path('dashboard/public/data/audits')
    if dashboard_data_dir.exists():
        # Verifica se não é o mesmo diretório (symlink)
        try:
            if output_dir.resolve() != dashboard_data_dir.resolve():
                import shutil
                shutil.copy(output_file, dashboard_data_dir / output_file.name)
                shutil.copy(index_file, dashboard_data_dir / 'index.json')
                # Cria latest.json no dashboard também
                dashboard_latest = dashboard_data_dir / 'latest.json'
                if dashboard_latest.exists() or dashboard_latest.is_symlink():
                    dashboard_latest.unlink()
                dashboard_latest.symlink_to(output_file.name)
        except Exception:
            pass  # Ignora erros de cópia para o dashboard

    print(f"\nRelatório salvo em: {output_file}")
    print(f"\nResumo Final:")
    print(f"  Sites auditados: {report['metadata']['successful_audits']}/{report['metadata']['total_sites']}")
    print(f"  Performance média: {report['summary']['avg_performance']:.1f}")
    print(f"  SEO médio: {report['summary']['avg_seo']:.1f}")
    print(f"  Issues críticos: {len(report['common_issues']['critical'])}")
    print(f"  Issues frequentes: {len(report['common_issues']['frequent'])}")
    print(f"  Issues ocasionais: {len(report['common_issues']['occasional'])}")


if __name__ == '__main__':
    main()
