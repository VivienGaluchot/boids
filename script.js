const boids = function () {
    class Vect {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }
    }

    class Bird {
        constructor() {
            this.pos = new Vect();
            this.vel = new Vect(1, 0);
        }

        animate(deltaTimeInS) {
            this.pos.x += this.vel.x * deltaTimeInS;
            this.pos.y += this.vel.y * deltaTimeInS;
        }
    }

    class Sandbox {
        constructor(element) {
            this.canvas = element;
            this.lastAnimateInMs = null;
            this.avgAnimatePeriodInMs = null;

            this.dpr = window.devicePixelRatio || 1;

            var rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * this.dpr;
            this.canvas.height = rect.height * this.dpr;

            this.ctx = this.canvas.getContext("2d");

            this.bird = new Bird();
        };

        animate = function () {
            var deltaTimeInMs = 0;
            var currentTimeInMs = Date.now();
            if (this.lastAnimateInMs != null) {
                deltaTimeInMs = currentTimeInMs - this.lastAnimateInMs;
            }
            this.lastAnimateInMs = currentTimeInMs;

            if (deltaTimeInMs > 0) {
                if (this.avgAnimatePeriodInMs != null) {
                    this.avgAnimatePeriodInMs = this.avgAnimatePeriodInMs * 0.95 + deltaTimeInMs * 0.05;
                } else {
                    this.avgAnimatePeriodInMs = deltaTimeInMs;
                }
            }

            this.bird.animate(deltaTimeInMs / 1000);
        }

        draw = function () {
            this.ctx.save();


            // pre rescale draw
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = "#FFF5";
            this.ctx.font = "12px Verdana";
            if (this.avgAnimatePeriodInMs) {
                this.ctx.fillText(`${(1000 / this.avgAnimatePeriodInMs).toFixed(1)} fps`, 10, 22);
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

            this.drawBird(this.bird, 0.5);

            this.ctx.restore();
        }

        drawBird = function (bird, r) {
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

            var drawPeriodInMs = 1000 / 60;

            var redraw = () => {
                sandbox.animate();
                sandbox.draw();
                var fixedPeriodInMs = drawPeriodInMs;
                if (sandbox.avgAnimatePeriodInMs) {
                    fixedPeriodInMs -= sandbox.avgAnimatePeriodInMs - drawPeriodInMs;
                }
                setTimeout(redraw, fixedPeriodInMs);
            }
            redraw();
        }
    };
}();


// call the boids.simulate when document is ready
document.addEventListener("DOMContentLoaded", (e) => {
    boids.simulate(document.getElementById("sandbox"));
});