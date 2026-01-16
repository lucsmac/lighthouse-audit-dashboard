# Lighthouse Performance Audit Analysis

Sistema para auditar múltiplos sites usando a API PageSpeed Insights do Google, analisar os resultados e identificar padrões comuns de melhorias em Performance e SEO.

## Pré-requisitos

- Python 3.10+
- Node.js 18+
- Chave de API do Google (PageSpeed Insights)

## Instalação

### 1. Dependências Python

```bash
pip install -r requirements.txt
```

### 2. Configurar API Key

Crie um arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o `.env` e adicione sua chave:

```
GOOGLE_API_KEY=sua_chave_aqui
```

> Para obter uma chave: https://developers.google.com/speed/docs/insights/v5/get-started

### 3. Dashboard

```bash
cd dashboard
npm install
```

## Como Usar

### Executar Auditoria

```bash
# Teste com poucos sites
python src/lighthouse_runner.py --limit 5

# Auditoria completa (todos os 381 sites)
python src/lighthouse_runner.py

# Especificar planilha diferente
python src/lighthouse_runner.py --excel minha_planilha.xlsx

# Ajustar delay entre requisições (padrão: 1s)
python src/lighthouse_runner.py --delay 2
```

O script irá:
1. Ler os domínios da planilha Excel
2. Executar o Lighthouse para cada site
3. Analisar e classificar os issues por frequência
4. Salvar o resultado em `data/audits/audit_YYYYMMDD_HHMMSS.json`

### Visualizar Resultados

```bash
cd dashboard
npm run dev
```

Acesse http://localhost:5173 no navegador.

## Estrutura do Relatório

Os issues são classificados em três categorias:

| Categoria | Frequência | Descrição |
|-----------|------------|-----------|
| **Críticos** | >70% dos sites | Problemas que afetam a maioria dos sites |
| **Frequentes** | 30-70% dos sites | Problemas comuns em parte dos sites |
| **Ocasionais** | <30% dos sites | Problemas esporádicos |

## Estrutura de Arquivos

```
performance_audit_analysis/
├── src/
│   ├── lighthouse_runner.py    # Script principal (usa PageSpeed API)
│   ├── data_analyzer.py        # Análise de dados
│   └── report_generator.py     # Geração de relatório
├── dashboard/                  # Dashboard React
├── data/
│   └── audits/                 # JSONs gerados
├── .env                        # Chave da API (não commitado)
├── .env.example                # Exemplo de configuração
├── requirements.txt
└── showroom_por_tema_real.xlsx # Planilha com sites
```

## Formato da Planilha

A planilha Excel deve conter as seguintes colunas:

| Coluna | Descrição |
|--------|-----------|
| id | Identificador único |
| nome | Nome do site |
| slug | Slug do site |
| marca | Marca (ex: Toyota, Honda) |
| dominio | Domínio do site (ex: exemplo.com.br) |
| conta | Nome da conta/grupo |

## Dashboard

O dashboard oferece:

- **Score Cards**: Médias de Performance e SEO, Core Web Vitals
- **Tabela de Issues**: Lista de problemas por categoria
- **Filtro por Marca**: Visualizar dados de uma marca específica
- **Gráfico por Marca**: Comparativo de scores entre marcas
- **Lista de Sites**: Todos os sites com scores e issues
- **Histórico**: Seletor para visualizar auditorias anteriores

## Exemplo de Saída

```
Carregando sites de showroom_por_tema_real.xlsx...
Total de sites com domínio: 381

Iniciando auditoria de 5 sites...
==================================================

[1/5] Douramotors (douramotors.com.br)
  Performance: 45 | SEO: 92

[2/5] H Motors (hmotors.com.br)
  Performance: 38 | SEO: 85

...

Analisando resultados...
Gerando relatório...

Relatório salvo em: data/audits/audit_20240115_143022.json

Resumo:
  Sites auditados: 5/5
  Performance média: 41.2
  SEO médio: 88.4
  Issues críticos: 3
  Issues frequentes: 7
  Issues ocasionais: 12
```
