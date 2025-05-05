package main

import (
	"fmt"

	"github.com/robertjshirts/speedsolve.xyz/persistence/internal/config"
)

func main() {
	config, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("Error loading config: %v\n", err)
		return
	}
	fmt.Println(config.DatabseDSN)
}
