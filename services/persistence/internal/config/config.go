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
	DatabaseDSN             string
	CacheDSN                string
	StartupTimeout          time.Duration
	ConnectionRetryInterval time.Duration
	ConnectionPingTimeout   time.Duration
}

func initializeLogger() error {
	logEnv := strings.ToLower(os.Getenv("SPEED_PERSISTENCE_LOG_ENV"))
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

	startupTimeoutInt, err := strconv.Atoi(os.Getenv("SPEED_PERSISTENCE_STARTUP_TIMEOUT"))
	if startupTimeoutInt == 0 || startupTimeoutInt > 180 || err != nil {
		log.Warn().Msg("SPEED_PERSISTENCE_STARTUP_TIMEOUT not set, defaulting to 60s")
		startupTimeoutInt = 60
	}

	retryIntervalInt, err := strconv.Atoi(os.Getenv("SPEED_PERSISTENCE_CONN_RETRY_INTERVAL"))
	if retryIntervalInt == 0 || retryIntervalInt > 30 || err != nil {
		retryIntervalInt = 5
		log.Warn().Msg("SPEED_PERSISTENCE_CONN_RETRY_INTERVAL not set, defaulting to 5s")
	}
	log.Debug().Msg("SPEED_PERSISTENCE_CONN_RETRY_INTERVAL loaded")

	pingTimeoutInt, err := strconv.Atoi(os.Getenv("SPEED_PERSISTENCE_CONN_PING_TIMEOUT"))
	if pingTimeoutInt == 0 || pingTimeoutInt > 10 || err != nil {
		log.Warn().Msg("SPEED_PERSISTENCE_CONN_PING_TIMEOUT not set, defaulting to 2s")
		pingTimeoutInt = 2
	}
	log.Debug().Msg("SPEED_PERSISTENCE_CONN_PING_TIMEOUT loaded")

	dsn := os.Getenv("SPEED_DB_DSN")
	if dsn == "" {
		log.Error().Msg("SPEED_DB_DSN not set in .env or as an environment variable")
		return nil, fmt.Errorf("SPEED_DB_DSN not set")
	}
	log.Debug().Msg("Database DSN loaded")

	cacheDSN := os.Getenv("SPEED_CACHE_DSN")
	if cacheDSN == "" {
		log.Error().Msg("SPEED_CACHE_DSN not set in .env or as an environment variable")
		return nil, fmt.Errorf("SPEED_CACHE_DSN not set")
	}
	log.Debug().Msg("Cache DSN loaded")

	return &Config{
		DatabaseDSN:             dsn,
		CacheDSN:                cacheDSN,
		StartupTimeout:          time.Duration(startupTimeoutInt) * time.Second,
		ConnectionRetryInterval: time.Duration(retryIntervalInt) * time.Second,
		ConnectionPingTimeout:   time.Duration(pingTimeoutInt) * time.Second,
	}, nil
}
