import "dotenv";
import { Application, Context, Next, isHttpError, HttpError } from "oak";
import router from "./websocket.ts";
import { logger, LogLevel } from "./logger.ts";

// Initialize logger with environment settings
const logLevel = Deno.env.get("LOG_LEVEL") || "INFO";
logger
  .setLogLevel(LogLevel[logLevel as keyof typeof LogLevel])
  .setEnableColors(true);

const app = new Application();

// CORS configuration
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://speedsolve.xyz",
  "https://react.speedsolve.xyz"
];

// Error interface for type safety
interface ErrorWithStatus extends Error {
  status?: number;
}

// CORS middleware
async function corsMiddleware(ctx: Context, next: Next) {
  const origin = ctx.request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    ctx.response.headers.set("Access-Control-Allow-Origin", origin);
  }

  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (ctx.request.method === "OPTIONS") {
    logger.debug("Handling preflight request");
    ctx.response.status = 200;
    return;
  }

  await next();
}

// Request logging middleware
async function requestLoggingMiddleware(ctx: Context, next: Next) {
  if (ctx.request.url.pathname === "/competition/health") {
    await next();
    return;
  }
  const start = Date.now();
  const requestId = crypto.randomUUID();

  // Log request details
  logger.info("Incoming request", {
    id: requestId,
    method: ctx.request.method,
    url: ctx.request.url.pathname,
    query: ctx.request.url.search,
  });

  logger.debug("Request details", {
    id: requestId,
    headers: Object.fromEntries(ctx.request.headers.entries()),
  });

  try {
    // Log request body if present
    if (ctx.request.hasBody) {
      const body = ctx.request.body.json();
      try {
        logger.debug("Request body", {
          id: requestId,
          body,
        });
      } catch (bodyError) {
        logger.warn("Failed to parse request body", {
          id: requestId,
          error: bodyError instanceof Error ? bodyError.message : String(bodyError),
        });
      }
    }

    await next();

    // Log response details
    const duration = Date.now() - start;
    logger.info("Request completed", {
      id: requestId,
      status: ctx.response.status,
      duration: `${duration}ms`,
    });

    logger.debug("Response details", {
      id: requestId,
      headers: Object.fromEntries(ctx.response.headers.entries()),
      body: ctx.response.body,
    });
  } catch (error) {
    // Log error details
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const status = isHttpError(error) ? error.status : 500;

    logger.error("Request failed", {
      id: requestId,
      error: errorMessage,
      stack: errorStack,
      status,
      duration: `${duration}ms`,
    });

    // Set appropriate error response
    ctx.response.status = status;
    ctx.response.body = {
      error: errorMessage,
    };

    // Re-throw for global error handler
    throw error;
  }
}

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    const error = err as ErrorWithStatus;
    
    logger.error("Unhandled error", {
      error: error.message,
      stack: error.stack,
      status: error.status || 500,
    });

    ctx.response.status = error.status || 500;
    ctx.response.body = {
      error: Deno.env.get("ENV") === "production"
        ? "Internal Server Error"
        : error.message,
    };
  }
});

// Apply middlewares
app.use(corsMiddleware);
app.use(requestLoggingMiddleware);
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
const port = Number(Deno.env.get("COMPETITION_PORT")) || 8000;
logger.info("Server starting", { port });

try {
  await app.listen({ port });
} catch (err) {
  const error = err as Error;
  logger.error("Failed to start server", {
    error: error.message,
    stack: error.stack,
    port,
  });
  Deno.exit(1);
}
