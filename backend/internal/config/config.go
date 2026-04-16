package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                 string
	DBHost               string
	DBUser               string
	DBPassword           string
	DBName               string
	DBPort               string
	JWTSecret            string
	MidtransServerKey    string
	MidtransClientKey    string
	MidtransIsProduction bool
	FonnteToken          string

	// Feature Flags
	FeatureBilling            bool
	FeatureStudentObligations bool
	FeatureMidtrans           bool
	FeatureSavings            bool
	FeatureCashLedger         bool
	FeatureInfaq              bool
	FeaturePayroll            bool
	FeatureRKAS               bool
	FeatureAssets             bool
	FeatureExternalDebts      bool
	FeatureActivities         bool
	FeaturePPDB               bool
	FeatureElearning          bool
	FeatureBK                 bool
	FeatureWAGateway          bool
	FeaturePublicWebsite      bool

	// School Branding
	SchoolName    string
	SchoolLogoURL string
	SchoolAddress string
}

// FeatureMap returns a map of feature flags for the API response
func (c *Config) FeatureMap() map[string]bool {
	return map[string]bool{
		"billing":             c.FeatureBilling,
		"student_obligations": c.FeatureStudentObligations,
		"midtrans":            c.FeatureMidtrans,
		"savings":             c.FeatureSavings,
		"cash_ledger":         c.FeatureCashLedger,
		"infaq":               c.FeatureInfaq,
		"payroll":             c.FeaturePayroll,
		"rkas":                c.FeatureRKAS,
		"assets":              c.FeatureAssets,
		"external_debts":      c.FeatureExternalDebts,
		"activities":          c.FeatureActivities,
		"ppdb":                c.FeaturePPDB,
		"elearning":           c.FeatureElearning,
		"bk":                  c.FeatureBK,
		"wa_gateway":          c.FeatureWAGateway,
		"public_website":      c.FeaturePublicWebsite,
	}
}

// SchoolInfo returns school branding info for the API response
func (c *Config) SchoolInfo() map[string]string {
	return map[string]string{
		"name":     c.SchoolName,
		"logo_url": c.SchoolLogoURL,
		"address":  c.SchoolAddress,
	}
}

func LoadConfig() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		// It's okay if .env file is not found, we might be using system env vars
	}

	return &Config{
		Port:                 getEnv("PORT", "8080"),
		DBHost:               getEnv("DB_HOST", "localhost"),
		DBUser:               getEnv("DB_USER", "postgres"),
		DBPassword:           getEnv("DB_PASSWORD", ""),
		DBName:               getEnv("DB_NAME", "sdit_management"),
		DBPort:               getEnv("DB_PORT", "5432"),
		JWTSecret:            getEnv("JWT_SECRET", ""),
		MidtransServerKey:    getEnv("MIDTRANS_SERVER_KEY", ""),
		MidtransClientKey:    getEnv("MIDTRANS_CLIENT_KEY", ""),
		MidtransIsProduction: getEnv("MIDTRANS_IS_PRODUCTION", "false") == "true",
		FonnteToken:          getEnv("FONNTE_TOKEN", ""),

		// Feature Flags — core features default true, premium features default false
		FeatureBilling:            getEnvBool("FEATURE_BILLING", true),
		FeatureStudentObligations: getEnvBool("FEATURE_STUDENT_OBLIGATIONS", true),
		FeatureMidtrans:           getEnvBool("FEATURE_MIDTRANS", true),
		FeatureSavings:            getEnvBool("FEATURE_SAVINGS", true),
		FeatureCashLedger:         getEnvBool("FEATURE_CASH_LEDGER", true),
		FeatureInfaq:              getEnvBool("FEATURE_INFAQ", true),
		FeaturePayroll:            getEnvBool("FEATURE_PAYROLL", false),
		FeatureRKAS:               getEnvBool("FEATURE_RKAS", false),
		FeatureAssets:             getEnvBool("FEATURE_ASSETS", false),
		FeatureExternalDebts:      getEnvBool("FEATURE_EXTERNAL_DEBTS", false),
		FeatureActivities:         getEnvBool("FEATURE_ACTIVITIES", true),
		FeaturePPDB:               getEnvBool("FEATURE_PPDB", true),
		FeatureElearning:          getEnvBool("FEATURE_ELEARNING", false),
		FeatureBK:                 getEnvBool("FEATURE_BK", false),
		FeatureWAGateway:          getEnvBool("FEATURE_WA_GATEWAY", true),
		FeaturePublicWebsite:      getEnvBool("FEATURE_PUBLIC_WEBSITE", true),

		// School Branding
		SchoolName:    getEnv("SCHOOL_NAME", "Sekolah"),
		SchoolLogoURL: getEnv("SCHOOL_LOGO_URL", ""),
		SchoolAddress: getEnv("SCHOOL_ADDRESS", ""),
	}, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	val, exists := os.LookupEnv(key)
	if !exists {
		return fallback
	}
	return val == "true" || val == "1" || val == "yes"
}
