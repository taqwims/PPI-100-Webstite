package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

func hmacSha256(key []byte, data string) string {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(data))
	return hex.EncodeToString(mac.Sum(nil))
}

func main() {
	referenceID := "ed31e752-303a-4050-9ce0-7d892d50025c"
	amount := 400000.00
	dateStr := "2026-04-10" // Working date
	targetHash := "e2fb94d6f711e7e48b8b375bce34399e578c740705ef2ccba5df51771970b15b"

	keys := map[string][]byte{
		"principal": []byte("ppi100-principal-sig-key-2026"),
		"treasurer": []byte("ppi100-treasurer-sig-key-2026"),
		"chairman":  []byte("ppi100-chairman-sig-key-2026"),
	}

	roles := []string{"principal", "treasurer", "chairman"}

	for kname, k := range keys {
		for _, r := range roles {
			payload := fmt.Sprintf("%s|Payroll|%s|%.2f|%s", strings.ToLower(r), referenceID, amount, dateStr)
			res := hmacSha256(k, payload)
			if res == targetHash {
				fmt.Printf("!!! MATCH !!! Key: %s, Role in Payload: %s\n", kname, r)
			}
		}
	}
	fmt.Println("Test finished.")
}
