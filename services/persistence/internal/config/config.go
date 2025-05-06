package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/joho/godotenv/autoload"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type Config struct {
	DatabaseDSN           string
	DatabaseRetryInterval time.Duration
}

func initializeLogger() error {
	logEnv := strings.ToLower(os.Getenv("LOG_ENV"))
	if logEnv == "" {
		logEnv = "dev"
	}

	if logEnv == "dev" {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
		zerolog.TimeFieldFormat = time.RFC3339
		logger := zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: "2006-01-02 15:04:05.000"}).With().Timestamp().Logger()
		zerolog.DefaultContextLogger = &logger
		log.Info().Msg("Development logger initialized")
	} else if logEnv == "prod" {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
		zerolog.TimeFieldFormat = time.RFC3339
		logger := zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: "2006-01-02 15:04:05.000"}).With().Timestamp().Logger()
		zerolog.DefaultContextLogger = &logger
		log.Info().Msg("Production logger initialized")
	}
	return nil
}

func LoadConfig() (*Config, error) {
	if err := initializeLogger(); err != nil {
		return nil, err
	}

	dsn := os.Getenv("SPEED_DB_DSN")
	if dsn == "" {
		log.Error().Msg("SPEED_DB_DSN not set in .env or as an environment variable")
		return nil, fmt.Errorf("SPEED_DB_DSN not set")
	}
	log.Debug().Msg("Database DSN loaded")

	retryIntervalInt, err := strconv.Atoi(os.Getenv("SPEED_DB_RETRY_INTERVAL"))
	if retryIntervalInt == 0 || retryIntervalInt > 30 || err != nil {
		log.Warn().Msg("SPEED_DB_RETRY_INTERVAL not set, defaulting to 5s")
		retryIntervalInt = 5
	}
	log.Debug().Msg("SPEED_DB_RETRY_INTERVAL loaded")

	return &Config{
		DatabaseDSN:           dsn,
		DatabaseRetryInterval: time.Duration(retryIntervalInt) * time.Second,
	}, nil
}
