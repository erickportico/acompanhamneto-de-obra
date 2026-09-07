# Migração em Python (Windows)

## 1. Instalar dependências

Abra o **CMD** na pasta `migracao-painel`:

```bat
cd "C:\Users\OBRAS 8\Desktop\ACOPANHAMENTO DE OBRAS\migracao-painel"
python -m pip install -r requirements.txt
```

## 2. Criar o arquivo .env

```bat
copy .env.example .env
```

Abra o `.env` no Bloco de Notas e preencha:

```env
SUPABASE_URL=https://hosvxzayiuklouhrqeuv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=cole_a_service_role_aqui
PAINEL_DADOS_ID=1
DRY_RUN=true
```

A chave **service_role** fica em:
Supabase → Project Settings → API → `service_role` (secret).

## 3. Criar as tabelas no Supabase

1. Abra o Supabase no navegador
2. SQL Editor
3. Cole o conteúdo de `001_schema_e_rls.sql`
4. Run

## 4. Simular (não grava)

```bat
python migrate.py
```

Com `DRY_RUN=true` só gera backup e relatório.

## 5. Migrar de verdade

```bat
set DRY_RUN=false
python migrate.py
```

## 6. Validar

```bat
python validate.py
```

## Observações

- O `index.html` **não muda** — continua usando o JSON em `painel_dados`.
- O script **não apaga** o blob antigo.
- Use só a **service_role** no `.env`, nunca no HTML.
