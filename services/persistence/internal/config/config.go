package config

import (
	"fmt"
	"os"

	_ "github.com/joho/godotenv/autoload"
)

type Config struct {
	DatabseDSN string
}

func LoadConfig() (*Config, error) {
	dsn := os.Getenv("SPEED_DB_DSN")
	if dsn == "" {
		return nil, fmt.Errorf("SPEED_DB_DSN not set in .env or as an environment variable")
	}

	return &Config{
		DatabseDSN: dsn,
	}, nil
}
