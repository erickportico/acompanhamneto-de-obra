# Migração do Painel — JSON → tabelas Supabase

Pacote para migrar o blob `painel_dados.dados` para tabelas normalizadas com RLS.

## Arquivos

| Arquivo | Função |
|---------|--------|
| `001_schema_e_rls.sql` | Cria tabelas, mapas de ID e políticas RLS |
| `migrate.js` | Lê o JSON e grava nas tabelas |
| `validate.js` | Compara contagens JSON × banco |
| `.env.example` | Modelo de configuração |
| `package.json` | Dependências Node |

## Pré-requisitos

1. Node.js 18+
2. Projeto Supabase com a tabela `painel_dados` preenchida
3. **service_role key** (Dashboard → Project Settings → API)
4. Ideal: pelo menos 1 usuário admin em `painel_perfis`

## Passo a passo

### 1. Configurar ambiente

```bash
cd migracao-painel
cp .env.example .env
# Edite .env e cole a SERVICE_ROLE_KEY
npm install
```

### 2. Criar schema no Supabase

1. Abra o **SQL Editor** do Supabase
2. Cole o conteúdo de `001_schema_e_rls.sql`
3. Execute

### 3. Simular a migração (não grava)

```bash
npm run dry
```

Isso gera um arquivo `backup_painel_dados_....json` local e imprime contagens.

### 4. Migrar de verdade

```bash
npm run migrate
```

### 5. Validar

```bash
npm run validate
```

## Segurança

- Use **apenas** a `service_role` neste script (nunca no frontend).
- Não publique o arquivo `.env`.
- O `painel_dados` original **não é apagado** — fica como backup na nuvem.

## Problemas comuns

| Erro | Solução |
|------|---------|
| `painel_dados vazio` | Confira `PAINEL_DADOS_ID` (pode não ser 1) |
| `relation obras does not exist` | Rode `001_schema_e_rls.sql` antes |
| Obras sumiram para usuários | Falta admin em `obra_membros` / `painel_perfis` |
| RLS bloqueia no app | Normal: o app usa anon key; precisa login + membro da obra |

## Próximos passos (depois da migração)

1. Manter o painel lendo o JSON até validar
2. Criar RPC `get_banco_legado()` ou adaptar o frontend
3. Só então desligar a escrita no blob único
