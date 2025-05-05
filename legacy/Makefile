.PHONY: all build up down clean reset

all: build up

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

clean:
	docker-compose down --rmi local --remove-orphans

reset: clean all
