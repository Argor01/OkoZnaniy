#!/bin/sh
set -eu
LOG=/var/log/okoznaniy-rootkit-scan.log
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT INT TERM
log(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; logger -t okoznaniy-rootkit -- "$*"; }
log 'rootkit/integrity scan started'
chkrootkit > "$TMP/chk" 2>&1 || true
# Ignore generic hidden package files and normal ifpromisc warning; require an actual infection signature.
if grep -E 'INFECTED|Possible Linux\.|Vulnerable' "$TMP/chk" | grep -v 'not infected' > "$TMP/chk-alert"; then
  cat "$TMP/chk-alert" >> "$LOG"; log 'CRITICAL chkrootkit alert'; exit 1
fi
rkhunter --check --sk --nocolors > "$TMP/rkh" 2>&1 || true
if grep -Eq 'Possible rootkits: *[1-9]|Suspect files: *[1-9]' "$TMP/rkh"; then
  cat "$TMP/rkh" >> "$LOG"; log 'CRITICAL rkhunter alert'; exit 1
fi
debsums -s > "$TMP/debsums" 2>&1 || true
if [ -s "$TMP/debsums" ]; then
  cat "$TMP/debsums" >> "$LOG"; log 'WARNING package checksum changes detected'; exit 1
fi
log 'ROOTKIT_INTEGRITY_OK'
