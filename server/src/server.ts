import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import { registerRooms } from "./rooms";

export function createGameServer() {
    const httpServer = createServer();
    const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

    // Register before Colyseus so CORS headers are set before its listeners run.
    // The headersSent guard protects against any edge case where a prior listener
    // already completed the response.
    httpServer.on("request", (req, res) => {
        if (res.headersSent) return;

        res.setHeader("Access-Control-Allow-Origin", clientOrigin);
        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, DELETE, OPTIONS",
        );
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization",
        );

        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        else if (req.method === "GET" && req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok" }));
        }
    });

    const gameServer = new Server({
        transport: new WebSocketTransport({ server: httpServer }),
    });

    registerRooms(gameServer);

    return { gameServer, httpServer };
}
