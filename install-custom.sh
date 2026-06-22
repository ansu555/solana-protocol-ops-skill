#!/bin/bash
# Solana Protocol Ops & Incident Response Skill — Custom Installer
# Usage: ./install-custom.sh [--project | --path <dir>]
#   (no flag)        install to personal config: ~/.claude
#   --project        install to project-local: ./.claude
#   --path <dir>     install under <dir>/.claude
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="solana-protocol-ops"

ROOT="$HOME"
DIRNAME=".claude"
COPY_AGENTS_MD=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --project) ROOT="$(pwd)"; COPY_AGENTS_MD=true; shift ;;
        --path)    ROOT="$2";     COPY_AGENTS_MD=true; shift 2 ;;
        --agents)  DIRNAME=".agents"; shift ;;   # use .agents instead of .claude (Codex / non-Claude tools)
        -h|--help) echo "Usage: ./install-custom.sh [--project | --path <dir>] [--agents]"; exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done
BASE="$ROOT/$DIRNAME"

SKILL_PATH="$BASE/skills/$SKILL_NAME"
AGENTS_DIR="$BASE/agents"
COMMANDS_DIR="$BASE/commands"
CLAUDE_MD="$BASE/CLAUDE.md"

echo ""
echo -e "${CYAN}Custom install → base: $BASE${NC}"
echo -e "  skill    → $SKILL_PATH"
echo -e "  agents   → $AGENTS_DIR (prefixed ${SKILL_NAME}-)"
echo -e "  commands → $COMMANDS_DIR"
echo -e "  CLAUDE.md→ $CLAUDE_MD"
echo ""
read -p "Proceed? [Y/n] " -n 1 -r; echo
[[ $REPLY =~ ^[Nn]$ ]] && { echo -e "${YELLOW}Cancelled.${NC}"; exit 0; }

mkdir -p "$SKILL_PATH" "$AGENTS_DIR" "$COMMANDS_DIR"

rm -rf "${SKILL_PATH:?}/"* 2>/dev/null || true
cp -r "$SCRIPT_DIR/skill/"* "$SKILL_PATH/"
for f in "$SCRIPT_DIR"/agents/*.md;   do [ -e "$f" ] && cp "$f" "$AGENTS_DIR/${SKILL_NAME}-$(basename "$f")"; done
for f in "$SCRIPT_DIR"/commands/*.md; do [ -e "$f" ] && cp "$f" "$COMMANDS_DIR/$(basename "$f")"; done
[ -f "$CLAUDE_MD" ] && cp "$CLAUDE_MD" "$CLAUDE_MD.backup"
cp "$SCRIPT_DIR/CLAUDE.md" "$CLAUDE_MD"

if [ "$COPY_AGENTS_MD" = true ] && [ -f "$SCRIPT_DIR/AGENTS.md" ]; then
    [ -f "$ROOT/AGENTS.md" ] && cp "$ROOT/AGENTS.md" "$ROOT/AGENTS.md.backup"
    sed "s#(skill/#(${DIRNAME}/skills/${SKILL_NAME}/#g" "$SCRIPT_DIR/AGENTS.md" > "$ROOT/AGENTS.md"
    echo -e "${GREEN}✓${NC} AGENTS.md → $ROOT/AGENTS.md (Codex / non-Claude entry)"
fi

echo -e "${GREEN}✓ Done.${NC} Installed to $BASE"
