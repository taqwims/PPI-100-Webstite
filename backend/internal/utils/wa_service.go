package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"ppi-100-sis/internal/config"
	"strings"
)

type WAService struct {
	token string
}

func NewWAService(cfg *config.Config) *WAService {
	return &WAService{token: cfg.FonnteToken}
}

type FonnteResponse struct {
	Status bool   `json:"status"`
	Reason string `json:"reason"`
}

func (s *WAService) GetDefaultToken() string {
	return s.token
}

// SendWhatsApp sends a message via Fonnte API
func (s *WAService) SendWhatsApp(token, target, message string) error {
	if token == "" {
		return fmt.Errorf("FONNTE_TOKEN is not configured")
	}

	// Clean target number (remove +, spaces, etc.)
	target = strings.ReplaceAll(target, "+", "")
	target = strings.ReplaceAll(target, " ", "")
	target = strings.ReplaceAll(target, "-", "")
	if strings.HasPrefix(target, "0") {
		target = "62" + target[1:]
	}

	url := "https://api.fonnte.com/send"
	
	payload := map[string]string{
		"target":  target,
		"message": message,
	}
	
	jsonPayload, _ := json.Marshal(payload)
	
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}
	
	req.Header.Set("Authorization", token)
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	var res FonnteResponse
	if err := json.Unmarshal(body, &res); err != nil {
		return fmt.Errorf("failed to parse Fonnte response: %v", err)
	}
	
	if !res.Status {
		return fmt.Errorf("fonnte error: %s", res.Reason)
	}
	
	return nil
}

// FormatStudentBillMessage is a helper to format a bill summary
func FormatStudentBillMessage(studentName, totalTagihan, rincian string) string {
	var sb strings.Builder
	sb.WriteString("*BILLING NOTIFICATION - SDIT AN-NUR*\n\n")
	sb.WriteString(fmt.Sprintf("Yth. Orang Tua/Wali dari *%s*,\n\n", studentName))
	sb.WriteString("Berikut adalah rincian tagihan biaya pendidikan yang masih tertunggak:\n\n")
	sb.WriteString(fmt.Sprintf("%s\n\n", rincian))
	sb.WriteString(fmt.Sprintf("*Total Tunggakan: %s*\n\n", totalTagihan))
	sb.WriteString("Mohon segera melakukan pembayaran. Abaikan jika sudah melakukan pembayaran. Terima kasih.")
	
	return sb.String()
}
