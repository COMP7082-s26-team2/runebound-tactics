// src/test-integration/test-cards.ts
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { Server } from "colyseus"
import { CardTestRoom } from "../rooms/CardTestRoom"; // Path to your room file

process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled Async Rejection detected:", reason);
    process.exit(1); // Force terminate the hung process
});

process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception detected:", error);
    process.exit(1); 
});

async function runIntegrationTest() {
    // Force exit if the entire test script takes longer than 5 seconds
    const timeoutGuard = setTimeout(() => {
        console.error("❌ CRITICAL: Test timed out! Forcing shutdown to prevent zombie processes.");
        process.exit(1);
    }, 5000);
    
    // Unref allows the process to exit normally if the test finishes early
    timeoutGuard.unref();

    console.log("--- Starting Colyseus Framework Test ---");

    // 1. Manually instantiate a clean, raw Colyseus Server instance
    const gameServer = new Server();

    // 2. Register your room directly on the instance before booting
    gameServer
        .define("card_test_room", CardTestRoom)
        .filterBy([])
        .sortBy({});

    // 3. Pass the configured Server instance straight into the boot harness
    const colyseusServer: ColyseusTestServer = await boot(gameServer);    
    console.log("✅ In-memory server online with 'card_test_room' registered.");

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
        // 2. Connect a mock client via the client SDK layer
        const clientRoom = await colyseusServer.sdk.create("card_test_room", { maxClients:4 });
        console.log("✅ Client securely connected via WebSocket layer.");

        await new Promise((resolve) => setTimeout(resolve, 200));
    
    // This will now print safely because the initial state arrived with the connection
    if (clientRoom.state && clientRoom.state.deck && clientRoom.state.deck.cards ) {
        console.log(`Initial deck size on client: ${clientRoom.state.deck.cards.length} cards.`);
    } else {
        console.log("⚠️ Client state data structure is still parsing...");
    }        // 3. Send a network message to test drawing cards

    console.log("\n--- Dispatching drawCard action ---");
        clientRoom.send("drawCard");

        // Wait for the server to process mutations and push state updates back down the wire
        await clientRoom.waitForNextPatch();

        console.log(`Deck size on client after patch delivery: ${clientRoom.state.deck.cards.length}`);

    } catch (error) {
        console.error("Test failed during execution loop:", error);
    } finally {
        console.log("\n--- Cleaning up test environment ---");
        try {
            // Disconnect the client explicitly if it exists before killing the server ports
            await colyseusServer.shutdown();
            console.log("✅ Server shut down safely.");
        } catch (error) {
            console.warn("Non-blocking error during server shutdown:", error);
        }
    }
}

runIntegrationTest().catch(console.error);
