#!/bin/sh
set -eu
# Non-locking SSH hardening. Password login remains until the owner verifies key-only access.
cat >/etc/ssh/sshd_config.d/60-okoznaniy-hardening.conf <<'EOF'
MaxAuthTries 3
LoginGraceTime 20
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no
PermitEmptyPasswords no
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
sshd -t
systemctl reload ssh

# Stronger brute-force handling.
mkdir -p /etc/fail2ban/jail.d
cat >/etc/fail2ban/jail.d/okoznaniy-sshd.local <<'EOF'
[sshd]
enabled = true
maxretry = 3
findtime = 10m
bantime = 24h
bantime.increment = true
bantime.factor = 2
bantime.maxtime = 7d
EOF
systemctl restart fail2ban

# UFW rate-limits new SSH connections; web stays open.
ufw --force delete allow OpenSSH >/dev/null 2>&1 || true
ufw limit OpenSSH >/dev/null
ufw --force enable >/dev/null

# Automatically apply security updates, not arbitrary feature upgrades.
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades apt-listchanges
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
cat >/etc/apt/apt.conf.d/52okoznaniy-unattended <<'EOF'
Unattended-Upgrade::Allowed-Origins {
  "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
EOF

echo HOST_HARDENING_OK
