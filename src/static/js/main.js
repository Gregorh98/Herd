var canvas = document.getElementById('canvas');
canvas.style.background = "darkgreen"
var ctx = canvas.getContext('2d');

var seconds = 0;

class GameObject {
    constructor(x, y, width, height) {
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
    }

    bounding_rect(){
        let x1 = this.x
        let y1 = this.y
        let x2 = this.x + this.width
        let y2 = this.y + this.height
        return [x1, y1, x2, y2]
    }


}

class SolidGameObject extends GameObject {
    constructor(x, y, width, height) {
        super(x, y, width, height);
    }

    test_collision(other) {
        let [x1_min, y1_min, x1_max, y1_max] = this.bounding_rect()
        let [x2_min, y2_min, x2_max, y2_max] = other.bounding_rect()
        return !(x1_max < x2_min || x1_min > x2_max || y1_max < y2_min || y1_min > y2_max)
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
        this.mouseTolerance = 30 + Math.random() * 40; // 20–60px

    }

    get_colour() {
        let cols = ["white", "lightgray", "gray", "darkgray"];
        let index = Math.floor(Math.pow(Math.random(), 3) * cols.length);
        return cols[index];
    }

draw(ctx) {
    const speed = Math.hypot(this.vx, this.vy);
    const angle = speed > 0.01 ? Math.atan2(this.vy, this.vx) : 0; // direction of movement

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    // Draw body
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Draw head with offset along facing direction
    const headOffset = this.radius * 1.2; // enough so it's visible
    const headRadius = this.radius * 0.6; // bigger than before

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

    // Flocking parameters
    const flockRadius = this.radius * 5; // distance to consider "neighbors"
    let flockVX = 0, flockVY = 0;
    let neighborCount = 0;

    // 1. Collision with mouse: shoot off, but flock if nearby sheep
    if (distance < this.radius + 5) {
        // Direction away from mouse
        const angle = Math.random() * Math.PI * 2;
        const force = this.maxSpeed * 3;
        moveX = Math.cos(angle) * force;
        moveY = Math.sin(angle) * force;

        // Check neighbors for flocking
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

        // Adjust move to align with flock (move together)
        if (neighborCount > 0) {
            flockVX /= neighborCount;
            flockVY /= neighborCount;

            // Combine mouse-escape and flocking
            moveX += flockVX * 0.5;
            moveY += flockVY * 0.5;
        }
    }
    // 2. Gentle mouse avoidance (only if not colliding)
    else if (distance < this.mouseTolerance && distance > 0) {
        moveX += (dx / distance) * this.maxSpeed * 0.5;
        moveY += (dy / distance) * this.maxSpeed * 0.5;
    }

    // 3. Avoid canvas edges
    const margin = this.radius + 5;
    if (this.x < margin) moveX += this.maxSpeed * 0.5;
    if (this.x > canvas.width - margin) moveX -= this.maxSpeed * 0.5;
    if (this.y < margin) moveY += this.maxSpeed * 0.5;
    if (this.y > canvas.height - margin) moveY -= this.maxSpeed * 0.5;

    // 4. Soft separation from other sheep
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

    // 5. Tiny random wandering
    if (Math.random() < 0.01) {
        moveX += (Math.random() - 0.5) * 0.3;
        moveY += (Math.random() - 0.5) * 0.3;
    }

    // 6. Stampede logic
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

    // 7. Limit speed
    const speed = Math.hypot(moveX, moveY);
    if (speed > this.maxSpeed) {
        moveX = (moveX / speed) * this.maxSpeed;
        moveY = (moveY / speed) * this.maxSpeed;
    }

    // Apply movement
    this.x += moveX;
    this.y += moveY;
    this.vx = moveX * 0.9;
    this.vy = moveY * 0.9;
}


}


// class Pen extends GameObject(x, y, width, height) {
//     constructor(x, y, width, height) {
//         super(x, y, width, height);
//         this.color = "brown";
//     }
//
//     draw(ctx) {
//         ctx.fillStyle = this.color;
//         ctx.fillRect(this.x, this.y, this.width, this.height);
//     }
// }

class Game {
    constructor() {
        this.objects = [];
        for (let i = 0; i < 15; i++) {
            this.objects.push(new Sheep(Math.random() * canvas.width, Math.random() * canvas.height, 4));
        }

        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse_x = e.clientX - rect.left;
            this.mouse_y = e.clientY - rect.top;
        });
    }

    async loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const obj of this.objects) {
            await obj.update();
            await obj.draw(ctx);
        }

        requestAnimationFrame(() => this.loop());
    }

    start() {
        console.log("Game started");
        this.loop();
    }
}

let g = new Game();
g.start();
