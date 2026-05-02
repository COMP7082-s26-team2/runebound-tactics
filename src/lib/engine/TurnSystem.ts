import EventBus from "./EventBus";

interface Participant {
    id: string;
}

class TurnSystem {
    private _participants: Participant[] = [];
    private _index = 0;
    private _round = 0;
    private _started = false;
    private _loop: boolean | null = null;
    private _acted = new Set<string>();
    private _skipped = new Set<string>();
    private _eventBus: EventBus | null = null;

    get activeParticipant() {
        return this._participants[this._index] ?? null;
    }

    get activeId() {
        return this.activeParticipant?.id ?? null;
    }

    get turnIndex() {
        return this._index;
    }

    get started() {
        return this._started;
    }

    private _advance = () => {
        const total = this._participants.length;
        let next = (this._index + 1) % total;
        let steps = 0;

        while (
            this._skipped.has(this._participants[next]?.id) &&
            steps < total
        ) {
            next = (next + 1) % total;
            steps++;
        }

        const wrappedAround = next <= this._index;

        if (wrappedAround) {
            this._skipped.clear();
            this._round++;
            // TODO: add string union type
            this._emit("turn:round-end", { round: this._round - 1 });

            if (this._loop) {
                this._started = false;
                this._emit("turn:sequence-end", {
                    round: this._round - 1,
                });
                return;
            }
        }

        this._index = next;
        this._emit("turn:begin", this._turnPayload());
    };

    private _validateAndAdd = (participant: Participant) => {
        if (!participant || typeof participant.id !== "string") {
            throw new Error(
                '[TurnSystem] Each participant must have a string "id" property.',
            );
        }

        if (this._participants.some((p) => p.id === participant.id)) {
            throw new Error(
                `[TurnSystem] Duplicate participant id "${participant.id}"`,
            );
        }

        this._participants.push(participant);
    };

    private _turnPayload = () => {
        return {
            participant: this.activeParticipant,
            round: this._round,
            turnIndex: this._index,
        };
    };

    private _emit = (event: string, payload: object) => {
        this._eventBus?.emit(event, payload);
    };
}
