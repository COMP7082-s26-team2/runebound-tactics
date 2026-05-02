interface Participant {
    id: string;
}

class TurnSystem {
    private _participants: Participant[] = [];
    private _index = 0;
    private _started = false;
    private _loop: boolean | null = null;
    private _acted = new Set<string>();
    private _skipped = new Set<string>();

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

}
