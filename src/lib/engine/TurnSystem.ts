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
}
