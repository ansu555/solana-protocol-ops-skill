#!/bin/bash
# Solana Protocol Ops & Incident Response Skill — Standard Installer
# Installs to the personal Claude config (~/.claude) with recommended defaults.
# For project-local install or other options, use ./install-custom.sh
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="solana-protocol-ops"

CLAUDE_DIR="$HOME/.claude"
SKILL_PATH="$CLAUDE_DIR/skills/$SKILL_NAME"
AGENTS_DIR="$CLAUDE_DIR/agents"
COMMANDS_DIR="$CLAUDE_DIR/commands"
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"

SKIP_CONFIRM=false
[ "$1" = "-y" ] || [ "$1" = "--yes" ] && SKIP_CONFIRM=true

echo ""
echo -e "${CYAN}Solana Protocol Ops & Incident Response — Standard Install${NC}"
echo -e "  skill     → ${CYAN}$SKILL_PATH${NC}"
echo -e "  agents    → ${CYAN}$AGENTS_DIR${NC} (prefixed ${SKILL_NAME}-)"
echo -e "  commands  → ${CYAN}$COMMANDS_DIR${NC}"
echo -e "  CLAUDE.md → ${CYAN}$CLAUDE_MD${NC}"
echo ""
echo -e "  ${YELLOW}Requires the Helius MCP (HELIUS_API_KEY); Surfpool MCP optional.${NC}"
echo -e "  ${YELLOW}Both ship with the Solana AI Kit's .mcp.json.${NC}"
echo ""

if [ "$SKIP_CONFIRM" = false ]; then
    read -p "Proceed? [Y/n] " -n 1 -r; echo
    [[ $REPLY =~ ^[Nn]$ ]] && { echo -e "${YELLOW}Cancelled.${NC}"; exit 0; }
fi

mkdir -p "$SKILL_PATH" "$AGENTS_DIR" "$COMMANDS_DIR"

echo -e "${CYAN}[1/4]${NC} Skill files..."
rm -rf "${SKILL_PATH:?}/"* 2>/dev/null || true
cp -r "$SCRIPT_DIR/skill/"* "$SKILL_PATH/"
echo -e "  ${GREEN}✓${NC} $SKILL_PATH"

echo -e "${CYAN}[2/4]${NC} Agents..."
for f in "$SCRIPT_DIR"/agents/*.md; do
    [ -e "$f" ] || continue
    cp "$f" "$AGENTS_DIR/${SKILL_NAME}-$(basename "$f")"
done
echo -e "  ${GREEN}✓${NC} $AGENTS_DIR"

echo -e "${CYAN}[3/4]${NC} Commands..."
for f in "$SCRIPT_DIR"/commands/*.md; do
    [ -e "$f" ] || continue
    cp "$f" "$COMMANDS_DIR/$(basename "$f")"
done
echo -e "  ${GREEN}✓${NC} $COMMANDS_DIR"

echo -e "${CYAN}[4/4]${NC} CLAUDE.md..."
if [ -f "$CLAUDE_MD" ]; then
    cp "$CLAUDE_MD" "$CLAUDE_MD.backup"
    echo -e "  ${YELLOW}→${NC} backed up existing to CLAUDE.md.backup"
fi
cp "$SCRIPT_DIR/CLAUDE.md" "$CLAUDE_MD"
echo -e "  ${GREEN}✓${NC} $CLAUDE_MD"

echo ""
echo -e "${GREEN}Installation complete.${NC} Try: \"Set up monitoring for my program <id>\" or /watch <program-id>"
echo ""
