import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import { registerRooms } from "./rooms";

export function createGameServer() {
    const httpServer = createServer();

    const gameServer = new Server({
        transport: new WebSocketTransport({ server: httpServer }),
    });

    const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

    // Health check + CORS for HTTP requests (WebSocket upgrades don't need CORS headers)
    httpServer.on("request", (req, res) => {
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

        if (req.method === "GET" && req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok" }));
        }
    });

    registerRooms(gameServer);

    return { gameServer, httpServer };
}
