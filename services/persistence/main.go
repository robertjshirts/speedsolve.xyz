package main

import (
	"context"
	"fmt"

	"github.com/robertjshirts/speedsolve.xyz/persistence/internal/cache"
	"github.com/robertjshirts/speedsolve.xyz/persistence/internal/config"
	"github.com/robertjshirts/speedsolve.xyz/persistence/internal/database"
	"github.com/rs/zerolog/log"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		panic(fmt.Sprintf("CRITICAL: Error loading config: %v", err))
	}
	log.Info().Msg("Configuration loaded successfully.")

	// Startup context, if it takes longer than 60 seconds we have some kind of issue
	// and we should not continue
	ctx, cancel := context.WithTimeout(context.Background(), cfg.StartupTimeout)
	defer cancel()

	log.Info().Msg("Initializing database...")
	_, err = database.NewSpeedDB(ctx, *cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	log.Info().Msg("Database initialized.")

	log.Info().Msg("Initializing cache...")
	_, err = cache.NewSpeedCache(ctx, *cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to cache")
	}
	log.Info().Msg("Cache initialized.")

}
