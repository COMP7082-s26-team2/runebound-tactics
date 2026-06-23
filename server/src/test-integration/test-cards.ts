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
        // 1. Connect User A
        const userA = await colyseusServer.sdk.create("card_test_room", {});
        const idA = userA.sessionId;
        console.log(`✅ User A connected. Session ID: ${idA}`);

        // 2. Connect User B to the exact same room instance
        // Using .joinOrCreate ensures User B joins the active room User A just made
        const userB = await colyseusServer.sdk.joinOrCreate("card_test_room", {});
        const idB = userB.sessionId;
        console.log(`✅ User B connected. Session ID: ${idB}`);
        
        await new Promise((resolve) => setTimeout(resolve, 200));

        // 3. Verify Initial State Alignment
        const slotA = userA.state.players.get(idA);
        const slotB = userB.state.players.get(idB);

    console.log(`\n[Initial Verification]`);
    if (slotA && slotB) {
        console.log(`User A Deck Size: ${slotA.deck?.cards?.length} cards.`);
        console.log(`User B Deck Size: ${slotB.deck?.cards?.length} cards.`);
    } else {
        console.log("⚠️ Synchronization incomplete:");
        console.log(`-> Slot A found on Client A? ${!!slotA}`);
        console.log(`-> Slot B found on Client B? ${!!slotB}`);
    }    
        // 4. User A Executes an Action
        console.log("\n--- User A dispatches drawCard action ---");
        userA.send("drawCard");

        // Settle network loop for User A's mutation patch
        await new Promise((resolve) => setTimeout(resolve, 250));

        // 5. Assert Independent Mutations
        const updatedA = userA.state.players.get(idA);
        const updatedB = userB.state.players.get(idB);

        console.log(`\n[Post-Action Verification]`);
        console.log(`User A Deck Size: ${updatedA?.deck?.cards?.length} cards. (Should be decremented)`);
        console.log(`User B Deck Size: ${updatedB?.deck?.cards?.length} cards. (Should remain unchanged)`);

        if (updatedA?.deck?.cards?.length === 1 && updatedB?.deck?.cards?.length === 2) {
            console.log("\n✅ Success! State tracking is isolated per player map schema.");
        } else {
            console.error("\n❌ Error: Cross-contamination or structural synchronization failure.");
        }
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
