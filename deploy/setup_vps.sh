#!/bin/bash

# Pastikan script dijalankan sebagai root atau dengan sudo
if [ "$EUID" -ne 0 ]
  then echo "Jalankan script ini dengan sudo: sudo ./setup_vps.sh"
  exit
fi

echo "============================================="
echo " Mulai Instalasi Dependensi SDIT App di VPS"
echo "============================================="

# 1. Update OS & Install Basic Tools
echo "[1/4] Update Sistem & Install Tools Dasar..."
apt update && apt upgrade -y
apt install -y git make build-essential curl wget sudo ufw

# 2. Install PostgreSQL Server & Client
echo "[2/4] Install PostgreSQL & Client Tools..."
apt install -y postgresql postgresql-contrib postgresql-client
systemctl start postgresql
systemctl enable postgresql

# 3. Install Go (Golang 1.22)
echo "[3/4] Install Golang 1.22..."
if ! command -v go &> /dev/null
then
    wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz
    rm -rf /usr/local/go && tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz
    rm go1.22.0.linux-amd64.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
    echo "Golang berhasil diinstall."
else
    echo "Golang sudah terinstall."
fi

# 4. Install Node.js 20 LTS & Nginx & Certbot
echo "[4/4] Install Node.js 20 LTS, Nginx, dan Certbot..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx python3-certbot-nginx

# Aktifkan Firewall UFW
echo "Mengatur UFW (Firewall)..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
# ufw --force enable # (Opsional: hati-hati jika port SSH diubah)

echo "============================================="
echo " Instalasi Dependensi Selesai! 🎉"
echo " Harap logout dan login kembali agar Golang masuk ke PATH"
echo " Cek Go: go version"
echo " Cek Node: node -v"
echo " Cek NPM: npm -v"
echo "============================================="
