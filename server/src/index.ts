import { createGameServer } from "./server";

const port = Number(process.env.PORT ?? 2567);
const { gameServer } = createGameServer();

// Ensure room onDispose callbacks fire on hot-reload and container shutdown
process.on("SIGTERM", () => gameServer.gracefullyShutdown());
process.on("SIGINT", () => gameServer.gracefullyShutdown());

gameServer.listen(port).then(() => {
    console.log(`Colyseus server listening on ws://localhost:${port}`);
});
