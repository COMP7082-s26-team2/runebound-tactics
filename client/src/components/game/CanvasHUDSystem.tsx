export class CanvasHUDSystem {
    draw(ctx: CanvasRenderingContext2D, data: any) {
        // UI Layout Constants
        const sidebarX = 810; 
        const boxWidth = 250;

        // RIGHT SIDEBAR BOXES
        this.drawBox(ctx, sidebarX, 0, boxWidth, 100, "Tactician Jas", data.tactician.rank);
        this.drawBox(ctx, sidebarX, 110, boxWidth, 100, "Unit Stats", `HP: ${data.stats.hp} | ATK: ${data.stats.ad}`);
        this.drawBox(ctx, sidebarX, 220, boxWidth, 100, "Game Status", `Phase: ${data.status.phase} | Turn: ${data.status.turn}`);

        // BOTTOM FOOTER CARDS
        this.drawCardHand(ctx, data.cards);
    }

    private drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, text: string) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        
        ctx.fillStyle = "white";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(title, x + 15, y + 35);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px sans-serif";
        ctx.fillText(text, x + 15, y + 70);
    }

    private drawCardHand(ctx: CanvasRenderingContext2D, cards: any[]) {
        const cardWidth = 72;
        const cardHeight = 80;
        const startY = 810;

        cards.forEach((_, i) => {
            const x = 5 + (i * 78);
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(x, startY, cardWidth, cardHeight);
            ctx.strokeStyle = "#475569";
            ctx.strokeRect(x, startY, cardWidth, cardHeight);
            ctx.fillStyle = "#cbd5e1";
            ctx.font = "10px sans-serif";
            ctx.fillText(`Card ${i + 1}`, x + 20, startY + 45);
        });
    }
}