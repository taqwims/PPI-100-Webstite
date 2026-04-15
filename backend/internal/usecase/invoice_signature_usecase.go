package usecase

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/internal/utils"
	"strings"
	"time"
)

// ─── Input / Result types ───

type SignInvoiceResult struct {
	Signatures       []utils.StakeholderSig    `json:"signatures"`
	VerificationCode string                    `json:"verification_code"`
	InvoiceNumber    string                    `json:"invoice_number"`
	Existing         []domain.InvoiceSignature `json:"existing,omitempty"`
}

type VerifyInvoiceResult struct {
	Valid      bool                      `json:"valid"`
	Signatures []domain.InvoiceSignature `json:"signatures,omitempty"`
	Metadata   *VerifyMetadata           `json:"metadata,omitempty"`
}

type VerifyMetadata struct {
	ModuleName  string    `json:"module_name"`
	ReferenceID string    `json:"reference_id"`
	Amount      float64   `json:"amount"`
	Date        string    `json:"date"`
	SignedAt    time.Time `json:"signed_at"`
}

type UpdateInvoiceConfigInput struct {
	Prefix             string `json:"prefix"`
	Separator          string `json:"separator"`
	IncludeDate        *bool  `json:"include_date"`
	IncludeUnit        *bool  `json:"include_unit"`
	CounterLength      *int   `json:"counter_length"`
	CounterResetPeriod string `json:"counter_reset_period"`
	DisplayLabel       string `json:"display_label"`
	AutoNotifyWA       *bool  `json:"auto_notify_wa"`
	WATemplateID       *uint  `json:"wa_template_id"`
	IsActive           *bool  `json:"is_active"`
}

type UpdateStakeholderInput struct {
	Name         string `json:"name"`
	NIP          string `json:"nip"`
	DisplayLabel string `json:"display_label"`
	IsActive     *bool  `json:"is_active"`
}

// ─── Interface ───

type InvoiceSignatureUsecase interface {
	SignInvoice(invoiceType, referenceID string, amount float64, dateStr string) (*SignInvoiceResult, error)
	VerifyInvoice(code string) (*VerifyInvoiceResult, error)
	GenerateNumber(invoiceType string) (string, error)
	GetInvoiceHistory(userIDStr string, roleID int, invoiceType, search, startDate, endDate string) ([]postgres.InvoiceHistoryItem, error)
	GetInvoiceConfigs() ([]domain.InvoiceNumberConfig, error)
	UpdateInvoiceConfig(id uint, input UpdateInvoiceConfigInput) (*domain.InvoiceNumberConfig, error)
	ResetCounter(id uint) error
	GetStakeholders() ([]domain.StakeholderConfig, error)
	UpdateStakeholder(id uint, input UpdateStakeholderInput) (*domain.StakeholderConfig, error)
}

// ─── Implementation ───

type invoiceSignatureUsecase struct {
	repo postgres.InvoiceSignatureRepository
}

func NewInvoiceSignatureUsecase(repo postgres.InvoiceSignatureRepository) InvoiceSignatureUsecase {
	return &invoiceSignatureUsecase{repo: repo}
}

