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
	}, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
