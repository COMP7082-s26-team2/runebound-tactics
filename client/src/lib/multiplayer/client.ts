// client/src/lib/multiplayer/client.ts
import { Client } from "@colyseus/sdk";

const COLYSEUS_URL =
    process.env.NEXT_PUBLIC_COLYSEUS_URL ?? "ws://localhost:2567";
export const client = new Client(COLYSEUS_URL);
