const mt = function () {
    class Vect {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }

        is(x = 0, y = 0) {
            return this.x == x && this.y == y;
        }

        set(x = 0, y = 0) {
            this.x = x;
            this.y = y;
            return this;
        }

        copy() {
            return new Vect(this.x, this.y);
        }

        norm() {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }

        normalizeInplace() {
            var norm = this.norm();
            if (norm == 0) {
                throw Error("norm null");
            }
            this.scaleInplace(1 / this.norm());
            return this;
        }

        setNorm(a) {
            this.normalizeInplace().scaleInplace(a);
            return this;
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
            this.spd = new mt.Vect();
            this.acc = new mt.Vect();
            this.mass = 1;
        }

        applyForce(force) {
            this.acc.addInplace(force.copy().scaleInplace(1 / this.mass));
        }

        animate(deltaTimeInS) {
            this.spd.addInplace(this.acc);
            this.pos.addInplace(this.spd.copy().scaleInplace(deltaTimeInS));
            this.acc.set(0, 0);
        }

        radius() {
            return 0.2 * Math.cbrt(this.mass);
        }
    }

    return {
        Mobile: Mobile
    }
}();

const boids = function () {
    function* pairs(iterable) {
        for (var i = 0; i < iterable.length; i++) {
            for (var j = i + 1; j < iterable.length; j++) {
                yield { first: iterable[i], second: iterable[j] };
            }
        }
    }

    class Bird extends ph.Mobile {
        constructor(birds) {
            super();
            this.birds = birds;
            this.targetSpeed = 5;
            this.maxForce = 0.2 * this.mass;
            this.autoControl = null;
        }

        animate(deltaTimeInS) {
            // autocontrol

            // match direction
            var matchRadius = 3;
            var distRadius = 1;
            var mediumSpeed = new mt.Vect();
            for (var bird of this.birds) {
                if (bird != this) {
                    var diff = this.pos.minus(bird.pos);
                    var dist = diff.norm();
                    if (dist < matchRadius) {
                        mediumSpeed.addInplace(bird.spd);
                    }
                    if (dist < distRadius) {
                        this.applyForce(diff.setNorm(0.1))
                    }
                }
            }

            // maintain speed
            var currentSpeed = this.spd.norm();
            this.autoControl = new mt.Vect();
            if (currentSpeed < this.targetSpeed) {
                var force = this.maxForce * (this.targetSpeed - currentSpeed) / this.targetSpeed;
                if (!mediumSpeed.is(0, 0)) {
                    this.autoControl = mediumSpeed.copy().setNorm(force)
                } else {
                    this.autoControl = this.spd.copy().setNorm(force)
                }
            }


            this.applyForce(this.autoControl);

            super.animate(deltaTimeInS);
        }
    }

    class Sandbox {
        constructor(element) {
            this.canvas = element;
            this.pixelPerUnit = 20;

            this.dpr = window.devicePixelRatio || 1;

            var rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * this.dpr;
            this.canvas.height = rect.height * this.dpr;

            this.ctx = this.canvas.getContext("2d");

            this.birds = [];
            for (var i = -5; i < 5; i++) {
                for (var j = -5; j < 5; j++) {
                    var bird = new Bird(this.birds);
                    bird.pos = new mt.Vect(i, j);
                    bird.spd = new mt.Vect(Math.random() - .5, Math.random() - .5).scaleInplace(5);
                    bird.mass = 1 * Math.random() + 1;
                    this.birds.push(bird);
                }
            }

        };

        bounds() {
            var w = this.canvas.width / (this.pixelPerUnit * this.dpr);
            var h = this.canvas.height / (this.pixelPerUnit * this.dpr);
            return {
                x: -w / 2, y: -h / 2, w: w, h: h
            };
        }

        animate(deltaTimeInS) {
            for (var bird of this.birds) {
                var friction = bird.spd.copy().scaleInplace(bird.spd.norm() * -0.001);
                bird.applyForce(friction);
                bird.animate(deltaTimeInS);
            }

            var bounds = this.bounds();
            for (var bird of this.birds) {
                if (bird.pos.x - bird.radius() < bounds.x) {
                    bird.pos.x = bounds.x + bird.radius();
                    bird.spd.x *= -0.5;
                }
                if (bird.pos.x + bird.radius() > bounds.x + bounds.w) {
                    bird.pos.x = bounds.x + bounds.w - bird.radius();
                    bird.spd.x *= -0.5;
                }
                if (bird.pos.y - bird.radius() < bounds.y) {
                    bird.pos.y = bounds.y + bird.radius();
                    bird.spd.y *= -0.5;
                }
                if (bird.pos.y + bird.radius() > bounds.y + bounds.h) {
                    bird.pos.y = bounds.y + bounds.h - bird.radius();
                    bird.spd.y *= -0.5;
                }
            }
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
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.scale(this.dpr, this.dpr);
            this.ctx.scale(this.pixelPerUnit, -1 * this.pixelPerUnit);

            // default style
            this.ctx.fillStyle = "#FFF";
            this.ctx.strokeStyle = "#DDD";
            this.ctx.lineWidth = 1 / this.pixelPerUnit;

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

            var bounds = this.bounds();
            this.ctx.strokeStyle = "#FFF4";
            this.ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
            this.ctx.restore();

            for (var bird of this.birds) {
                this.drawBird(bird);
            }

            this.ctx.restore();
        }

        drawBird(bird) {
            this.ctx.save();

            // this.ctx.strokeStyle = "#AFF8";
            // var spdEnd = bird.spd.copy().scaleInplace(0.5).addInplace(bird.pos);
            // this.ctx.beginPath();
            // this.ctx.moveTo(bird.pos.x, bird.pos.y);
            // this.ctx.lineTo(spdEnd.x, spdEnd.y);
            // this.ctx.stroke();
            // this.ctx.strokeStyle = "#F00F";
            // var autoControlEnd = bird.autoControl.copy().scaleInplace(50).addInplace(bird.pos);
            // this.ctx.beginPath();
            // this.ctx.moveTo(bird.pos.x, bird.pos.y);
            // this.ctx.lineTo(autoControlEnd.x, autoControlEnd.y);
            // this.ctx.stroke();

            this.ctx.fillStyle = "#FFF3";
            this.ctx.strokeStyle = "#FFF";
            this.ctx.beginPath();
            this.ctx.arc(bird.pos.x, bird.pos.y, bird.radius(), 0, 2 * Math.PI);
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
                var deltaTimeInMs = 0;
                if (lastAnimateInMs != null) {
                    deltaTimeInMs = currentTimeInMs - lastAnimateInMs;
                }

                sandbox.animate(Math.min(deltaTimeInMs, 10 * animatePeriodInMs) / 1000);

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