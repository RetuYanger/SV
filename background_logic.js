function draw_circle(ctx, color, pos_x, pos_y, radius) {
    ctx.beginPath();
    ctx.arc(pos_x, pos_y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
}

function draw_rect(ctx, color, pos_x, pos_y, size_x, size_y) {
    ctx.beginPath();
    ctx.rect(pos_x, pos_y, size_x, size_y);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
}

function draw_line(ctx, color, start_x, start_y, end_x, end_y){
    ctx.beginPath();      
    ctx.moveTo(start_x, start_y);    
    ctx.lineTo(end_x, end_y); 
    ctx.strokeStyle = color;
    ctx.stroke();     
    ctx.closePath();
}

const bg_canvas = document.getElementById("Back_canvas");

var X_pos = 0.;
var Y_pos = 0.;
document.onmousemove = function(e) {
    X_pos = e.pageX;
    Y_pos = e.pageY;
}

const bg_ctx = bg_canvas.getContext("2d");
let bg_particle_array = [];
let rotator_array = [];
let global_time = 0;

let rotor_force = 1000;
let rotor_count = 10;
let particle_count = 1000;


function set_bg_params(rf, rc, pc){
    rotor_force = rf;
    rotor_count = rc;
    particle_count = pc;
    bg_canvas.width = document.documentElement.scrollWidth;
    bg_canvas.height = document.documentElement.scrollHeight;
    reload_bg();
}

class rotator{
    constructor(x_pos, y_pos) {
        this.pos = [x_pos, y_pos];
        this.q = rotor_force*2*(Math.random() - 0.5);
        this.color = [255 * Math.random(), 255 * Math.random(), 255 * Math.random()];
    }
    get_force(x, y){
        let a = [x - this.pos[0], y - this.pos[1]]
        let rad = Math.pow((a[0]*a[0] + a[1]*a[1]), 1);
        return [-this.q * a[1] / rad, this.q * a[0] / rad]; 
    }
}

function sigmoid(x){
    return 1.0/(1.0 + Math.exp(-x*0.04))
}

class psevdo_rotator{
    constructor(x_pos, y_pos, q, d) {
        this.pos = [x_pos, y_pos];
        this.q = rotor_force*2*q;
        this.color = [255 * Math.random(), 255 * Math.random(), 255 * Math.random()];
        this.d = d;
    }
    get_force(x, y){
        let a = [x - this.pos[0], y - this.pos[1]];
        let rad = Math.pow((a[0]*a[0] + a[1]*a[1]), 1);
        let q = this.q * (sigmoid(a[0]*this.d));
        return [-q * a[1] / rad, q * a[0] / rad]; 
    }
}

class rotator_like{
    constructor(x_pos, y_pos, q, d) {
        this.pos = [x_pos, y_pos];
        this.q = rotor_force*150000*q;
        this.color = [255 * Math.random(), 255 * Math.random(), 255 * Math.random()];
        this.d = d;
    }
    get_force(x, y){
        let a = [x - this.pos[0], y - this.pos[1]];
        let rad = Math.pow(a[0]*a[0] + a[1]*a[1], 2.0);
        let radSqrt = Math.pow(a[0]*a[0] + a[1]*a[1], 0.5);
        let b1 = [Math.cos(this.d), Math.sin(this.d)];
        let b2 = [-Math.sin(this.d), Math.cos(this.d)];
        let q = this.q;
        let A = q / rad;
        let dot1 = b1[0]*a[0] + b1[1]*a[1];
        let dot2 = b2[0]*a[0] + b2[1]*a[1];

        let Circ = [-A * a[1], A * a[0]];
        let line = [A*b2[0]*radSqrt, A*b2[1]*radSqrt];
        let t = sigmoid(dot1 - 300.0) * sigmoid(dot2 - 0.0)
        return [Circ[0]*(1- t) + t*line[0], Circ[1]*(1 - t) + t*line[1]]
    }
}

class rotator_like_backup{
    constructor(x_pos, y_pos, q, d) {
        this.pos = [x_pos, y_pos];
        this.q = rotor_force*2*q;
        this.color = [255 * Math.random(), 255 * Math.random(), 255 * Math.random()];
        this.d = d;
    }
    get_force(x, y){
        let a = [x - this.pos[0], y - this.pos[1]];
        let rad = (a[0]*a[0] + a[1]*a[1]);
        let radSqrt = Math.pow(a[0]*a[0] + a[1]*a[1], 0.5);
        let b1 = [Math.cos(this.d), Math.sin(this.d)];
        let b2 = [-Math.sin(this.d), Math.cos(this.d)];
        let q = this.q;
        let A = q / rad;
        let dot1 = b1[0]*a[0] + b1[1]*a[1];
        let dot2 = b2[0]*a[0] + b2[1]*a[1];
        if (Math.sign(dot1) > 0 && Math.sign(dot2) > 0){
            return [A*b2[0]*radSqrt, A*b2[1]*radSqrt];
        }
        else{
            return [-A * a[1], A * a[0]];
        }
    }
}

class determistic_rotator{
    constructor(x_pos, y_pos, q) {
        this.pos = [x_pos, y_pos];
        this.q = rotor_force*2*q;
        this.color = [255 * Math.random(), 255 * Math.random(), 255 * Math.random()];
    }
    get_force(x, y){
        let a = [x - this.pos[0], y - this.pos[1]];
        let rad = Math.pow((a[0]*a[0] + a[1]*a[1]), 1);
        let q = this.q;
        return [-q * a[1] / rad, q * a[0] / rad]; 
    }
}


class bg_particle{
    constructor (color, x_pos, y_pos){
        this.color = [0, 0, 0];
        this.pos = [x_pos, y_pos];
        this.last_pos = [0, 0];
        this.movement = [0, 0];
        this.time = 0;
        this.alpha = (1 - 2 * Math.abs(0.5 - this.time));
        this.life_time_k = 0.005*(0.1 + Math.random()*(1 - 0.1));
        this.bk = (0.1 + Math.random() * (1 - 0.1));
    }

    update_movement() {
        this.movement = [0, 0];
        let disr = 0;
        this.color = [0, 0, 0];
        for (i = 0; i < rotator_array.length; i++) {
            this.movement[0] += rotator_array[i].get_force(this.pos[0], this.pos[1])[0];
            this.movement[1] += rotator_array[i].get_force(this.pos[0], this.pos[1])[1];
            let a = [rotator_array[i].pos[0] - this.pos[0], rotator_array[i].pos[1] - this.pos[1]];
            let rad = 1/((a[0] * a[0] + a[1] * a[1] ));
            disr += rad;
            this.color[0] += rad * rotator_array[i].color[0];
            this.color[1] += rad * rotator_array[i].color[1];
            this.color[2] += rad * rotator_array[i].color[2];
        }
        this.color = [this.bk*this.color[0]/disr, this.bk*this.color[1]/disr, this.bk*this.color[2]/disr];
        this.alpha = (1 - 2 * Math.abs(0.5 - this.time)) ;
    }

    update_position() {
        this.last_pos = [this.pos[0], this.pos[1]];
        let l = Math.pow(this.movement[0]*this.movement[0] + this.movement[1]*this.movement[1], 0.5);
        if (l > 25){
            return ;
        }
        this.pos[0] += this.movement[0];
        this.pos[1] += this.movement[1];
        draw_line(bg_ctx, "rgba(" + String(this.color[0]) + "," + String(this.color[1]) + "," + String(this.color[2])  + "," + String(this.alpha)+ ")", this.pos[0], this.pos[1], this.last_pos[0], this.last_pos[1]);
        this.time += this.life_time_k;
        if (this.time >= 1){
            this.time = 0;
            this.pos = [Math.random() * bg_canvas.width, Math.random() * bg_canvas.height]
            this.last_pos = [this.pos[0], this.pos[1]];
            this.bk = (0.1 + Math.random() * (1 - 0.1));
        }
    }
}

function update_bg_logic(){
    for (let n = 0; n < bg_particle_array.length; n++) {
        bg_particle_array[n].update_movement();
        bg_particle_array[n].update_position();
    }
}

function reload_bg() {
    bg_ctx.fillStyle = 'rgba(230, 230, 230, 1)';
    bg_ctx.fillRect(0, 0, bg_canvas.width, bg_canvas.height);
    bg_particle_array = [];
    rotator_array = [];
    for (i = 0; i < particle_count; i++) {
        bg_particle_array.push(new bg_particle('rgb(0, 255, 0)', Math.random() * bg_canvas.width, Math.random() * bg_canvas.height));
    }
    rotator_array.push(new rotator_like(0.5 * bg_canvas.width, 0.34 * bg_canvas.height, 2.3, Math.PI/3));
    rotator_array.push(new rotator_like(0.5 * bg_canvas.width, 0.66 * bg_canvas.height, -2.3, Math.PI + Math.PI/3));


    for (i = 0; i < 0; i++) {
        update_bg_frame();
    }

}
bg_canvas.width = document.documentElement.scrollWidth;
bg_canvas.height = document.documentElement.scrollHeight;
reload_bg();
function update_bg_frame() {
    update_bg_logic();
}
setInterval(update_bg_frame, 0);