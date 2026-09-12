#!/usr/bin/env bash
set -Eeuo pipefail

# Uso:
#   bash subir-correcao-git.sh
#   bash subir-correcao-git.sh "main"
#
# O script não adiciona backups, index-audit ou arquivos temporários.

BRANCH="${1:-}"

if ! command -v git >/dev/null 2>&1; then
  echo "ERRO: Git não está instalado ou não está no PATH." >&2
  exit 1
fi

if [ ! -d .git ]; then
  echo "ERRO: esta pasta não parece ser um repositório Git." >&2
  echo "Execute o script dentro da pasta que contém a pasta .git." >&2
  exit 1
fi

if [ ! -f index.html ]; then
  echo "ERRO: index.html não foi encontrado na pasta atual." >&2
  exit 1
fi

# Arquivos permitidos nesta correção.
FILES=("index.html")
[ -f patch_correcao.js ] && FILES+=("patch_correcao.js")
[ -f patch_relocate_header_buttons.js ] && FILES+=("patch_relocate_header_buttons.js")

# Verificação de sintaxe do patch externo, quando presente.
if [ -f patch_correcao.js ] && command -v node >/dev/null 2>&1; then
  node --check patch_correcao.js
fi

# Impede envio de tokens da corrupção antiga.
if grep -nE 'pronto=t rue|d ocument|U RL|J SON|n ew' index.html; then
  echo "ERRO: tokens corrompidos ainda existem no index.html." >&2
  exit 1
fi

# Mostra o estado antes de qualquer alteração.
echo "Arquivos que serão adicionados ao commit:"
printf '  %s\n' "${FILES[@]}"

echo
git status --short

# Adiciona somente os arquivos permitidos.
git add -- "${FILES[@]}"

# Valida espaços em branco e erro comum no diff.
if ! git diff --cached --check; then
  echo "ERRO: o diff contém problemas de espaços em branco." >&2
  git reset -- "${FILES[@]}"
  exit 1
fi

if git diff --cached --quiet; then
  echo "Nenhuma alteração nova para commit nos arquivos permitidos."
  exit 0
fi

echo
echo "Resumo do commit:"
git diff --cached --stat

echo
git diff --cached --name-status

echo
read -r -p "Continuar com o commit? [s/N] " ANSWER
if [[ ! "$ANSWER" =~ ^[sS]$ ]]; then
  git reset -- "${FILES[@]}"
  echo "Operação cancelada antes do commit."
  exit 0
fi

git commit -m "Corrige sintaxe do Diário de Obra"

if [ -z "$BRANCH" ]; then
  BRANCH="$(git branch --show-current)"
fi

if [ -z "$BRANCH" ]; then
  echo "ERRO: não foi possível identificar a branch atual." >&2
  exit 1
fi

echo
echo "Commit criado na branch: $BRANCH"
read -r -p "Enviar agora para o remoto com git push? [s/N] " PUSH
if [[ "$PUSH" =~ ^[sS]$ ]]; then
  git push origin "$BRANCH"
  echo "Push concluído."
else
  echo "Commit local concluído. Push não executado."
  echo "Para enviar depois: git push origin $BRANCH"
fi
