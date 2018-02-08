(function () {
  var frame = (function(){
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function (cb) {
        window.setTimeout(cb, 1000 / 60);
      };
  }());

  var defaults = {
    particleCount: 50,
    angle: 90,
    spread: 45,
    startVelocity: 45,
    decay: 0.9,
    ticks: 200,
    x: 0.5,
    y: 0.5,
    zIndex: 100,
    colors: [
      '#26ccff',
      '#a25afd',
      '#ff5e7e',
      '#88ff5a',
      '#fcff42',
      '#ffa62d',
      '#ff36ff'
    ]
  };

  var animationObj;

  function convert(val, transform) {
    return transform ? transform(val) : val;
  }

  function isOk(val) {
    return !(val === null || val === undefined);
  }

  function prop(options, name, transform) {
    return convert(
      options && isOk(options[name]) ? options[name] : defaults[name],
      transform
    );
  }

  function toDecimal(str) {
    return parseInt(str, 16);
  }

  function hexToRgb(str) {
    var val = String(str).replace(/[^0-9a-f]/gi, '');

    if (val.length < 6) {
        val = val[0]+val[0]+val[1]+val[1]+val[2]+val[2];
    }

    return {
      r: toDecimal(val.substring(0,2)),
      g: toDecimal(val.substring(2,4)),
      b: toDecimal(val.substring(4,6))
    };
  }

  function getOrigin(options) {
    var origin = prop(options, 'origin', Object);
    origin.x = prop(origin, 'x', Number);
    origin.y = prop(origin, 'y', Number);

    return origin;
  }

  function getCanvas(zIndex) {
    var canvas = document.createElement('canvas');
    var rect = document.body.getBoundingClientRect();

    canvas.width = document.documentElement.clientWidth || rect.width || window.innerWidth;
    canvas.height = document.documentElement.clientHeight || rect.height || window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0px';
    canvas.style.left = '0px';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = zIndex;

    return canvas;
  }

  function randomPhysics(opts) {
    var radAngle = opts.angle * (Math.PI / 180);
    var radSpread = opts.spread * (Math.PI / 180);

    return {
      x: opts.x,
      y: opts.y,
      wobble: Math.random() * 10,
      velocity: (opts.startVelocity * 0.5) + (Math.random() * opts.startVelocity),
      angle2D: -radAngle + ((0.5 * radSpread) - (Math.random() * radSpread)),
      tiltAngle: Math.random() * Math.PI,
      color: hexToRgb(opts.color),
      tick: 0,
      totalTicks: opts.ticks,
      decay: opts.decay,
      random: Math.random() + 5,
      tiltSin: 0,
      tiltCos: 0
    };
  }

  function updateFetti(context, fetti) {
    fetti.x += Math.cos(fetti.angle2D) * fetti.velocity;
    fetti.y += Math.sin(fetti.angle2D) * fetti.velocity + 3; // + gravity
    fetti.wobble += 0.1;
    fetti.velocity *= fetti.decay;
    fetti.tiltAngle += 0.1;
    fetti.tiltSin = Math.sin(fetti.tiltAngle);
    fetti.tiltCos = Math.cos(fetti.tiltAngle);
    fetti.random = Math.random() + 5;

    var progress = (fetti.tick++) / fetti.totalTicks;

    var wobbleX = fetti.x + (10 * Math.cos(fetti.wobble));
    var wobbleY = fetti.y + (10 * Math.sin(fetti.wobble));

    var x =       fetti.x + (fetti.random * fetti.tiltCos);
    var y =       fetti.y + (fetti.random * fetti.tiltSin);
    var x2 =      wobbleX + (fetti.random * fetti.tiltCos);
    var y2 =      wobbleY + (fetti.random * fetti.tiltSin);

    context.fillStyle = 'rgba(' + fetti.color.r + ', ' + fetti.color.g + ', ' + fetti.color.b + ', ' + (1 - progress) + ')';
    context.beginPath();

    context.moveTo(Math.floor(fetti.x), Math.floor(fetti.y));
    context.lineTo(Math.floor(wobbleX), Math.floor(y));
    context.lineTo(Math.floor(x2), Math.floor(y2));
    context.lineTo(Math.floor(x), Math.floor(wobbleY));

    context.closePath();
    context.fill();

    return fetti.tick < fetti.totalTicks;
  }

  function animate(canvas, fettis, done) {
    var animatingFettis = fettis.slice();
    var context = canvas.getContext('2d');
    var width = canvas.width;
    var height = canvas.height;

    function update() {
      context.clearRect(0, 0, width, height);

      animatingFettis = animatingFettis.filter(function (fetti) {
        return updateFetti(context, fetti);
      });

      if (animatingFettis.length) {
        frame(update);
      } else {
        done();
      }
    }

    frame(update);

    return {
      addFettis: function (fettis) {
        animatingFettis = animatingFettis.concat(fettis);
      },
      canvas: canvas
    };
  }

  function confetti(options) {
    var particleCount = prop(options, 'particleCount', Math.floor);
    var angle = prop(options, 'angle', Number);
    var spread = prop(options, 'spread', Number);
    var startVelocity = prop(options, 'startVelocity', Number);
    var decay = prop(options, 'decay', Number);
    var colors = prop(options, 'colors');
    var ticks = prop(options, 'ticks', Number);
    var zIndex = prop(options, 'zIndex', Number);
    var origin = getOrigin(options);

    var temp = particleCount;
    var fettis = [];
    var canvas = animationObj ? animationObj.canvas : getCanvas(zIndex);

    var startX = canvas.width * origin.x;
    var startY = canvas.height * origin.y;

    while (temp--) {
      fettis.push(
        randomPhysics({
          x: startX,
          y: startY,
          angle: angle,
          spread: spread,
          startVelocity: startVelocity,
          color: colors[temp % colors.length],
          ticks: ticks,
          decay: decay
        })
      );
    }

    // if we have a previous canvas already animating,
    // add to it
    if (animationObj) {
      animationObj.addFettis(fettis);

      return;
    }

    document.body.appendChild(canvas);

    animationObj = animate(canvas, fettis, function () {
      animationObj = null;
      document.body.removeChild(canvas);
    });
  }

  module.exports = confetti;
}());