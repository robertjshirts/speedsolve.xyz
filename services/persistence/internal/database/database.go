package database

import (
	"context"
	"fmt"
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

	// Set up timeout between connection attempts
	ticker := time.NewTicker(cfg.ConnectionRetryInterval)
	defer ticker.Stop()

	log.Debug().Msgf("Retry interval set to %d seconds", int(cfg.ConnectionRetryInterval.Seconds()))
	log.Debug().Msgf("Ping timeout set to %d seconds", int(cfg.ConnectionPingTimeout.Seconds()))

	for {
		// Set up timeout for the actual connection attempt
		pingCtx, cancelPing := context.WithTimeout(ctx, cfg.ConnectionPingTimeout)
		db, err := sqlx.ConnectContext(pingCtx, "postgres", cfg.DatabaseDSN)
		cancelPing()

		if err == nil {
			log.Debug().Msg("Database connection established")
			return &SpeedDB{
				DB: db,
			}, nil
		}

		deadline, _ := ctx.Deadline()
		log.Warn().Err(err).Msgf("Failed to connect to database, %ds remaining", int(time.Until(deadline).Seconds()))

		select {
		case <-ticker.C:
			log.Debug().Msg("Retrying database connection...")
			continue
		case <-ctx.Done():
			return nil, fmt.Errorf("database connection interrupted: %v", ctx.Err())
		}
	}
}

func (db *SpeedDB) Close() error {
	if err := db.DB.Close(); err != nil {
		return err
	}
	return nil
}
