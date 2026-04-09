package main

import (
	"fmt"
	"log"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal(err)
	}

	db, err := postgres.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	searchCode := "29CE-EA29-6434"
	
	var sigs []domain.InvoiceSignature
	// Case-insensitive search using LOWER
	err = db.Where("LOWER(verification_code) = LOWER(?) OR LOWER(short_code) = LOWER(?)", searchCode, searchCode).Find(&sigs).Error
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}

	fmt.Printf("Results for [%s]:\n", searchCode)
	if len(sigs) == 0 {
		fmt.Println("No records found.")
		
		// List last 10 records
		var last []domain.InvoiceSignature
		db.Order("signed_at desc").Limit(10).Find(&last)
		fmt.Println("\nRecent 10 records:")
		for _, s := range last {
			fmt.Printf("- %s | %s | %s | %s\n", s.InvoiceType, s.SignedAt.Format("2006-01-02 15:04"), s.VerificationCode, s.ShortCode)
		}
	} else {
		for _, s := range sigs {
			fmt.Printf("- FOUND: %s (%s) for %s on %v\n", s.VerificationCode, s.ShortCode, s.InvoiceType, s.SignedAt)
			fmt.Printf("  Role: %s, Ref: %s, DocDate: [%s], Amount: %.2f, Hash: %s\n", s.StakeholderRole, s.ReferenceID, s.DocumentDate, s.Amount, s.SignatureHash)
		}
	}
}
