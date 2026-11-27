#!/usr/bin/env bash
set -euo pipefail

version=8.30.1
checksum=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb
archive=$(mktemp)
trap 'rm -f "$archive"' EXIT

curl -fsSL -o "$archive" "https://github.com/gitleaks/gitleaks/releases/download/v${version}/gitleaks_${version}_linux_x64.tar.gz"
printf '%s  %s\n' "$checksum" "$archive" | sha256sum --check
tar -xzf "$archive" gitleaks
