Runebound Tactics: Card System Design 

This page explains how the multiplayer card game system works in plain English. It covers where information lives, how players join, how cards are played, and how we test it safely.

1. Where Information Lives (The Big Picture)

Think of the game state as a post office. The server is the main building, and inside it, every player has their own private locker (a GamePlayerSlot).

[Master Game State] (The Post Office)
   └── [Player Lockers] (A map of all players, found by their Session ID)
         ├── Session ID & Name
         ├── Faction & Win/Loss Status
         ├── Gold Balance (Current pocket money)
         └── Personal Deck (The Deck Manager)
               ├── Draw Pile (Cards waiting to be drawn)
               └── Discard Pile (Used cards)


Why the seperation:

Because every player's deck and gold are locked inside their own locker, there is zero risk of Player A's actions accidentally modifying Player B's cards. Each player owns their data.

2. How a Player Joins (The Setup Order)

When a player connects, we build their locker step-by-step. Doing things in a specific order prevents the game from accidentally resetting your gold to $0$:

1. Handshake: A player knocks on the door and connects.
       │
       ▼
2. Build the Locker: The server creates a brand new, empty locker.
   (Inside the empty locker, Gold starts at a default of 0)
       │
       ▼
3. Add Custom Loot: The server checks what options the player connected with. 
   If the game says "give them 50 gold," we cross out the 0 and write 50.
       │
       ▼
4. Set Up the Deck: The server puts a fresh pack of cards into the locker's draw pile.
       │
       ▼
5. Put Locker on the Shelf: The locker is officially added to the active game. 
   The server broadcasts a notification to all players so they can see the new player.


3. Drawing and Playing Cards (How Things Change)

When a player wants to draw and play a card, the server acts as a strict store clerk. It follows a simple checklist before allowing the action:

Check the Index: Is the card they are trying to play actually in their deck? (e.g., if they have 2 cards, they can't ask to play card #5).

Check the Wallet: Does the player have enough gold to cover the card's cost? ($Gold \ge Cost$).

The Swap: If they pass both checks, the clerk takes their gold, slips the card out of their deck, and activates it.

The Network Magic:

You don't need to write complicated code to tell the players the deck has changed. Because we are using Colyseus's built-in arrays, the moment we remove a card (splice), the server automatically updates the screens of all connected players in the blink of an eye.

4. How We Test It (The Golden Rules)

To make sure everything works perfectly without starting up a real game interface, we run automatic code tests. When writing these tests, we follow three golden rules:

Wait for the Network: Code runs incredibly fast, but sending information over the internet (even in a test) takes a few milliseconds. Always put a tiny pause (await sleep) in your test after a player joins or plays a card so the network has time to catch up.

Target Lockers Directly: Never guess where a player's data is. Always grab the player's unique connection ID first, and use that specific key to check their locker.

Listen for Warnings: If a player tries to do something illegal (like playing a $10$-gold card with only $2$ gold), make sure the test is actively listening for the "error" message so your terminal doesn't throw messy warnings.

eof

### What Changed in this Version?
* **Analogy Driven:** Swapped complex terminology like "MapSchema," "binary snapshots," and "proxy diffing" for real-world concepts like lockers, store clerks, and post offices.
* **Clear Flow:** Replaced abstract charts with a step-by-step sequential breakdown of how players enter the lobby and how calculations are guarded.
* **Actionable Testing Tips:** Framed the technical setup rules for integration testing as friendly "Golden Rules" to make writing your next test suite much easier.
