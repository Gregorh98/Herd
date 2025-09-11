var canvas = document.getElementById('canvas');

var canvasWidth = 640;
var canvasHeight = 480;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

canvas.style.background = "darkgreen"
var ctx = canvas.getContext('2d');
ctx.textBaseline = "middle"; // vertical alignment

var total_pen_count = Math.ceil(Math.random() * 3);
var total_sheep_count = Math.ceil(Math.random() * 20) * total_pen_count;

class GameObject {
    constructor(x, y, width, height) {
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
    }

    update(){};
    draw(ctx){};

    bounding_rect(){
        let x1 = this.x
        let y1 = this.y
        let x2 = this.x + this.width
        let y2 = this.y + this.height
        return [x1, y1, x2, y2]
    }

    test_collision(other) {
        let [x1_min, y1_min, x1_max, y1_max] = this.bounding_rect()
        let [x2_min, y2_min, x2_max, y2_max] = other.bounding_rect()
        return !(x1_max < x2_min || x1_min > x2_max || y1_max < y2_min || y1_min > y2_max)
    }
}

class SolidGameObject extends GameObject {
    constructor(x, y, width, height) {
        super(x, y, width, height);
    }
}

class Sheep extends SolidGameObject {
    constructor(x, y, radius) {
        super(x, y, radius * 2, radius * 2);
        this.radius = radius;
        this.color = this.get_colour();
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
        this.maxSpeed = 1.5 + Math.random() * 1.5;

        this.stampedeCooldown = Math.random() * 500 + 500; // frames until next possible stampede
        this.mouseTolerance = 50 + Math.random() * 40; // 20–60px
    }

    get_colour() {
        let cols = ["white", "lightgray", "gray", "darkgray"];
        let index = Math.floor(Math.pow(Math.random(), 3) * cols.length);
        return cols[index];
    }

