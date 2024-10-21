import "@std/dotenv/load";
import { Application } from "oak";

import router from "./routes.ts";
// import verifyToken from "./auth.ts";

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(Deno.env.get("PROFILE_PORT")) | 8000;
console.log(`Server runing on port ${port}`);

await app.listen({ port: port });
