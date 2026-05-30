#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

# get version from argument or prompt
if [ -n "$1" ]; then
  VERSION="$1"
else
  read -p "Version (e.g. 2.2.0): " VERSION
fi

if [ -z "$VERSION" ]; then
  echo -e "${RED}No version provided${RESET}"
  exit 1
fi

# strip leading v if provided
VERSION="${VERSION#v}"

echo -e "\n${BOLD}Releasing v${VERSION}...${RESET}\n"

echo -e "${BLUE}==>${RESET} Committing"
git add .
git commit -m "v${VERSION}"

echo -e "${BLUE}==>${RESET} Pushing main"
git push origin main

echo -e "${BLUE}==>${RESET} Tagging v${VERSION}"
git tag "v${VERSION}"
git push origin "v${VERSION}"

echo -e "\n${GREEN}${BOLD}✓ Released v${VERSION} - GitHub Actions build triggered${RESET}\n"