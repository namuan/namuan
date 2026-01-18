# Securing A VPS In 5 Minutes

Our servers are configured with two accounts: root and deploy. The deploy user has sudo access via an arbitrarily long password and is the account that developers log into. Developers log in with their public keys (preferably Ed25519), not passwords, so administration is as simple as keeping the *authorized_keys* file up-to-date across servers. Root login over ssh is disabled, and the deploy user can only log in from our office IP block.

## Prerequisites

- A fresh VPS running **Ubuntu 22.04 LTS** or **Ubuntu 24.04 LTS**
- Root access via SSH or web console
- Your local machine's SSH public key (preferably Ed25519)

## Let's Get Started

Our box is freshly hatched, virgin pixels at the prompt. I favor Ubuntu; if you use another version of linux, your commands may vary. Five minutes to go:

```bash
passwd
```

Change the root password to something long and complex. You won't need to remember it, just store it somewhere secure - this password will only be needed if you lose the ability to log in over ssh or lose your sudo password.

```bash
apt update && apt upgrade -y
```

The above gets us started on the right foot.

## Install Fail2ban

```bash
apt install fail2ban -y
```

[Fail2ban](https://www.fail2ban.org/) is a daemon that monitors login attempts to a server and blocks suspicious activity as it occurs. It's well configured out of the box, but let's create a local configuration:

```bash
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

Edit the local config to customize settings:

```bash
vim /etc/fail2ban/jail.local
```

Update these settings under `[sshd]`:

```ini
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
```

Then restart fail2ban:

```bash
systemctl enable fail2ban
systemctl restart fail2ban
```

## Create Deploy User

Now, let's set up your login user. Feel free to name the user something besides 'deploy', it's just a convention we use:

```bash
adduser deploy
usermod -aG sudo deploy
```

Set up SSH directory:

```bash
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
```

## Require Public Key Authentication

The days of passwords are over. You'll enhance security and ease of use in one fell swoop by ditching those passwords and employing [public key authentication](https://en.wikipedia.org/wiki/Public-key_cryptography) for your user accounts.

**On your local machine**, generate an Ed25519 key if you don't have one:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Copy your public key to the server:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@your-server-ip
```

Or manually add your public key:

```bash
vim /home/deploy/.ssh/authorized_keys
```

Add the contents of the `id_ed25519.pub` (or `id_rsa.pub`) from your local machine.

```bash
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

## Test The New User

Now test your new account by logging into your server with the deploy user (keep the terminal window with the root login open):

```bash
ssh deploy@your-server-ip
```

If you're successful, verify sudo works:

```bash
sudo whoami
```

## Lock Down SSH

Configure ssh to prevent password & root logins. First, backup the original config:

```bash
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
```

Edit the SSH config:

```bash
vim /etc/ssh/sshd_config
```

Update or add these lines:

```bash
# Disable root login
PermitRootLogin no

# Disable password authentication
PasswordAuthentication no

# Disable empty passwords
PermitEmptyPasswords no

# Enable public key authentication
PubkeyAuthentication yes

# Disable X11 forwarding (unless needed)
X11Forwarding no

# Set max authentication attempts
MaxAuthTries 3

# Disable challenge-response authentication
KbdInteractiveAuthentication no

# Use strong key exchange algorithms
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512

# Use strong ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com

# Use strong MACs
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com

# Optional: Restrict to specific users
# AllowUsers deploy

# Optional: Change SSH port (uncomment and set your port)
# Port 2222
```

Validate the config before restarting:

```bash
sshd -t
```

If no errors, restart SSH:

```bash
systemctl restart sshd
```

**Important:** Keep your current session open and test a new SSH connection before closing!

## Set Up A Firewall

No secure server is complete without a firewall. Ubuntu provides ufw, which makes firewall management easy:

```bash
# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (adjust port if you changed it)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Optional: Rate limit SSH connections
ufw limit 22/tcp

# Enable the firewall
ufw enable

# Check status
ufw status verbose
```

This sets up a basic firewall and configures the server to accept traffic over port 22, 80, and 443. You may wish to add more ports depending on what your server is going to do.

## Enable Automatic Security Updates

Automated security updates are essential for keeping your server patched:

```bash
apt install unattended-upgrades apt-listchanges -y
```

Configure automatic updates:

```bash
dpkg-reconfigure -plow unattended-upgrades
```

Select "Yes" when prompted.

For more control, edit the configuration:

```bash
vim /etc/apt/apt.conf.d/50unattended-upgrades
```

Ensure these lines are uncommented and configured:

```bash
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

// Automatically reboot if required
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";

// Remove unused dependencies
Unattended-Upgrade::Remove-Unused-Dependencies "true";
```

Enable the periodic updates:

```bash
vim /etc/apt/apt.conf.d/20auto-upgrades
```

Ensure it contains:

```bash
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
```

## Set Up Time Synchronization

Proper time sync is important for logs and security:

```bash
timedatectl set-ntp on
timedatectl set-timezone UTC
```

## Secure Shared Memory

Add this to `/etc/fstab` to secure shared memory:

```bash
echo "tmpfs /run/shm tmpfs defaults,noexec,nosuid 0 0" | sudo tee -a /etc/fstab
```

## Additional Security Hardening (Optional)

### Disable IPv6 (if not needed)

```bash
echo "net.ipv6.conf.all.disable_ipv6 = 1" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.default.disable_ipv6 = 1" | sudo tee -a /etc/sysctl.conf
sysctl -p
```

### Install and Run Lynis Security Audit

```bash
apt install lynis -y
lynis audit system
```

## Quick Reference Commands

```bash
# Check fail2ban status
fail2ban-client status sshd

# Check UFW status
ufw status verbose

# View auth logs
tail -f /var/log/auth.log

# Check for listening ports
ss -tulnp

# View active SSH sessions
who

# Check system updates
apt update && apt list --upgradable
```
