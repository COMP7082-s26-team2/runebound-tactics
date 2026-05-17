import { Server } from "colyseus";
import { createServer } from "http";

const port = Number(process.env.PORT ?? 2567);
const httpServer = createServer();
const gameServer = new Server({ server: httpServer });

gameServer.listen(port).then(() => {
    console.log(`Colyseus server listening on ws://localhost:${port}`);
});
