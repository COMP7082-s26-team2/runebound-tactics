import express from "express";
import cors from "cors";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { LobbyListRoom } from "./rooms/LobbyListRoom";

const PORT = Number(process.env.PORT) || 2567;

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

const httpServer = createServer(app);

const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("lobby", LobbyRoom);
gameServer.define("lobby-list", LobbyListRoom);

gameServer.listen(PORT).then(async () => {
    // Pre-create the singleton lobby-list room so it is always available
    // even before any client has navigated to Browse Lobbies.
    await matchMaker.createRoom("lobby-list", {});
    console.log(`Colyseus server running on ws://localhost:${PORT}`);
});
