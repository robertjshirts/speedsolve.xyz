FROM golang:1.24.2-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /speed_persistence

FROM alpine:3.21
WORKDIR /
COPY --from=builder /speed_persistence /speed_persistence
CMD ["/speed_persistence"]