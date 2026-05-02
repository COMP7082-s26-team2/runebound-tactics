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

    constructor(
        participants: Participant[] = [],
        eventBus = null,
        loop = true,
    ) {
        this._eventBus = eventBus;
        this._loop = loop;

        for (const p of participants) {
            this._validateAndAdd(p);
        }
    }

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

    addParticipant = (participant: Participant) => {
        this._validateAndAdd(participant);
        this._emit("turn:participant-added", { participant });
    };

    removeParticipant = (id: string) => {
        const participantIndex = this._participants.findIndex(
            (p) => p.id === id,
        );

        if (participantIndex < 0) return;

        const participant = this._participants[participantIndex];

        if (this._started && participantIndex === this._index) {
            this._advance();
        }

        this._participants.splice(participantIndex, 1);
        if (this._index >= this._participants.length) {
            this._index = 0;
        }

        this._emit("turn:participant-removed", { participant });
    };

    getParticipant = (id: string) => {
        return this._participants.find((p) => p.id === id);
    };

    isActive = (id: string) => {
        return this.activeId === id;
    };

    markActed = (token: string) => {
        this._acted.add(token);
    };

    hasActed = (token: string) => {
        return this._acted.has(token);
    };

    getActedTokens = () => {
        return new Set(this._acted);
    };

    clearActed = () => {
        this._acted.clear();
    };

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
