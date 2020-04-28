const mt = function () {
    class Vect {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }

        set(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }

        copy() {
            return new Vect(this.x, this.y);
        }

        norm() {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }

        normalizeInplace() {
            this.scaleInplace(1 / this.norm());
            return this;
        }

        setNorm(a) {
            this.normalizeInplace().scaleInplace(a);
        }

        addInplace(other) {
            this.x += other.x;
            this.y += other.y;
            return this;
        }

        minus(other) {
            return new Vect(this.x - other.x, this.y - other.y);
        }

        scaleInplace(a) {
            this.x *= a;
            this.y *= a;
            return this;
        }

        cap(a) {
            var norm = this.norm();
            if (norm > a) {
                this.setNorm(a);
            }
        }
    }

    return {
        Vect: Vect
    }
}();

const ph = function () {
    class Mobile {
        constructor() {
            this.pos = new mt.Vect();
            this.vel = new mt.Vect();
            this.acc = new mt.Vect();
            this.mass = 1;
        }

        applyForce(force) {
            this.acc.addInplace(force.copy().scaleInplace(1 / this.mass));
        }

        animate(deltaTimeInS) {
            this.vel.addInplace(this.acc);
            this.pos.addInplace(this.vel.copy().scaleInplace(deltaTimeInS));
            this.acc.set(0, 0);
        }
    }

    class Gravity {
        constructor(G = .5) {
            this.G = G;
        }

        getForces(mobA, mobB) {
            var ba = mobA.pos.minus(mobB.pos);
            var baNorm = ba.norm();
            if (baNorm > 0) {
                var magn = this.G * mobA.mass * mobB.mass / (baNorm * baNorm);
                ba.normalizeInplace().scaleInplace(magn);
                ba.cap(10);
                return { 'a': ba.copy().scaleInplace(-1), 'b': ba }
            } else {
                return { 'a': new mt.Vect(), 'b': new mt.Vect() }
            }
        }
    }

    return {
        Mobile: Mobile,
        Gravity: Gravity,
    }
}();

const boids = function () {
    class Bird extends ph.Mobile {
        constructor() {
            super();
        }
    }

    class Sandbox {
        constructor(element) {
            this.canvas = element;

            this.dpr = window.devicePixelRatio || 1;

            var rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * this.dpr;
            this.canvas.height = rect.height * this.dpr;

            this.ctx = this.canvas.getContext("2d");

            this.birdA = new Bird();
            this.birdA.pos = new mt.Vect(1, 0);
            this.birdA.vel = new mt.Vect(2, -6);
            this.birdB = new Bird();
            this.birdB.pos = new mt.Vect(-1, 0);
            this.birdB.vel = new mt.Vect(-2, 6);
        };

        animate(deltaTimeInS) {
            var gravity = new ph.Gravity();
            var grv = gravity.getForces(this.birdA, this.birdB);
            this.birdA.applyForce(grv.a);
            this.birdB.applyForce(grv.b);

            this.birdA.animate(deltaTimeInS);
            this.birdB.animate(deltaTimeInS);
        }

        draw(avgAnimatePeriodInMs = null, avgDrawPeriodInMs = null) {
            this.ctx.save();

            // pre rescale draw
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = "#FFF5";
            this.ctx.font = "12px Verdana";
            if (avgAnimatePeriodInMs) {
                this.ctx.fillText(`animate @ ${(1000 / avgAnimatePeriodInMs).toFixed(1)} Hz`, 10, 22);
            }
            if (avgDrawPeriodInMs) {
                this.ctx.fillText(`draw @ ${(1000 / avgDrawPeriodInMs).toFixed(1)} Hz`, 10, 34);
            }

            // rescale
            var pixelPerUnit = 20;
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.scale(this.dpr, this.dpr);
            this.ctx.scale(pixelPerUnit, -1 * pixelPerUnit);

            // default style
            this.ctx.fillStyle = "#FFF";
            this.ctx.strokeStyle = "#DDD";
            this.ctx.lineWidth = 2 / pixelPerUnit;

            // post rescale draw
            this.ctx.save();
            this.ctx.strokeStyle = "#F008";
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(1, 0);
            this.ctx.stroke();

            this.ctx.strokeStyle = "#0F08";
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(0, 1);
            this.ctx.stroke();
            this.ctx.restore();

            this.drawBird(this.birdA, 0.5);
            this.drawBird(this.birdB, 0.5);

            this.ctx.restore();
        }

        drawBird(bird, r) {
            this.ctx.save();
            this.ctx.fillStyle = "#FFF3";
            this.ctx.strokeStyle = "#FFF";
            this.ctx.beginPath();
            this.ctx.arc(bird.pos.x, bird.pos.y, r, 0, 2 * Math.PI);
            this.ctx.stroke();
            this.ctx.fill();
            this.ctx.restore();
        };
    }

    return {
        simulate: (element) => {
            console.log(`start simulation on ${element}`);
            sandbox = new Sandbox(element);

            var lastAnimateInMs = null;
            var lastDrawInMs = null;
            var avgAnimatePeriodInMs = null;
            var avgDrawPeriodInMs = null;

            var animatePeriodInMs = 1000 / 200;

            var animate = () => {
                var currentTimeInMs = Date.now();
                sandbox.animate(animatePeriodInMs / 1000);

                var deltaTimeInMs = 0;
                if (lastAnimateInMs != null) {
                    deltaTimeInMs = currentTimeInMs - lastAnimateInMs;
                }
                lastAnimateInMs = currentTimeInMs;
                if (deltaTimeInMs > 0) {
                    if (avgAnimatePeriodInMs != null) {
                        avgAnimatePeriodInMs = avgAnimatePeriodInMs * 0.95 + deltaTimeInMs * 0.05;
                    } else {
                        avgAnimatePeriodInMs = deltaTimeInMs;
                    }
                }

                var fixed = animatePeriodInMs;
                if (avgAnimatePeriodInMs) {
                    fixed -= avgAnimatePeriodInMs - animatePeriodInMs;
                    fixed = Math.max(fixed, 0);
                }
                setTimeout(animate, fixed);
            }
            animate();

            var drawPeriodInMs = 1000 / 60;
            var redraw = () => {
                var currentTimeInMs = Date.now();
                sandbox.draw(avgAnimatePeriodInMs, avgDrawPeriodInMs);

                var deltaTimeInMs = 0;
                if (lastDrawInMs != null) {
                    deltaTimeInMs = currentTimeInMs - lastDrawInMs;
                }
                lastDrawInMs = currentTimeInMs;
                if (deltaTimeInMs > 0) {
                    if (avgDrawPeriodInMs != null) {
                        avgDrawPeriodInMs = avgDrawPeriodInMs * 0.95 + deltaTimeInMs * 0.05;
                    } else {
                        avgDrawPeriodInMs = deltaTimeInMs;
                    }
                }

                var fixed = drawPeriodInMs;
                if (avgDrawPeriodInMs) {
                    fixed -= avgDrawPeriodInMs - animatePeriodInMs;
                    fixed = Math.max(fixed, 0);
                }
                setTimeout(redraw, drawPeriodInMs);
            }
            redraw();
        }
    };
}();


// call the boids.simulate when document is ready
document.addEventListener("DOMContentLoaded", (e) => {
    boids.simulate(document.getElementById("sandbox"));
});