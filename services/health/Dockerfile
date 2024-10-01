FROM golang:1.23

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY *.go ./

RUN CGO_ENABLED=0 GOOS=linux go build -o /health-server

EXPOSE 8080

CMD ["/health-server"]
