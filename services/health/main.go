package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type HealthResponse struct {
	Status string `json:"status"`
}

// echoHandler handles the echo requests
func healthHandler(w http.ResponseWriter, r *http.Request) {
	response := HealthResponse{Status: "healthy"}

	// Set the content type to application/json
	w.Header().Set("Content-Type", "application/json")
	// Write the JSON response
	json.NewEncoder(w).Encode(response)
}

// main function to start the server
func main() {
	http.HandleFunc("/health", healthHandler)

	fmt.Println("Server is listening on :80")
	fmt.Println("Good luck, stay even")
	if err := http.ListenAndServe(":80", nil); err != nil {
		fmt.Printf("Failed to start server: %v\n", err)
	}
}
