package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"
)

// ─── Stakeholder Secret Keys ───

var stakeholderKeys map[string][]byte

func init() {
	stakeholderKeys = map[string][]byte{
		"principal": loadKey("SIGNATURE_KEY_PRINCIPAL", "ppi100-principal-sig-key-2026"),
		"treasurer": loadKey("SIGNATURE_KEY_TREASURER", "ppi100-treasurer-sig-key-2026"),
		"chairman":  loadKey("SIGNATURE_KEY_CHAIRMAN", "ppi100-chairman-sig-key-2026"),
	}
}

func loadKey(envVar, defaultVal string) []byte {
	v := os.Getenv(envVar)
	if v == "" {
		v = defaultVal
	}
	return []byte(v)
}

// ─── Core HMAC Functions ───

func hmacSha256(key []byte, data string) string {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(data))
	return hex.EncodeToString(mac.Sum(nil))
}

// GenerateStakeholderSignature creates an HMAC-SHA256 for a specific stakeholder role.
// role must be "principal", "treasurer", or "chairman".
func GenerateStakeholderSignature(role, invoiceType, referenceID string, amount float64, dateStr string) (string, error) {
	key, ok := stakeholderKeys[strings.ToLower(role)]
	if !ok {
		return "", fmt.Errorf("unknown stakeholder role: %s", role)
	}
	payload := BuildSignaturePayload(role, invoiceType, referenceID, amount, dateStr)
	full := hmacSha256(key, payload)
	return full, nil
}

// BuildSignaturePayload constructs the canonical data string for signing.
func BuildSignaturePayload(role, invoiceType, referenceID string, amount float64, dateStr string) string {
	// Standardize casing to ensure signatures match regardless of input case
	standardRole := strings.ToLower(role)
	standardType := strings.Title(strings.ToLower(invoiceType))
	return fmt.Sprintf("%s|%s|%s|%.2f|%s", standardRole, standardType, referenceID, amount, dateStr)
}

// VerifyStakeholderSignature verifies an existing signature for a role.
func VerifyStakeholderSignature(role, invoiceType, referenceID string, amount float64, dateStr, signature string) bool {
	expected, err := GenerateStakeholderSignature(role, invoiceType, referenceID, amount, dateStr)
	if err != nil {
		return false
	}
	return hmac.Equal([]byte(expected), []byte(signature))
}

// ─── Multi-Stakeholder Batch Signing ───

type StakeholderSig struct {
	Role      string `json:"role"`
	RoleLabel string `json:"role_label"`
	Name      string `json:"name"`
	Signature string `json:"signature"`
	ShortCode string `json:"short_code"`
}

// RoleLabels maps internal role keys to display labels.
var RoleLabels = map[string]string{
	"principal": "Kepala Sekolah",
	"treasurer": "Bendahara",
	"chairman":  "Ketua Yayasan",
}

// GenerateAllSignatures produces signatures for all three stakeholders.
func GenerateAllSignatures(invoiceType, referenceID string, amount float64, dateStr string, stakeholderNames map[string]string) ([]StakeholderSig, error) {
	roles := []string{"chairman", "treasurer", "principal"}
	sigs := make([]StakeholderSig, 0, len(roles))

	for _, role := range roles {
		full, err := GenerateStakeholderSignature(role, invoiceType, referenceID, amount, dateStr)
		if err != nil {
			return nil, err
		}
		shortCode := fmt.Sprintf("SIG-%s-%s", strings.ToUpper(role[:3]), full[:12])
		name := stakeholderNames[role]
		if name == "" {
			name = RoleLabels[role]
		}
		sigs = append(sigs, StakeholderSig{
			Role:      role,
			RoleLabel: RoleLabels[role],
			Name:      name,
			Signature: full,
			ShortCode: shortCode,
		})
	}
	return sigs, nil
}

// GenerateVerificationCode creates a unique, short verification code from the combined signatures.
func GenerateVerificationCode(invoiceType, referenceID string, amount float64, dateStr string) string {
	combined := fmt.Sprintf("VERIFY|%s|%s|%.2f|%s|%d", invoiceType, referenceID, amount, dateStr, time.Now().UnixNano())
	h := sha256.Sum256([]byte(combined))
	hex := hex.EncodeToString(h[:])
	// Format: XXXX-XXXX-XXXX
	return fmt.Sprintf("%s-%s-%s", hex[:4], hex[4:8], hex[8:12])
}

// ─── Legacy single-key functions (kept for backward compatibility) ───

var invoiceSecretKey []byte

func initLegacy() {
	key := os.Getenv("INVOICE_SECRET_KEY")
	if key == "" {
		key = "ppi100-sdit-invoice-default-secret-2026"
	}
	invoiceSecretKey = []byte(key)
}

func GenerateInvoiceSignature(dataStr string) string {
	if invoiceSecretKey == nil {
		initLegacy()
	}
	mac := hmac.New(sha256.New, invoiceSecretKey)
	mac.Write([]byte(dataStr))
	return hex.EncodeToString(mac.Sum(nil))
}

func VerifyInvoiceSignature(dataStr, signature string) bool {
	expected := GenerateInvoiceSignature(dataStr)
	return hmac.Equal([]byte(expected), []byte(signature))
}

func BuildInvoiceSignatureData(invoiceID string, amount float64, dateStr string) string {
	return fmt.Sprintf("%s|%.2f|%s", invoiceID, amount, dateStr)
}

func GenerateSignedInvoiceCode(invoiceID string, amount float64, dateStr string) string {
	data := BuildInvoiceSignatureData(invoiceID, amount, dateStr)
	fullSig := GenerateInvoiceSignature(data)
	shortSig := fullSig[:16]
	return fmt.Sprintf("SIG-%s", shortSig)
}
