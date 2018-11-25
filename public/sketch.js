let you;
let socket;
const allPlayers = [];
const bullets = [];
const platforms = [
    {x: 0, y: 600, width: 150, height: 20},
];

const width = 800;
const height = 600;

const unitSize = 30;
const speed = 3;

const fontSize = 60;

function Bullet(owner, unitPos, color, vel) {
    this.pos = createVector(unitPos.x + (unitSize / 2), unitPos.y + (unitSize / 2));
    this.color = color;
    this.owner = owner;
    this.vel;
    if (vel) {
        this.vel = p5.Vector.fromAngle(createVector(vel.x - this.pos.x, vel.y - this.pos.y).heading());
    } else {
        this.vel = p5.Vector.fromAngle(createVector(mouseX - this.pos.x, mouseY - this.pos.y).heading());
    }
    this.vel.mult(6);

    this.update = () => {
        this.pos.add(this.vel);
    };
    this.render = () => {
        push();
        stroke(...this.color);
        strokeWeight(5);
        point(this.pos.x, this.pos.y);
        pop();
    };
};
function Player(color) {
    this.pos = createVector(Math.floor(random(width - unitSize)), Math.floor(random(height - unitSize)));
    this.id;
    this.score = 0;
    this.health = 10;
    this.inAir = false;
    this.gravity = 0;
    this.color = color;
    this.show = () => {
        fill(...this.color);
        rect(this.pos.x, this.pos.y, unitSize, unitSize, 3);
    };
    this.changePos = (x, y) => {
        this.pos.x = x;
        this.pos.y = y;
    }
    this.act = () => {
        this.inAir = !touchesGround(this.pos);
        if (touchesGround(this.pos)) {
            this.gravity = 0;
            this.pos.y = height - (unitSize + 1);
        }
        if(keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
            if (this.pos.x >= 1) {
                this.pos = createVector(this.pos.x - speed, this.pos.y);
            }
        } else if(keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
            if (this.pos.x + (unitSize + 1) <= width) {
                this.pos = createVector(this.pos.x + speed, this.pos.y);
            }
        }
        this.pos.y += this.gravity;
        this.gravity += 0.3;
        if(!this.inAir && (keyIsDown(UP_ARROW) || keyIsDown(87) || keyIsDown(32))) {
            if (this.pos.y >= 0) {
                this.gravity = -10;
                this.pos.y +=this.gravity;
            }
        }
        sendPosition({x: this.pos.x, y: this.pos.y, id: this.id});
    };
    this.addBullet = (posX, posY) => {
        bullets.push(new Bullet(this.id, this.pos, this.color, {x: posX, y: posY}));
    };
    this.shoot = () => {
        bullets.push(new Bullet(this.id, this.pos, this.color));
        sendBullet({x: mouseX, y: mouseY, id: this.id});
    };
    this.looseHealth = () => {
        this.health -= 1;
        if (this.health < 1) {
            allPlayers.splice(allPlayers.findIndex(item => item.id === this.id), 1);
            sendDeath({id: this.id});
        }
        this.color = this.color.map(color => color -= 12);
    }
    this.setHealth = (hp) => this.health = hp;
    this.setId = (id) => this.id = id;
};

const touchesGround = (unitPos) => {
    if (unitPos.y + (unitSize + 1) >= height) {
        return true;
    }
    return false;
};

const findPlayerById = (id) => {
    return allPlayers.findIndex(player => player.id === id);
};

function setup() {
    createCanvas(width, height);
    textFont('Impact');
    textSize(fontSize);
    textAlign(CENTER, CENTER);
    you = new Player([0, 141, 203]);
    allPlayers.push(you);
    you.show();
    socket = io.connect('http://localhost:3000');
    socket.on('id', (id) => you.setId(id));
    socket.on('newPlayer', (id) => {
        console.log('newPlayah');
        const newbie = new Player([225, 49, 91]);
        newbie.setId(id);
        allPlayers.push(newbie);
        console.log(allPlayers);
    });
    socket.on('users', (users) => {
        users.forEach(user => {
            const oldie = new Player([225, 49, 91]);
            oldie.setId(user.id);
            oldie.changePos(user.x, user.y);
            allPlayers.push(oldie);
            console.log(allPlayers);
        });
    });
    socket.on('position', (data) => {
        allPlayers[findPlayerById(data.id)].changePos(data.x, data.y);
    });
    socket.on('bullet', (data) => {
        allPlayers[findPlayerById(data.id)].addBullet(data.x, data.y);
    });
    socket.on('death', (id) => {
        const index = findPlayerById(id);
        if (index !== -1) {
            allPlayers.splice(index, 1);
        }
    });
};
let removableBullets = [];

const collision = (bulletX, bulletY, playerX, playerY) => {
    if (bulletX >= playerX && bulletX <= playerX + unitSize && bulletY >= playerY && bulletY <= playerY + unitSize) {
        return true;
    }
};

function draw() {
    background(255,255,255);
    platforms.forEach((platform) => {
        fill(0);
        rect(platform.x, platform.y, platform.width, platform.height);
    });
    removableBullets = [];
    bullets.forEach((item, index) => {
        item.update();
        if (item.pos.x > width || item.pos.x < 0 || item.pos.y > height || item.pos.y < 0) {
            removableBullets.push(index);
        }
        allPlayers.forEach((player) => {
            if (player.id !== item.owner) {
                if (collision(item.pos.x, item.pos.y, player.pos.x, player.pos.y)) {
                    removableBullets.push(index);
                    player.looseHealth();
                    if (item.owner === you.id && player.health < 1) {
                        you.score += 1;
                    }
                }
            }
        });
        item.render();
    });
    removableBullets.forEach(bullet => bullets.splice(bullet, 1));
    if (you.health > 0) {
        you.act();
    }
    allPlayers.forEach((player) => {
        if (player.health > 0) {
            player.show();
        }
    });
    textAlign(RIGHT);
    fill(244, 125, 74);
    text(you.score, width - 40, 40);
    textAlign(LEFT);
    fill(244, 125, 74);
    text(you.health, 40, 40);
};

function mouseClicked() {
    if (you.health > 0) {
        you.shoot();
    }
};

function sendDeath(id) {
    socket.emit('death', id);
};

function sendBullet(data) {
    socket.emit('bullet', data)
};

function sendPosition(data) {
    socket.emit('position',data);
};
