#!/bin/bash
# ================================================
# Dependency Managers Security & Delay Settings Checker + Auto-Fix
# ================================================

echo "🔍 Dependency Managers Security & Delay Settings Checker"
echo "================================================"
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ask for confirmation before writing
prompt_to_add() {
    local manager="$1"
    local file="$2"
    local setting="$3"
    local value="$4"

    echo -e "${YELLOW}→ $manager is missing: $setting${NC}"
    read -p "   Add this setting? (y/N): " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then
        mkdir -p "$(dirname "$file")" 2>/dev/null
        echo "$setting" >> "$file"
        echo -e "   ${GREEN}✓ Added to $file${NC}"
        return 0
    else
        echo -e "   ${RED}Skipped${NC}"
        return 1
    fi
}

check_and_fix() {
    local file="$1"
    local key="$2"
    local value="$3"
    local manager="$4"
    local comment="${5:-}"

    if [[ -f "$file" ]] && grep -q "^[[:space:]]*$key" "$file" 2>/dev/null; then
        echo -e "✅ ${GREEN}$manager: $key is set${NC}"
    else
        if [[ -f "$file" ]]; then
            echo -e "❌ ${RED}$manager: $key is missing${NC}"
        else
            echo -e "❌ ${RED}$manager: Config file not found ($file)${NC}"
        fi
        prompt_to_add "$manager" "$file" "$key=$value" "$value"
    fi
}

# ==================== USER-LEVEL CONFIGS ====================

echo -e "${BLUE}=== User-level Configurations ===${NC}\n"

# npm
echo "npm"
check_and_fix "$HOME/.npmrc" "min-release-age" "7" "npm"

# pnpm (via .npmrc)
echo -e "\npnpm"
check_and_fix "$HOME/.npmrc" "ignore-scripts" "true" "pnpm (ignore-scripts)"
check_and_fix "$HOME/.npmrc" "minimum-release-age" "10080" "pnpm (delay)"
check_and_fix "$HOME/.npmrc" "block-exotic-subdeps" "true" "pnpm"
check_and_fix "$HOME/.npmrc" "trust-policy" "no-downgrade" "pnpm"
check_and_fix "$HOME/.npmrc" "strict-dep-builds" "true" "pnpm"

# Yarn
echo -e "\nYarn"
check_and_fix "$HOME/.yarnrc.yml" "npmMinimalAgeGate" "\"7d\"" "Yarn"

# Bun
echo -e "\nBun"
if [[ ! -f "$HOME/.bunfig.toml" ]] || ! grep -q "minimumReleaseAge" "$HOME/.bunfig.toml" 2>/dev/null; then
    if prompt_to_add "Bun" "$HOME/.bunfig.toml" "install.minimumReleaseAge = 604800" ""; then
        echo "# Security settings added by deps checker" >> "$HOME/.bunfig.toml" 2>/dev/null || true
    fi
else
    echo -e "✅ ${GREEN}Bun: minimumReleaseAge is set${NC}"
fi

# uv
echo -e "\nuv"
if [[ ! -f "$HOME/.config/uv/uv.toml" ]] || ! grep -q "exclude-newer" "$HOME/.config/uv/uv.toml" 2>/dev/null; then
    if prompt_to_add "uv" "$HOME/.config/uv/uv.toml" 'exclude-newer = "7 days"' ""; then
        echo "# Security settings added by deps checker" >> "$HOME/.config/uv/uv.toml" 2>/dev/null || true
    fi
else
    echo -e "✅ ${GREEN}uv: exclude-newer is set${NC}"
fi

# ==================== PROJECT-LEVEL (Current Directory) ====================

echo -e "\n${BLUE}=== Project-level files (current directory) ===${NC}\n"

if [[ -f "package.json" ]]; then
    echo "Project detected (package.json found)"

    # Local .npmrc
    if [[ ! -f ".npmrc" ]] || ! grep -q "minimum-release-age\|ignore-scripts" ".npmrc" 2>/dev/null; then
        echo -e "❌ ${RED}Local .npmrc is missing recommended settings${NC}"
        read -p "   Create/append recommended settings to .npmrc? (y/N): " choice
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            cat >> .npmrc << EOF

# Security & Delay Settings
ignore-scripts=true
minimum-release-age=10080
min-release-age=7
EOF
            echo -e "   ${GREEN}✓ Added settings to .npmrc${NC}"
        fi
    else
        echo -e "✅ ${GREEN}Local .npmrc found with some settings${NC}"
    fi

    # Local pnpm-workspace.yaml
    if [[ -f "pnpm-workspace.yaml" ]]; then
        echo -e "✅ ${GREEN}pnpm-workspace.yaml found${NC}"
    fi
else
    echo "No package.json found in current directory — skipping project-level checks."
fi

echo -e "\n${GREEN}Check completed!${NC}"
echo -e "${YELLOW}Tip: Re-run this script after changes or in other projects.${NC}"