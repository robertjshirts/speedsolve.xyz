package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/robertjshirts/speedsolve.xyz/persistence/internal/config"
	"github.com/rs/zerolog/log"
)

type SpeedCache struct {
	client *redis.Client
}

func NewSpeedCache(ctx context.Context, cfg config.Config) (*SpeedCache, error) {
	log.Debug().Str("dsn", cfg.CacheDSN).Msg("Connecting to cache")
	opts, err := redis.ParseURL(cfg.CacheDSN)
	if err != nil {
		log.Error().Err(err).Msg("Failed to parse cache DSN")
		return nil, err
	}

	client := redis.NewClient(opts)

	// Set up timeout between connection attempts
	ticker := time.NewTicker(cfg.ConnectionRetryInterval)
	defer ticker.Stop()

	log.Debug().Msgf("Retry interval set to %d seconds", int(cfg.ConnectionRetryInterval.Seconds()))
	log.Debug().Msgf("Ping timeout set to %d seconds", int(cfg.ConnectionPingTimeout.Seconds()))

	log.Debug().Msg("Pinging cache...")
	for {
		// Set up timeout for the actual connection attempt
		pingCtx, cancelPing := context.WithTimeout(ctx, cfg.ConnectionPingTimeout)
		err := client.Ping(pingCtx).Err()
		cancelPing()

		if err == nil {
			log.Debug().Msg("Cache connection established")
			return &SpeedCache{
				client: client,
			}, nil
		}

		deadline, _ := ctx.Deadline()
		log.Warn().Err(err).Msgf("Failed to connect to cache, %ds remaining", int(time.Until(deadline).Seconds()))

		select {
		case <-ticker.C:
			log.Debug().Msg("Retrying cache connection...")
			continue
		case <-ctx.Done():
			return nil, fmt.Errorf("cache connection interrupted: %v", ctx.Err())
		}
	}
}
