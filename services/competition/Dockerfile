FROM denoland/deno:2.0.2

EXPOSE 8000

WORKDIR /app

COPY . /app

RUN deno install -e main.ts

CMD ["run", "--allow-read", "--allow-net", "--allow-env", "main.ts"]
