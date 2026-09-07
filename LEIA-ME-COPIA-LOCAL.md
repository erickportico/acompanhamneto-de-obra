# Cópia no PC + nuvem

O painel continua gravando no **Supabase**.
O servidor Express grava também em:

```
ACOPANHAMENTO DE OBRAS\data\banco.json
```

Backups extras em:

```
ACOPANHAMENTO DE OBRAS\data\backups\
```

## Instalação

1. Copie `server.js` e `sync-local.js` para a pasta do painel
   (substitua o `server.js` antigo).
2. No `index.html`, no final, **antes** de `</body>`, acrescente:

```html
<script src="/sync-local.js"></script>
```

3. Pare o servidor (Ctrl+C) e suba de novo:

```bat
npm start
```

4. Abra http://127.0.0.1:8080/index.html

## Conferir

No console do navegador (F12):

```
[copia-local] ativo
[copia-local] gravado em data/banco.json
```

No PC, a pasta `data` deve aparecer depois do primeiro save.

## Restaurar do PC

Se a nuvem falhar, o arquivo `data\banco.json` é o backup local.
Use Banco Compartilhado → Importar, ou copie o JSON de `dados` de dentro do arquivo.
