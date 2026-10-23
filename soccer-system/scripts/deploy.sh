#!/usr/bin/env bash
# 一键部署前端到 GitHub Pages
# 线上地址：https://raincyber777.github.io/soccer-system/
# 用法：bash scripts/deploy.sh   （或 npm run deploy）
# 首次部署后需到 GitHub 仓库：Settings → Pages → Source 选「Deploy from a branch」→ Branch 选 gh-pages / root
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_NAME="soccer-system"
PAGES_URL="https://raincyber777.github.io/$REPO_NAME/"

echo "==> [1/4] 构建生产包（base=/$REPO_NAME/）"
DEPLOY_BASE="$REPO_NAME" npx vite build

echo "==> [2/4] 生成 SPA 路由回退页 404.html（保证 /user/xxx 等深链接刷新不 404）"
cp dist/index.html dist/404.html

echo "==> [3/4] 在 dist 内做 gh-pages 临时提交"
REPO_URL="$(git remote get-url origin)"
rm -rf dist/.git
cd dist
git init -q -b gh-pages
git add -A
git commit -qm "deploy: $(date '+%Y-%m-%d %H:%M')"
git remote add origin "$REPO_URL"

echo "==> [4/4] 强制推送到 origin/gh-pages（只覆盖 gh-pages 分支，不影响 main/txy）"
git push -qf origin gh-pages
cd ..
rm -rf dist/.git

echo "✅ 部署完成，1-2 分钟后访问：$PAGES_URL"