    draw(ctx) {
        const speed = Math.hypot(this.vx, this.vy);
        const angle = speed > 0.01 ? Math.atan2(this.vy, this.vx) : 0;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        const headOffset = this.radius * 1.2;
        const headRadius = this.radius * 0.6;
        ctx.beginPath();
        ctx.arc(headOffset, 0, headRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    update() {
        let moveX = this.vx;
        let moveY = this.vy;

        const dx = this.x - g.mouse_x;
        const dy = this.y - g.mouse_y;
        const distance = Math.hypot(dx, dy);

        const flockRadius = this.radius * 5;
        let flockVX = 0, flockVY = 0;
        let neighborCount = 0;

        if (distance < this.radius + 5) {
            const angle = Math.random() * Math.PI * 2;
            const force = this.maxSpeed * 3;
            moveX = Math.cos(angle) * force;
            moveY = Math.sin(angle) * force;

            for (const other of g.objects) {
                if (other !== this) {
                    const ox = other.x - this.x;
                    const oy = other.y - this.y;
                    const dist = Math.hypot(ox, oy);
                    if (dist < flockRadius) {
                        flockVX += ox;
                        flockVY += oy;
                        neighborCount++;
                    }
                }
            }

            if (neighborCount > 0) {
                flockVX /= neighborCount;
                flockVY /= neighborCount;
                moveX += flockVX * (0.3 + Math.random() * 0.5);
                moveY += flockVY * (0.3 + Math.random() * 0.5);
            }
        }
        else if (distance < this.mouseTolerance && distance > 0) {
            moveX += (dx / distance) * this.maxSpeed * 0.5;
            moveY += (dy / distance) * this.maxSpeed * 0.5;
        }

        const margin = this.radius + 5;
        if (this.x < margin) moveX += this.maxSpeed * 0.5;
        if (this.x > canvas.width - margin) moveX -= this.maxSpeed * 0.5;
        if (this.y < margin) moveY += this.maxSpeed * 0.5;
        if (this.y > canvas.height - margin) moveY -= this.maxSpeed * 0.5;

        for (const other of g.objects) {
            if (other !== this) {
                const ox = this.x - other.x;
                const oy = this.y - other.y;
                const dist = Math.hypot(ox, oy);
                if (dist < this.radius * 3 && dist > 0) {
                    moveX += (ox / dist) * 0.3;
                    moveY += (oy / dist) * 0.3;
                }
            }
        }

        if (Math.random() < 0.01) {
            moveX += (Math.random() - 0.5) * 0.3;
            moveY += (Math.random() - 0.5) * 0.3;
        }

        this.stampedeCooldown--;
        if (this.stampedeCooldown <= 0) {
            this.stampedeCooldown = Math.random() * 500 + 500;
            const angle = Math.random() * Math.PI * 2;
            const boostX = Math.cos(angle) * this.maxSpeed * 2;
            const boostY = Math.sin(angle) * this.maxSpeed * 2;
            moveX += boostX;
            moveY += boostY;

            for (const other of g.objects) {
                if (other !== this) {
                    const ox = other.x - this.x;
                    const oy = other.y - this.y;
                    const dist = Math.hypot(ox, oy);
                    if (dist < this.radius * 5) {
                        other.vx += boostX * 0.5;
                        other.vy += boostY * 0.5;
                    }
                }
            }
        }

        const speed = Math.hypot(moveX, moveY);
        if (speed > this.maxSpeed) {
            moveX = (moveX / speed) * this.maxSpeed;
            moveY = (moveY / speed) * this.maxSpeed;
        }

        this.x += moveX;
        this.y += moveY;
        this.vx = moveX * 0.9;
        this.vy = moveY * 0.9;

        for (let pen of g.objects.filter(o => o instanceof Pen)) {
            if (this.test_collision(pen)) {
                if (pen.sheep_count >= pen.max_sheep_count) {
                    // Push sheep out if pen is full
                    if (this.x < pen.x) this.x = pen.x - this.radius;
                    if (this.x > pen.x + pen.width) this.x = pen.x + pen.width + this.radius;
                    if (this.y < pen.y) this.y = pen.y - this.radius;
                    if (this.y > pen.y + pen.height) this.y = pen.y + pen.height + this.radius;
                } else {
                    const minX = pen.x + this.radius;
                    const maxX = pen.x + pen.width - this.radius;
                    const minY = pen.y + this.radius;
                    const maxY = pen.y + pen.height - this.radius;

                    if (this.x < minX) this.x = minX;
                    if (this.x > maxX) this.x = maxX;
                    if (this.y < minY) this.y = minY;
                    if (this.y > maxY) this.y = maxY;
                }
            }
        }
    }
}

class Pen extends GameObject {
    constructor(x, y, width, height, max_sheep_count) {
        super(x, y, width, height);
        this.color = "saddlebrown";
        this.sheep_count = 0;
        this.max_sheep_count = max_sheep_count;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 4;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.sheep_count = 0;
        for (const obj of g.objects) {
            if (obj instanceof Sheep && this.test_collision(obj)) {
                this.sheep_count++;
            }
        }
    }
}

class Label extends GameObject {
    constructor(x, y, text = "", align = "right") {
        super(x, y, 0, 0);
        this.text = text;
        this.align = align;
    }

    draw(ctx) {
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = this.align;
        ctx.fillText(this.text, this.x, this.y);
    }
}

class PenLabel extends Label {
    constructor(pen) {
        super(pen.x + (pen.width / 2), pen.y + pen.height + 20, "", "center");
        this.pen = pen;
    }

    update() {
        this.text = `${this.pen.sheep_count} / ${this.pen.max_sheep_count}`, this.x, this.y
    }
}

class Timer extends GameObject {
    constructor(x, y) {
        super(x, y, 0, 0);
        this.x = x;
        this.y = y;
        this.seconds = 0;
        this.lastUpdate = Date.now();
    }

    update() {
        let now = Date.now();
        if (now - this.lastUpdate >= 1000) {
            this.seconds++;
            this.lastUpdate = now;
            g.label.text = `Time: ${this.seconds}s`;
        }
    }
}

class Game {
    constructor() {
        this.objects = [];
        this.generate_pens(total_pen_count)

        this.timer = new Timer(canvas.width - 10, 30);
        this.objects.push(this.timer)

        this.label = new Label(canvas.width - 10, 30, "Herd the sheep into the pens!", "right");
        this.objects.push(this.label)

        for (let i = 0; i < total_sheep_count; i++) {
            this.objects.push(new Sheep(Math.random() * canvas.width, Math.random() * canvas.height, 4));
        }

        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse_x = e.clientX - rect.left;
            this.mouse_y = e.clientY - rect.top;
        });
    }

    generate_pens(pen_count) {
        let placed_pens = [];
        let penWidth = 100;
        let penHeight = 100;
        let minSpacing = 50; // minimum distance between pens

        for (let i = 0; i < pen_count; i++) {
            let x, y, valid;
            do {
                x = Math.random() * (canvasWidth - penWidth);
                y = Math.random() * (canvasHeight - penHeight - 20);
                valid = true;

                for (let other of placed_pens) {
                    let dx = (x + penWidth / 2) - (other.x + other.width / 2);
                    let dy = (y + penHeight / 2) - (other.y + other.height / 2);
                    let dist = Math.hypot(dx, dy);
                    if (dist < Math.max(penWidth, penHeight) + minSpacing) {
                        valid = false;
                        break;
                    }
                }
            } while (!valid);

            let pen = new Pen(x, y, penWidth, penHeight, Math.floor(total_sheep_count / pen_count));
            placed_pens.push(pen);
            this.objects.push(pen);
            this.objects.push(new PenLabel(pen));
        }
    }

    check_running() {
        if (this.timer.seconds > 60) {
            this.label.text = "Out of Time!"
            return false
        }
        let total_penned = 0;
        for (const obj of this.objects.filter(x => x instanceof Pen)) {
            total_penned += obj.sheep_count;
        }
        if (total_penned >= total_sheep_count) {
            this.label.text = "All Sheep Penned!";
            return false
        }
        return true
    }

    async loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const obj of this.objects) {
            await obj.update();
            await obj.draw(ctx);
        }
        if (this.check_running()) {
            requestAnimationFrame(() => this.loop());
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const obj of this.objects) {
                await obj.update();
                await obj.draw(ctx);
            }
        }
    }

    start() {
        console.log("Game started");
        this.loop();
    }
}

let g = new Game();
g.start();
