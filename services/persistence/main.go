package main

import (
	"context"
	"fmt"
	"time"

	"github.com/robertjshirts/speedsolve.xyz/persistence/internal/config"
	"github.com/robertjshirts/speedsolve.xyz/persistence/internal/database"
	"github.com/rs/zerolog/log"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("CRITICAL: Error loading config: %v\n", err)
		panic("Failed to load configuration")
	}
	log.Info().Msg("Configuration loaded successfully.")

	// Startup context, if it takes longer than 60 seconds we have some kind of issue
	// and we should not continue
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	log.Info().Msg("Connecting to database...")
	_, err = database.NewSpeedDB(ctx, *cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}

}
