# Monitoramento de Automações

Dashboard React com 3 abas conectadas ao Supabase, seguindo o padrão visual dos dashboards Maida.

## Abas

| Aba | Tabela | Descrição |
|-----|--------|-----------|
| Regulações | `public.regulacoes` | Guias reguladas, procedimentos, gráfico e exportação |
| Execuções RM/TC | `public.execucoes_rmtc` | Processos RM e TC com filtro por tipo |
| Aprovador de Itens | `public.aprovador_itens` | Itens aprovados/glosados por prestador e lote |

Todas as abas possuem: filtro por período, busca por texto, exportação para Excel e tabela com scroll.

## Configuração local

1. Instale as dependências:
```
npm install
```

2. Crie o arquivo .env na raiz do projeto:
```
VITE_SUPABASE_URL=https://XXXXXXXXXXXXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

3. Rode em desenvolvimento:
```
npm run dev
```

## Deploy no Vercel

1. Suba o projeto para um repositório GitHub
2. Importe o repositório no Vercel
3. Em Environment Variables, adicione:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
4. Clique em Deploy

Use sempre a chave anon (pública) do Supabase.
