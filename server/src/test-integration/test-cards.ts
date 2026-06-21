// src/test-integration/test-cards.ts
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { CardTestRoom } from "../rooms/CardTestRoom"; // Path to your room file

async function runIntegrationTest() {
    console.log("--- Starting Colyseus Framework Test ---");

    // 1. Boot up the test server by passing a Colyseus configuration object
    const colyseusServer: ColyseusTestServer = await boot({
        // This configuration object mimics your arena.config.ts setup
        initializeGameServer: (gameServer) => {
            // This guarantees the matchmaker registers the name properly
            gameServer.define("card_test_room", CardTestRoom as any);
        }
    });
    console.log("✅ In-memory server online with 'card_test_room' registered.");

    try {
        // 2. Connect a mock client via the client SDK layer
        const clientRoom = await colyseusServer.sdk.joinOrCreate("card_test_room");
        console.log("✅ Client securely connected via WebSocket layer.");
        
        // Check initial state synchronized to the client container
        console.log(`Initial deck size on client: ${clientRoom.state.deck.cards.length} cards.`);

        // 3. Send a network message to test drawing cards
        console.log("\n--- Dispatching drawCard action ---");
        clientRoom.send("drawCard");

        // Wait for the server to process mutations and push state updates back down the wire
        await clientRoom.waitForNextPatch();

        console.log(`Deck size on client after patch delivery: ${clientRoom.state.deck.cards.length}`);

    } catch (error) {
        console.error("Test failed during execution loop:", error);
    } finally {
        // 4. Clean up open sockets and shutdown ports gracefully
        await colyseusServer.shutdown();
        console.log("\n--- Test Suite Complete: Server shut down safely ---");
    }
}

runIntegrationTest().catch(console.error);
