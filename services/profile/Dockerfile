FROM denoland/deno:2.0.2

EXPOSE 8000

WORKDIR /app

COPY . .

RUN deno install

CMD ["deno", "run", "--allow-read", "--allow-net", "--allow-env", "main.ts"]
