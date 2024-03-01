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
let particle_count = 4000;


let R = 5;

if (document.documentElement.scrollWidth < document.documentElement.scrollHeight)
            R = 6;
        else{
            R = 3;
        }

function set_bg_params(rf, rc, pc){
    rotor_force = rf;
    rotor_count = rc;
    particle_count = pc;
    bg_canvas.width = document.documentElement.scrollWidth;
    bg_canvas.height = document.documentElement.scrollHeight;
    reload_bg();
}

class somePot{
    constructor(x_pos, y_pos) {
        this.pos = [x_pos, y_pos];
        this.color = [255 * Math.random(), 255 * Math.random(), 255 * Math.random()];
        this.F = 0.04;
        if (document.documentElement.scrollWidth < document.documentElement.scrollHeight)
            this.r = 300;
        else{
            this.r = 150;
        }
    }
    get_force(xi, yi){
        let a = [xi - this.pos[0], yi - this.pos[1]];
        let x = a[0];
        let y = a[1];
        let k = 1.0;
        let r = this.r;
        let q = (x*x + (k*y + r)*(k*y + r) - r*r) + (x*x + (k*y - r)*(k*y - r) - r*r);

        let gx = (((((x*2)+(((k*y)+(-r))*2))*((-Math.pow(r, 2))+Math.pow(x, 2)+Math.pow(((k*y)+r), 2)))+(((-Math.pow(r, 2))+Math.pow(x, 2)+Math.pow(((k*y)+(-r)), 2))*((x*2)+(((k*y)+r)*2))))*((-Math.pow(r, 2))+Math.pow(x, 2)+Math.pow(((k*y)+(-r)), 2))*((-Math.pow(r, 2))+Math.pow(x, 2)+Math.pow(((k*y)+r), 2))*2);
        let gy = (((((-Math.pow(r, 2))+Math.pow(x, 2)+Math.pow(((k*y)+r), 2))*((k*y)+(-r))*k*2)+(((-Math.pow(r, 2))+Math.pow(x, 2)+Math.pow(((k*y)+(-r)), 2))*((k*y)+r)*k*2))*((-Math.pow(r, 2))+Math.pow(x, 2)+Math.pow(((k*y)+(-r)), 2))*((-Math.pow(r, 2))+Math.pow(x, 2)+Math.pow(((k*y)+r), 2))*2)
        let lg = Math.pow(gx*gx + gy*gy, 0.5);
        let D = Math.max(Math.min(10, 0.000000001*Math.abs((x*x + (y*k - r)*(y*k - r) - r*r)*(x*x + (y*k + r)*(y*k + r) - r*r))), 0.1);
        if (lg > 0.0){
            return [-this.F*D*gx/lg, this.F*D*gy/lg];
        }
        else{
            return [0.0, 0.0];
        }
    }
    get_dens(xi, yi){
        let a = [xi - this.pos[0], yi - this.pos[1]];
        let x = a[0];
        let y = a[1];
        let k = 1.0;
        let r = this.r;
        let D = Math.pow(Math.min(Math.abs(x*x + (y*k - r)*(y*k - r) - r*r), Math.abs(x*x + (y*k + r)*(y*k + r) - r*r)), 0.6);
        //let D = Math.pow(Math.abs((x*x + (y*k - r)*(y*k - r) - r*r)* (x*x + (y*k + r)*(y*k + r) - r*r)), 0.5);
        return D/100.0;
    }
}
function sigmoid(x){
    return 1.0/(1.0 + Math.exp(-x*0.4));
}

function Dsigmoid(x){
    return 4*sigmoid(2.0*x)*sigmoid(-2.0*x);
}

function normalize(x, y){
    let l = Math.pow(x*x+y*y, 0.5);
    if (l > 0.0){
        return [x/l, y/l];
    }
    else{
        return [0, 0];
    }
}

function LEN(x, y){
    return Math.pow(x*x+y*y, 0.5);
}

class bg_particle{
    constructor (color, x_pos, y_pos){
        this.color = [Math.random()*255, Math.random()*255, Math.random()*255];
        this.pos = [x_pos, y_pos];
        this.last_pos = [0, 0];
        this.movement = [0, 0];
        this.time = 0;
        this.alpha = (1 - 2 * Math.abs(0.5 - this.time));
        this.life_time_k = 0.005*(0.1 + Math.random()*(1 - 0.1));
        this.bk = (0.1 + Math.random() * (1 - 0.1));
    }

    update_movement() {
        this.movement = [this.movement[0]*0.9, this.movement[1]*0.9];
        let disr = 0;

        let D = [X_pos - this.pos[0], Y_pos - this.pos[1]];
        let l = LEN(D[0], D[1]);
        D = normalize(D[0], D[1]);
        if (l > 0){
            this.movement[0] += -D[1]*20.0/l;
            this.movement[1] += D[0]*20.0/l;
        }

        //this.color = [this.bk*this.color[0]/disr, this.bk*this.color[1]/disr, this.bk*this.color[2]/disr];
        this.alpha = (1 - 2 * Math.abs(0.5 - this.time)) ;
    }

    get_dens(){
        let S = 0;
        for (i = 0; i < rotator_array.length; i++) {
            S += rotator_array[i].get_dens(this.pos[0], this.pos[1])/rotator_array.length;
        }
        return Dsigmoid(S);
    }

    update_position() {
        
        this.pos[0] += this.movement[0];
        this.pos[1] += this.movement[1];
        draw_circle(bg_ctx, "rgba(" + String(this.color[0]) + "," + String(this.color[1]) + "," + String(this.color[2])  + "," + String(this.alpha)+ ")", this.pos[0], this.pos[1], R*(this.get_dens() + 1/5))
        this.life_time_k = this.bk*0.05*(0.3 + (1 - this.get_dens())*(1 - 0.3));
        this.time += this.life_time_k;
        if (this.time >= 1){

                this.time = 0;
                this.pos = [Math.random() * bg_canvas.width, Math.random() * bg_canvas.height]
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
    //bg_ctx.fillStyle = 'rgba(230, 230, 230, 1)';
    //bg_ctx.fillRect(0, 0, bg_canvas.width, bg_canvas.height);
    bg_particle_array = [];
    rotator_array = [];
    for (i = 0; i < particle_count; i++) {
        bg_particle_array.push(new bg_particle('rgb(0, 255, 0)', Math.random() * bg_canvas.width, Math.random() * bg_canvas.height));
    }
    rotator_array.push(new somePot(0.5* bg_canvas.width, 0.5* bg_canvas.height));


    for (i = 0; i < 0; i++) {
        update_bg_frame();
    }

}
bg_canvas.width = document.documentElement.scrollWidth;
bg_canvas.height = document.documentElement.scrollHeight;
reload_bg();
function update_bg_frame() {
    bg_ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    bg_ctx.fillRect(0, 0, bg_canvas.width, bg_canvas.height);
    update_bg_logic();
}
setInterval(update_bg_frame, 0);