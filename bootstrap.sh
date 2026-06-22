#!/bin/bash
# Solana Protocol Ops & Incident Response Skill — curl Bootstrap
# One-liner install:
#   curl -fsSL https://raw.githubusercontent.com/ansu555/solana-protocol-ops-skill/main/bootstrap.sh | bash
#
# Clones the repo to a temp dir and runs the standard installer (install.sh)
# into ~/.claude. Any args after `bash -s --` are forwarded to install.sh,
# e.g. to skip the confirm prompt:
#   curl -fsSL .../bootstrap.sh | bash -s -- -y
set -euo pipefail

REPO="https://github.com/ansu555/solana-protocol-ops-skill"
BRANCH="${BOOTSTRAP_BRANCH:-main}"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

command -v git >/dev/null 2>&1 || {
    echo -e "${RED}Error:${NC} git is required but not found on PATH." >&2
    exit 1
}

TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo -e "${CYAN}Fetching solana-protocol-ops-skill (${BRANCH})...${NC}"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$TMP_DIR" >/dev/null 2>&1 || {
    echo -e "${RED}Error:${NC} failed to clone $REPO ($BRANCH)." >&2
    exit 1
}

chmod +x "$TMP_DIR/install.sh"
echo -e "${GREEN}✓${NC} Clone complete. Running installer...\n"

# When piped (curl | bash) stdin is the pipe, not a terminal, so install.sh's
# interactive confirm prompt can't be answered and would abort. The user already
# opted in by running this command, so auto-confirm in that case. If no args were
# given and we DO have a terminal, leave it interactive.
if [ "$#" -eq 0 ] && [ ! -t 0 ]; then
    set -- -y
fi
"$TMP_DIR/install.sh" "$@"
