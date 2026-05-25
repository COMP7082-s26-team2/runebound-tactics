import { createGameServer } from "./server";
import prisma from "./lib/prisma";

const port = Number(process.env.PORT ?? 2567);
const { gameServer } = createGameServer();

// Ensure room onDispose callbacks fire and DB pool closes on shutdown
process.on("SIGTERM", () => {
    gameServer.gracefullyShutdown();
    prisma.$disconnect();
});
process.on("SIGINT", () => {
    gameServer.gracefullyShutdown();
    prisma.$disconnect();
});

gameServer.listen(port).then(() => {
    console.log(`Colyseus server listening on ws://localhost:${port}`);
});
