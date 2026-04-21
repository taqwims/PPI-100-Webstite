# Panduan Deployment ke VPS Ubuntu Non-Docker

Folder ini berisi file-file konfigurasi yang dibutuhkan agar proses *deployment* proyek ini ke VPS menjadi sangat mudah dan tertata rapi.

## File yang Tersedia:
1. `setup_vps.sh` : Script Bash untuk install Node.js, Go, PostgreSQL, Nginx secara otomatis.
2. `sdit-backend.service` : File Systemd untuk menjalankan Backend Go di Background.
3. `sdit-app.conf` : File konfigurasi Nginx untuk Web Server Frontend dan Reverse Proxy ke Backend.

---

## Langkah 1: Persiapan Awal di VPS
Setelah Anda berlangganan VPS (misalnya Ubuntu 22.04 / 24.04 Lts) dengan IP Public tertentu, silakan remote SSH ke dalamnya menggunakan Terminal Anda:

```bash
ssh root@IP_VPS_ANDA
```

Pastikan Anda membuat user baru (misalnya `ubuntu`) dan tidak menggunakan `root` terus menerus. Namun untuk simplicity di awal, anda bisa upload project ke home directory.

Copy semua *source code* aplikasi Anda (semua folder ini) ke VPS. Cara paling baik adalah menggunakan Github/Gitlab agar Anda tinggal melakukan `git clone` dari VPS.

```bash
cd ~
git clone <url-repo-anda> sdit-app
cd sdit-app
```

---

## Langkah 2: Install Dependensi
Masuk ke folder `deploy` dan jadikan file setup bisa dieksekusi:

```bash
cd ~/sdit-app/deploy
chmod +x setup_vps.sh
sudo ./setup_vps.sh
```
*Tunggu hingga proses selesai. Jika di minta konfirmasi [Y/n] di terminal, ketik Y.*

---

## Langkah 3: Setup Env dan Database
Pastikan Anda memiliki konfigurasi `.env` di path `/home/ubuntu/sdit-app/.env` (sesuaikan lokasi path).

Secara bawaan di file `setup_vps.sh` kita sudah install Postgres. Silakan buat password postgresnya dan databasenya dulu:
```bash
# Ubah password default postgres
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '123456';"
# Buat database
sudo -u postgres psql -c "CREATE DATABASE sdit_management;"
```
*(Ingat untuk menyesuaikan db password dan db name ke `.env`)*
**PENTING**: Biarkan `DB_DOCKER_CONTAINER=` (kosongkan nilainya) di `.env` agar aplikasi sadar ini *bukan* environment docker.

---

## Langkah 4: Setup Service Backend Systemd
Agar server Go tidak tertutup dan bisa selalu running 24 jam serta me-restart otomatis bila crash:

1. Build App:
   ```bash
   cd ~/sdit-app/backend
   go build -o main main.go
   ```

2. Pasang File Service:
   **CATATAN PENTING**: Buka file `deploy/sdit-backend.service`, pastikan path direktorinya sudah sesuai `/home/ubuntu/...` (ganti kata ubuntu dengan nama username VPS anda jika berbeda).

   ```bash
   sudo cp ~/sdit-app/deploy/sdit-backend.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable sdit-backend
   sudo systemctl start sdit-backend
   sudo systemctl status sdit-backend # Memastikan status "active (running)"
   ```

---

## Langkah 5: Setup Nginx & Build Frontend
Aplikasi React/Vite perlu di build terlebih dahulu. Sebelumnya **SANGAT PENTING**: buka frontend anda dan ganti VITE_API_URL-nya mengarah ke url ip/domain proxy misalnya `https://domain-anda.com/api`.

1. Build Frontend:
   ```bash
   cd ~/sdit-app/frontend
   npm install
   npm run build
   ```

2. Pasang File Konfigurasi Nginx:
   **CATATAN PENTING**: Buka file `deploy/sdit-app.conf` dan ubah `domain-anda.com` dengan Domain atau IP milik Anda, dan cek kesesuaian path direktori `root`.

   ```bash
   sudo cp ~/sdit-app/deploy/sdit-app.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/sdit-app.conf /etc/nginx/sites-enabled/
   # Cek apakah tidak ada error penulisan:
   sudo nginx -t
   # Restart Nginx
   sudo systemctl restart nginx
   ```

## Langkah 6: Atur SSL dengan Certbot (Setelah Beli Domain)
Jika domain sudah terarah (via DNS A-Record) ke IP Public VPS:

```bash
sudo certbot --nginx -d domain-anda.com -d www.domain-anda.com
```
*Ikuti langkahnya di terminal, dan Certbot akan mengurus pengaturan SSL dan re-write ke https secara otomatis!*

Selesai. Anda sekarang sudah siap on-air 🚀