func (u *invoiceSignatureUsecase) SignInvoice(invoiceType, referenceID string, amount float64, dateStr string) (*SignInvoiceResult, error) {
	invoiceType = strings.Title(strings.ToLower(invoiceType))

	existing, err := u.repo.FindByTypeAndRef(invoiceType, referenceID)
	if err != nil {
		return nil, err
	}

	if len(existing) > 0 {
		needsUpdate := false
		verificationCode := existing[0].VerificationCode
		docDate := existing[0].DocumentDate

		if verificationCode == "" {
			verificationCode = utils.GenerateVerificationCode(invoiceType, referenceID, amount, dateStr)
			needsUpdate = true
		}
		if docDate == "" {
			docDate = dateStr
			needsUpdate = true
		}

		if needsUpdate {
			if err := u.repo.UpdateVerificationCode(invoiceType, referenceID, verificationCode, docDate); err != nil {
				return nil, err
			}
		}

		updated, err := u.repo.FindByTypeAndRef(invoiceType, referenceID)
		if err != nil {
			return nil, err
		}

		invNum := ""
		if len(updated) > 0 {
			invNum = updated[0].InvoiceNumber
		}

		// Dynamically override names to match current config
		stakeholders, _ := u.repo.GetStakeholders()
		stakeholderNames := make(map[string]string)
		for _, s := range stakeholders {
			if s.IsActive {
				stakeholderNames[s.Role] = s.Name
			}
		}
		for i := range updated {
			if newName, ok := stakeholderNames[updated[i].StakeholderRole]; ok {
				updated[i].StakeholderName = newName
			}
		}

		return &SignInvoiceResult{
			VerificationCode: verificationCode,
			InvoiceNumber:    invNum,
			Existing:         updated,
		}, nil
	}

	// Not signed yet — generate all signatures
	stakeholders, err := u.repo.GetStakeholders()
	if err != nil {
		return nil, err
	}
	stakeholderNames := make(map[string]string, len(stakeholders))
	for _, s := range stakeholders {
		if s.IsActive {
			stakeholderNames[s.Role] = s.Name
		}
	}

	sigs, err := utils.GenerateAllSignatures(invoiceType, referenceID, amount, dateStr, stakeholderNames)
	if err != nil {
		return nil, err
	}

	verificationCode := utils.GenerateVerificationCode(invoiceType, referenceID, amount, dateStr)
	invoiceNumber, _ := u.generateInvoiceNumber(invoiceType)

	now := time.Now()
	records := make([]domain.InvoiceSignature, 0, len(sigs))
	for _, sig := range sigs {
		records = append(records, domain.InvoiceSignature{
			InvoiceType:      invoiceType,
			ReferenceID:      referenceID,
			StakeholderRole:  sig.Role,
			StakeholderName:  sig.Name,
			SignatureHash:    sig.Signature,
			ShortCode:        sig.ShortCode,
			VerificationCode: verificationCode,
			InvoiceNumber:    invoiceNumber,
			Amount:           amount,
			DocumentDate:     dateStr,
			SignedAt:         now,
		})
	}

	if err := u.repo.CreateSignatures(records); err != nil {
		return nil, err
	}

	return &SignInvoiceResult{
		Signatures:       sigs,
		VerificationCode: verificationCode,
		InvoiceNumber:    invoiceNumber,
	}, nil
}

func (u *invoiceSignatureUsecase) VerifyInvoice(code string) (*VerifyInvoiceResult, error) {
	sigs, err := u.repo.FindByVerificationCode(code)
	if err != nil || len(sigs) == 0 {
		sigs, err = u.repo.FindByShortCode(code)
		if err != nil || len(sigs) == 0 {
			return &VerifyInvoiceResult{Valid: false}, nil
		}
	}

	for i := range sigs {
		sig := sigs[i]
		invoiceType := strings.Title(strings.ToLower(sig.InvoiceType))
		if !utils.VerifyStakeholderSignature(sig.StakeholderRole, invoiceType, sig.ReferenceID, sig.Amount, sig.DocumentDate, sig.SignatureHash) {
			return &VerifyInvoiceResult{Valid: false}, nil
		}
	}

	return &VerifyInvoiceResult{
		Valid:      true,
		Signatures: sigs,
		Metadata: &VerifyMetadata{
			ModuleName:  sigs[0].InvoiceType,
			ReferenceID: sigs[0].ReferenceID,
			Amount:      sigs[0].Amount,
			Date:        sigs[0].DocumentDate,
			SignedAt:    sigs[0].SignedAt,
		},
	}, nil
}

func (u *invoiceSignatureUsecase) GenerateNumber(invoiceType string) (string, error) {
	return u.generateInvoiceNumber(invoiceType)
}

func (u *invoiceSignatureUsecase) generateInvoiceNumber(invoiceType string) (string, error) {
	config, err := u.repo.GetConfigByType(invoiceType)
	if err != nil {
		return u.generateDefaultInvoiceNumber(invoiceType), nil
	}

	now := time.Now()

	needsReset := false
	if config.LastResetDate != nil {
		switch config.CounterResetPeriod {
		case "monthly":
			needsReset = now.Year() != config.LastResetDate.Year() || now.Month() != config.LastResetDate.Month()
		case "yearly":
			needsReset = now.Year() != config.LastResetDate.Year()
		}
	} else {
		needsReset = true
	}

	if needsReset {
		config.CurrentCounter = 0
		config.LastResetDate = &now
	}

	config.CurrentCounter++
	if err := u.repo.SaveConfig(config); err != nil {
		return "", err
	}

	parts := []string{config.Prefix}
	if config.IncludeDate {
		parts = append(parts, now.Format("200601"))
	}
	counterStr := fmt.Sprintf("%0*d", config.CounterLength, config.CurrentCounter)
	parts = append(parts, counterStr)

	return strings.Join(parts, config.Separator), nil
}

