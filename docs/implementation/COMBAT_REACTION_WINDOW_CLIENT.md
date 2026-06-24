# Implementation Plan: Combat Reaction Window — Client UI

Implements the client-side overlay described in BCOMP-187. Depends on [`docs/implementation/COMBAT_REACTION_WINDOW.md`](./COMBAT_REACTION_WINDOW.md) (BCOMP-186), which synchronizes `state.reactionPhase` and broadcasts `reaction_phase` messages.

---

## Files

| File | Status | Change |
|---|---|---|
| `client/src/components/game/CombatReactionWindow.tsx` | **New** | Overlay component — phase label, active player name, countdown, Pass/Play buttons |
| `client/src/components/game/MultiplayerGame.tsx` | Modify | Import and mount `CombatReactionWindow`; add `passReaction` and `playReactionCard` callbacks |

---

## 1. `client/src/components/game/CombatReactionWindow.tsx` — New file

```tsx
"use client";

import { useEffect, useState } from "react";
import { useGameRoomMessage } from "@/context/colyseus";
import { Button } from "@/components/ui/Button";
import type { GameState } from "@runebound-tactics/shared";

interface CombatReactionWindowProps {
    state: GameState;
    sessionId: string;
    onPass: () => void;
    onPlay: () => void;
}

const PHASE_LABELS: Record<string, string> = {
    "defender":      "Defender's Reaction",
    "defender-ally": "Defender Ally Window",
    "attacker-ally": "Attacker Ally Window",
    "resolve":       "Resolving…",
};

const REACTION_TIMEOUT_SECONDS = 10;

export function CombatReactionWindow({
    state,
    sessionId,
    onPass,
    onPlay,
}: CombatReactionWindowProps) {
    const [activePlayer, setActivePlayer] = useState<string>("");
    const [secondsLeft, setSecondsLeft] = useState(REACTION_TIMEOUT_SECONDS);

    // Track which player is active in the current sub-phase.
    useGameRoomMessage<{ phase: string; activePlayer: string }>(
        "reaction_phase",
        ({ activePlayer: ap }) => {
            setActivePlayer(ap);
        },
    );

    // Reset countdown when the sub-phase changes.
    useEffect(() => {
        setSecondsLeft(REACTION_TIMEOUT_SECONDS);
    }, [state.reactionPhase]);

    const isActivePlayer = activePlayer === sessionId;

    // Tick countdown only for the active player while the window is open.
    useEffect(() => {
        if (state.reactionPhase === "" || !isActivePlayer) return;
        const id = setInterval(
            () => setSecondsLeft((s) => Math.max(0, s - 1)),
            1000,
        );
        return () => clearInterval(id);
    }, [state.reactionPhase, isActivePlayer]);

    if (state.reactionPhase === "") return null;

    const phaseLabel = PHASE_LABELS[state.reactionPhase] ?? state.reactionPhase;
    const players = state.players as unknown as Record<
        string,
        { displayName: string }
    >;
    const activePlayerName = players[activePlayer]?.displayName ?? activePlayer;

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 bg-black/70 text-white font-mono text-sm p-4 rounded min-w-56">
            <div className="flex items-center justify-between gap-4">
                <span className="font-semibold">{phaseLabel}</span>
                {isActivePlayer && (
                    <span className="text-yellow-300">{secondsLeft}s</span>
                )}
            </div>
            {isActivePlayer ? (
                <div className="flex gap-2 mt-1">
                    <Button
                        type="secondary"
                        disabled
                        onClick={onPlay}
                        title="Card system coming soon"
                    >
                        Play
                    </Button>
                    <Button onClick={onPass}>Pass</Button>
                </div>
            ) : (
                <span className="text-gray-400">
                    Waiting for {activePlayerName}…
                </span>
            )}
        </div>
    );
}
```

---

## 2. `client/src/components/game/MultiplayerGame.tsx` — Modifications

### 2a. Add import

```diff
 import { GameHUD } from "@/components/game/GameHUD";
+import { CombatReactionWindow } from "@/components/game/CombatReactionWindow";
```

### 2b. Add callbacks alongside `endTurn`

```diff
     function endTurn() {
         room?.send("end_turn", {});
     }
+
+    function passReaction() {
+        room?.send("pass_reaction", {});
+    }
+
+    function playReactionCard() {
+        room?.send("play_reaction_card", {});
+    }
```

### 2c. Mount `CombatReactionWindow` inside the relative container

```diff
         <div className="relative inline-block">
             <MultiplayerGameCanvas room={room} state={gameState} />
             <GameHUD
                 state={gameState}
                 sessionId={room.sessionId}
                 onLeave={leave}
                 onEndTurn={endTurn}
             />
+            <CombatReactionWindow
+                state={gameState}
+                sessionId={room.sessionId}
+                onPass={passReaction}
+                onPlay={playReactionCard}
+            />
         </div>
```

---

## Verification

1. `yarn workspace @runebound-tactics/client-next tsc --noEmit` — zero type errors
2. Start server + two browser clients; have player 1 issue an attack on player 2's unit.
3. Both clients should see the reaction window appear at bottom-center of the canvas with label **"Defender's Reaction"**.
4. The **defender** client sees Pass and Play buttons plus a countdown from 10.
5. The **attacker** client sees the phase label and "Waiting for [defender name]…" with no buttons.
6. Defender clicks **Pass** → window progresses through `defender-ally`, `attacker-ally`, `resolve` (all auto-passed server-side) and disappears.
7. Defender does **not** click Pass → after 10s the server fires `REACTION_TIMEOUT`; `state.reactionPhase` becomes `""` and the overlay disappears on both clients.
8. Play button is visible but disabled for the active player with tooltip "Card system coming soon".
9. After the window closes, damage resolves and the game continues normally (`turnPhase` cycles to `combat → post-combat → action-phase`).
