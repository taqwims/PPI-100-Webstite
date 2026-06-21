package main

import (
	"fmt"
	"log"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/internal/usecase"
	"ppi-100-sis/internal/utils"
	"time"

	gorm_postgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// 1. Load Config
	cfg := &config.Config{
		FonnteToken: "wFf2xsJbz9XpyfpJkDhY", // Diambil dari .env Anda
	}

	// 2. Setup DB Connection
	dsn := "host=localhost user=postgres password=180903 dbname=sdit_management port=5435 sslmode=disable"
	db, err := gorm.Open(gorm_postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 3. Setup Usecase
	waService := utils.NewWAService(cfg)
	notifRepo := postgres.NewNotificationRepository(db)
	notifUsecase := usecase.NewNotificationUsecase(notifRepo, waService)

	fmt.Println("--- WA ASYNC TESTER ---")
	fmt.Println("Mengirim pesan ke antrean...")

	// Silakan ganti nomor ini dengan nomor Anda untuk mencoba
	testPhone := "081575781320"
	testMessage := "Halo! Ini adalah pesan tes dari sistem Antigravity SDIT AN-NUR. Fitur WhatsApp Asinkron sudah aktif! 🚀"

	err = notifUsecase.SendWhatsApp(testPhone, testMessage)
	if err != nil {
		fmt.Printf("Error saat memasukkan ke antrean: %v\n", err)
		return
	}

	fmt.Println("✅ Pesan berhasil dimasukkan ke antrean worker.")
	fmt.Println("Sedang menunggu worker memproses (cek log terminal backend)...")

	// Tunggu sebentar agar worker sempat memproses sebelum script selesai
	time.Sleep(3 * time.Second)
	fmt.Println("Tes selesai.")
}
