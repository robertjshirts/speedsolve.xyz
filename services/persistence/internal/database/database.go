package database

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/robertjshirts/speedsolve.xyz/persistence/internal/config"
	"github.com/rs/zerolog/log"
)

type SpeedDB struct {
	*sqlx.DB
}

func NewSpeedDB(ctx context.Context, cfg config.Config) (*SpeedDB, error) {
	log.Debug().Str("dsn", cfg.DatabaseDSN).Msg("Connecting to database")
	db, err := sqlx.ConnectContext(ctx, "postgres", cfg.DatabaseDSN)
	if err != nil {
		return nil, err
	}

	// Repeat ping every 5 seconds until we can connect to the database
	log.Debug().Msg("Pinging database...")
	for {
		if err := db.PingContext(ctx); err != nil {
			log.Error().Err(err).Msg("Failed to ping database, retrying in 5 seconds...")
			log.Debug().Msgf("Sleeping for %v seconds", cfg.DatabaseRetryInterval)
			time.Sleep(cfg.DatabaseRetryInterval)
		} else {
			break
		}
	}

	return &SpeedDB{
		DB: db,
	}, nil
}

func (db *SpeedDB) Close() error {
	if err := db.DB.Close(); err != nil {
		return err
	}
	return nil
}
