export class Vector2D {
    constructor(
        public readonly x: number,
        public readonly y: number,
    ) {}

    static of(x: number, y: number): Vector2D {
        return new Vector2D(x, y);
    }

    static zero(): Vector2D {
        return new Vector2D(0, 0);
    }

    add(other: Vector2D): Vector2D {
        return new Vector2D(this.x + other.x, this.y + other.y);
    }

    sub(other: Vector2D): Vector2D {
        return new Vector2D(this.x - other.x, this.y - other.y);
    }

    scale(s: number): Vector2D {
        return new Vector2D(this.x * s, this.y * s);
    }

    dot(other: Vector2D): number {
        return this.x * other.x + this.y * other.y;
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize(): Vector2D {
        const len = this.length();
        return len === 0 ? Vector2D.zero() : this.scale(1 / len);
    }

    lerp(to: Vector2D, t: number): Vector2D {
        return new Vector2D(
            this.x + (to.x - this.x) * t,
            this.y + (to.y - this.y) * t,
        );
    }

    distanceTo(other: Vector2D): number {
        return this.sub(other).length();
    }
}
