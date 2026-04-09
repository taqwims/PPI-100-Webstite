package main

import (
	"fmt"
	"ppi-100-sis/internal/utils"
	"strings"
)

func main() {
	targetHash := "3f7278c78ed8e9c78e40af7142ca07171852b00d309c2dd3240f64b0e9b158e3"
	
	// Parameters from DB for role 'principal'
	role := "principal"
	invoiceType := "Obligation"
	referenceID := "ed31e752-303a-4050-9ce0-7d892d50025c"
	amount := 400000.00
	dateStr := "2026-04-09"

	// Try exactly what the system does
	h, _ := utils.GenerateStakeholderSignature(role, invoiceType, referenceID, amount, dateStr)
	fmt.Printf("Current System Hash: %s\n", h)
	fmt.Printf("Target DB Hash:     %s\n", targetHash)
	
	if h == targetHash {
		fmt.Println("!!! SYSTEM MATCHES DB !!!")
	} else {
		fmt.Println("System does NOT match DB.")
		
		// Try variations
		fmt.Println("\nTrying variations...")
		
		// 1. Lowercase type
		h1, _ := utils.GenerateStakeholderSignature(role, strings.ToLower(invoiceType), referenceID, amount, dateStr)
		if h1 == targetHash { fmt.Println("Match found with lowercase type!") }

		// 2. Different amount format
		payload := fmt.Sprintf("%s|%s|%s|%.0f|%s", strings.ToLower(role), invoiceType, referenceID, amount, dateStr)
		h2, _ := utils.GenerateStakeholderSignatureWithPayload(role, payload)
		if h2 == targetHash { fmt.Println("Match found with %.0f amount!") }
	}
}
// Add this temporarily to utils or use direct hmac...
