import { Room, Client } from "colyseus";
import {
    ChatMessage,
    TestPlayer,
    TestRoomState,
} from "@runebound-tactics/shared";

// ---------------------------------------------------------------------------
// Message payloads
// ---------------------------------------------------------------------------

interface ChatPayload {
    text: string;
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

export class TestRoom extends Room<{
    state: TestRoomState;
}> {
    maxClients = 4;

    onCreate(): void {
        this.setState(new TestRoomState());

        this.onMessage<ChatPayload>("chat", (client, payload) => {
            console.log(`chat triggered: ${JSON.stringify(payload)}`);
            const player = this.state.players.get(client.sessionId);
            if (!player || typeof payload?.text !== "string") return;

            const text = payload.text.trim().slice(0, 200);
            if (!text) return;

            const msg = new ChatMessage();
            msg.sender = player.displayName;
            msg.text = text;
            msg.timestamp = Date.now();
            this.state.messages.push(msg);

            this.broadcast("message", payload);
        });
    }

    onJoin(client: Client, options?: { displayName?: string }): void {
        const player = new TestPlayer();
        player.displayName = String(options?.displayName ?? "Player").slice(
            0,
            32,
        );
        this.state.players.set(client.sessionId, player);
        console.log(
            `[TestRoom] ${player.displayName} joined (${client.sessionId})`,
        );
    }

    onLeave(client: Client): void {
        const player = this.state.players.get(client.sessionId);
        console.log(
            `[TestRoom] ${player?.displayName ?? client.sessionId} left`,
        );
        this.state.players.delete(client.sessionId);
    }
}