func (u *invoiceSignatureUsecase) generateDefaultInvoiceNumber(invoiceType string) string {
	prefixes := map[string]string{
		"Payroll":    "SG",
		"CashLedger": "BK",
		"Bill":       "KP",
		"Obligation": "OB",
		"Infaq":      "INF",
		"Activity":   "KW",
		"RKAS":       "RKAS",
		"Debt":       "HT",
		"Savings":    "TB",
	}
	prefix := prefixes[invoiceType]
	if prefix == "" {
		prefix = "INV"
	}
	now := time.Now()
	return fmt.Sprintf("%s-%s-%04d", prefix, now.Format("200601"), now.UnixNano()%10000)
}

func (u *invoiceSignatureUsecase) GetInvoiceHistory(userIDStr string, roleID int, invoiceType, search, startDate, endDate string) ([]postgres.InvoiceHistoryItem, error) {
	return u.repo.GetInvoiceHistory(userIDStr, roleID, invoiceType, search, startDate, endDate)
}

func (u *invoiceSignatureUsecase) GetInvoiceConfigs() ([]domain.InvoiceNumberConfig, error) {
	return u.repo.GetConfigs()
}

func (u *invoiceSignatureUsecase) UpdateInvoiceConfig(id uint, input UpdateInvoiceConfigInput) (*domain.InvoiceNumberConfig, error) {
	config, err := u.repo.GetConfigByID(id)
	if err != nil {
		return nil, fmt.Errorf("config not found")
	}

	if input.Prefix != "" {
		config.Prefix = input.Prefix
	}
	if input.Separator != "" {
		config.Separator = input.Separator
	}
	if input.IncludeDate != nil {
		config.IncludeDate = *input.IncludeDate
	}
	if input.IncludeUnit != nil {
		config.IncludeUnit = *input.IncludeUnit
	}
	if input.CounterLength != nil {
		config.CounterLength = *input.CounterLength
	}
	if input.CounterResetPeriod != "" {
		config.CounterResetPeriod = input.CounterResetPeriod
	}
	if input.DisplayLabel != "" {
		config.DisplayLabel = input.DisplayLabel
	}
	if input.AutoNotifyWA != nil {
		config.AutoNotifyWA = *input.AutoNotifyWA
	}
	if input.WATemplateID != nil {
		if *input.WATemplateID == 0 {
			config.WATemplateID = nil
		} else {
			config.WATemplateID = input.WATemplateID
		}
	}
	if input.IsActive != nil {
		config.IsActive = *input.IsActive
	}

	if err := u.repo.SaveConfig(config); err != nil {
		return nil, err
	}
	return config, nil
}

func (u *invoiceSignatureUsecase) ResetCounter(id uint) error {
	config, err := u.repo.GetConfigByID(id)
	if err != nil {
		return fmt.Errorf("config not found")
	}

	now := time.Now()
	config.CurrentCounter = 0
	config.LastResetDate = &now
	return u.repo.SaveConfig(config)
}

func (u *invoiceSignatureUsecase) GetStakeholders() ([]domain.StakeholderConfig, error) {
	return u.repo.GetStakeholders()
}

func (u *invoiceSignatureUsecase) UpdateStakeholder(id uint, input UpdateStakeholderInput) (*domain.StakeholderConfig, error) {
	config, err := u.repo.GetStakeholderByID(id)
	if err != nil {
		return nil, fmt.Errorf("stakeholder not found")
	}

	if input.Name != "" {
		config.Name = input.Name
	}
	if input.NIP != "" {
		config.NIP = input.NIP
	}
	if input.DisplayLabel != "" {
		config.DisplayLabel = input.DisplayLabel
	}
	if input.IsActive != nil {
		config.IsActive = *input.IsActive
	}

	if err := u.repo.SaveStakeholder(config); err != nil {
		return nil, err
	}
	return config, nil
}
