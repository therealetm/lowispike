#!/usr/bin/env bash
# Regenerate docs/HANDOFF-NEXT-MAYA.pdf from docs/HANDOFF-NEXT-MAYA.md (MAYA-HANDOFF.md section 0.20).
#   bash /home/sprite/wt-harness/tools-vm/handoff-pdf.sh [repo worktree, default: current directory]
# Needs /tmp/pw with playwright + marked:  mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright marked && npx playwright install chromium
# Then land both files docs-only via scripts/push-main.sh, email the PDF to Emmanuel's Gmail and send it in the chat.
set -euo pipefail
R=${1:-$(pwd)}
md="$R/docs/HANDOFF-NEXT-MAYA.md"; pdf="$R/docs/HANDOFF-NEXT-MAYA.pdf"
[ -f "$md" ] || { echo "no $md"; exit 1; }
node "$(dirname "$0")/topdf.cjs" "$md" "$pdf" "LOWiSPIKE handoff for the next Maya, $(TZ=Europe/Berlin date '+%d %b %Y %H:%M')"
echo "wrote $pdf"
