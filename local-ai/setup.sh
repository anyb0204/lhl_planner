#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Local AI Helper — Setup          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# 1. Check Node >= 18
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js not found.${NC}"
  echo "  Install from: https://nodejs.org (v18 or newer)"
  exit 1
fi
NODE_VER=$(node -e "process.exit(parseInt(process.versions.node.split('.')[0]) < 18 ? 1 : 0)" 2>/dev/null && echo "ok" || echo "old")
if [[ "$NODE_VER" == "old" ]]; then
  echo -e "${RED}✗ Node.js 18+ required. You have: $(node -v)${NC}"
  echo "  Update at: https://nodejs.org"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# 2. Install npm deps
echo -e "\n${YELLOW}Installing dependencies…${NC}"
if command -v npm &>/dev/null; then
  npm install --prefix "$(dirname "$0")"
else
  echo -e "${RED}✗ npm not found.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 3. Check / install Ollama
echo ""
if command -v ollama &>/dev/null; then
  echo -e "${GREEN}✓ Ollama already installed $(ollama --version 2>/dev/null || '')${NC}"
else
  echo -e "${YELLOW}Ollama not found. Installing…${NC}"
  OS="$(uname -s)"
  if [[ "$OS" == "Darwin" ]]; then
    if command -v brew &>/dev/null; then
      brew install ollama
    else
      echo -e "${YELLOW}  Download Ollama for Mac from: https://ollama.com/download${NC}"
      echo "  Then re-run this script."
      exit 1
    fi
  elif [[ "$OS" == "Linux" ]]; then
    curl -fsSL https://ollama.com/install.sh | sh
  else
    echo -e "${YELLOW}  Windows: Download from https://ollama.com/download${NC}"
    echo "  Then re-run this script."
    exit 1
  fi
  echo -e "${GREEN}✓ Ollama installed${NC}"
fi

# 4. Pull default model if none exist
echo ""
EXISTING_MODELS=$(ollama list 2>/dev/null | tail -n +2 | wc -l | tr -d ' ')
if [[ "$EXISTING_MODELS" == "0" ]]; then
  echo -e "${YELLOW}No models found. Pulling llama3.2 (~2GB, good for most hardware)…${NC}"
  echo "  Tip: For faster/smaller use 'llama3.2:1b', for better quality use 'mistral' or 'llama3.1:8b'"
  echo ""
  ollama pull llama3.2
  echo -e "${GREEN}✓ llama3.2 ready${NC}"
else
  echo -e "${GREEN}✓ Found $EXISTING_MODELS model(s) already installed${NC}"
  ollama list 2>/dev/null | head -6
fi

# 5. Done
echo ""
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo ""
echo -e "  To start your local AI:"
echo -e ""
echo -e "  ${YELLOW}1. Start Ollama (if not running):${NC}"
echo -e "     ollama serve"
echo ""
echo -e "  ${YELLOW}2. Start the AI server:${NC}"
echo -e "     cd local-ai && npm start"
echo ""
echo -e "  ${YELLOW}3. Open in browser:${NC}"
echo -e "     Computer: http://localhost:3737"
echo -e "     Phone:    http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'YOUR_IP'):3737"
echo -e "     (Phone must be on same WiFi as this computer)"
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""
