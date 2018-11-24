let you;
let socket;
const allPlayers = [];
const bullets = [];

const width = 300;
const height = 300;

const unitSize = 30;
const speed = 3;

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
    this.vel.mult(5);

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
    this.pos = createVector(width / 2, height / 2);
    this.id;
    this.health = 10;
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
        if(keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
            if (this.pos.x >= 0) {
                this.pos = createVector(this.pos.x - speed, this.pos.y);
                sendPosition({x: this.pos.x, y: this.pos.y, id: this.id});
            }
        } else if(keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
            if (this.pos.x + unitSize <= width) {
                this.pos = createVector(this.pos.x + speed, this.pos.y);
                sendPosition({x: this.pos.x, y: this.pos.y, id: this.id});
            }
        }
        if(keyIsDown(UP_ARROW) || keyIsDown(87)) {
            if (this.pos.y >= 0) {
                this.pos = createVector(this.pos.x, this.pos.y - speed);
                sendPosition({x: this.pos.x, y: this.pos.y, id: this.id});
            }
        } else if(keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
            if (this.pos.y + unitSize <= height) {
                this.pos = createVector(this.pos.x, this.pos.y + speed);
                sendPosition({x: this.pos.x, y: this.pos.y, id: this.id});
            }
        }
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
        this.color = this.color.map(color => color += 12);
    }
    this.setHealth = (hp) => this.health = hp;
    this.setId = (id) => this.id = id;
};

const findPlayerById = (id) => {
    return allPlayers.findIndex(player => player.id === id);
};

function setup() {
    createCanvas(width, height);
    background(32, 178, 170);
    you = new Player([43, 255, 163]);
    allPlayers.push(you);
    you.show();
    socket = io.connect('http://localhost:3000');
    socket.on('id', (id) => you.setId(id));
    socket.on('newPlayer', (id) => {
        console.log('newPlayah');
        const newbie = new Player([255, 42, 145]);
        newbie.setId(id);
        allPlayers.push(newbie);
    });
    socket.on('users', (users) => {
        Object.keys(users).forEach(user => {
            const oldie = new Player([255, 42, 145]);
            oldie.setId(user);
            oldie.changePos(users[user].x, users[user].y);
            allPlayers.push(oldie);
        });
    });
    socket.on('position', (data) => {
        allPlayers[findPlayerById(data.id)].changePos(data.x, data.y);
    });
    socket.on('bullet', (data) => {
        allPlayers[findPlayerById(data.id)].addBullet(data.x, data.y);
    });
};
let removableBullets = [];

const collision = (bulletX, bulletY, playerX, playerY) => {
    if (bulletX >= playerX && bulletX <= playerX + unitSize && bulletY >= playerY && bulletY <= playerY + unitSize) {
        return true;
    }
};

function draw() {
    background(16, 27, 102);

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