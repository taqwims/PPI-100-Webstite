package main

import (
	"fmt"
	"log"
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/internal/domain"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := postgres.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("--- Budgets with Month > 0 ---")
	var budgets []domain.Budget
	db.Where("month > 0").Limit(10).Find(&budgets)
	for _, b := range budgets {
		fmt.Printf("Budget: %s | Month: %d | Realized: %.2f | Planned: %.2f | TC_ID: %v\n", 
			b.ItemName, b.Month, b.RealizedAmount, b.PlannedAmount, b.TransactionCodeID)
	}

	fmt.Println("\n--- Bills with Obligations ---")
	var bills []domain.Bill
	db.Preload("Obligation").Where("obligation_id IS NOT NULL").Limit(10).Find(&bills)
	for _, b := range bills {
		month := 0
		if b.Obligation != nil {
			month = b.Obligation.BillingMonth
		}
		fmt.Printf("Bill: %s | Amount: %.2f | Status: %s | BillingMonth: %d | TC_ID: %v\n", 
			b.Title, b.Amount, b.Status, month, b.TransactionCodeID)
	}
}
