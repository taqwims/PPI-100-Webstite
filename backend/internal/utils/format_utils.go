package utils

import (
	"fmt"
	"strings"
)

// FormatRupiah formats a float64 amount into Indonesian Rupiah string with dot thousands separators.
// Example: 200000 -> "Rp 200.000", 1500000 -> "Rp 1.500.000"
func FormatRupiah(amount float64) string {
	if amount < 0 {
		return "-Rp " + FormatRupiah(-amount)[3:]
	}

	intAmount := int64(amount)
	str := fmt.Sprintf("%d", intAmount)
	n := len(str)
	if n <= 3 {
		return "Rp " + str
	}

	var parts []string
	remainder := n % 3
	if remainder > 0 {
		parts = append(parts, str[:remainder])
	}
	for i := remainder; i < n; i += 3 {
		parts = append(parts, str[i:i+3])
	}

	return "Rp " + strings.Join(parts, ".")
}
