const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

const bird = { x: 80, y: 300, vy: 0, size: 40, rotation: 0 };

const GRAVITY = 1500;
const FLAP = -500;

const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const PIPE_SPEED = 200;
const PIPE_SPAWN_INTERVAL = 1.6;

const imgBird = new Image();
imgBird.src = 'bird.png';

const imgPipe = new Image();
imgPipe.src = 'pipe.png';

const imgBackground = new Image();
imgBackground.src = 'background.png';

let pipes = [];
let spawnTimer = 0;
let lastTime = 0;
let score = 0;
let best = Number(localStorage.getItem('flappyBest')) || 0;
let state = 'ready';
let shakeTime = 0;
let flashTime = 0;

function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (state !== 'playing') return;

  bird.vy += GRAVITY * dt;
  bird.y += bird.vy * dt;

  if (bird.vy < 0) {
    bird.rotation = -0.4;
  } else {
    bird.rotation += 3 * dt;
    if (bird.rotation > 1.3) bird.rotation = 1.3;
  }

  if (bird.y > H - 60 - bird.size) {
    gameOver();
    return;
  }

  if (bird.y < 0) {
    bird.y = 0;
    bird.vy = 0;
  }

  spawnTimer += dt;
  if (spawnTimer >= PIPE_SPAWN_INTERVAL) {
    spawnTimer = 0;
    spawnPipe();
  }

  for (const pipe of pipes) {
    pipe.x -= PIPE_SPEED * dt;

    const hitX = bird.x + bird.size > pipe.x && bird.x < pipe.x + PIPE_WIDTH;
    const hitY = bird.y < pipe.gapY || bird.y + bird.size > pipe.gapY + PIPE_GAP;

    if (hitX && hitY) {
      gameOver();
      return;
    }

    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score++;
    }
  }

  pipes = pipes.filter(p => p.x + PIPE_WIDTH > 0);
}

function spawnPipe() {
  const minTop = 80;
  const maxTop = H - PIPE_GAP - 80 - 60;
  const gapY = Math.random() * (maxTop - minTop) + minTop;
  pipes.push({ x: W, gapY: gapY, passed: false });
}

function draw() {
  let shakeX = 0;
  let shakeY = 0;
  if (shakeTime > 0) {
    shakeX = (Math.random() - 0.5) * 12;
    shakeY = (Math.random() - 0.5) * 12;
    shakeTime -= 1 / 60;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground();
  drawPipes();
  drawGround();
  drawBird();
  drawUI();

  ctx.restore();

  if (flashTime > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flashTime})`;
    ctx.fillRect(0, 0, W, H);
    flashTime -= 0.05;
  }
}

function drawBackground() {
  if (imgBackground.complete && imgBackground.naturalWidth > 0) {
    ctx.drawImage(imgBackground, 0, 0, W, H);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#4ec0ca');
    grad.addColorStop(1, '#87ceeb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawPipes() {
  for (const pipe of pipes) {
    const topH = pipe.gapY;
    const botY = pipe.gapY + PIPE_GAP;
    const botH = H - 60 - botY;

    drawPipeSegment(pipe.x, 0, PIPE_WIDTH, topH, true);
    drawPipeSegment(pipe.x, botY, PIPE_WIDTH, botH, false);
  }
}

function drawPipeSegment(x, y, w, h, isTop) {
  if (imgPipe.complete && imgPipe.naturalWidth > 0) {
    if (isTop) {
      ctx.save();
      ctx.translate(x, y + h);
      ctx.scale(1, -1);
      ctx.drawImage(imgPipe, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(imgPipe, x, y, w, h);
    }
  } else {
    ctx.fillStyle = '#3a3';
    ctx.fillRect(x, y, w, h);
  }
}

function drawGround() {
  const groundY = H - 60;
  ctx.fillStyle = '#ded895';
  ctx.fillRect(0, groundY, W, 60);
  ctx.fillStyle = '#7fc243';
  ctx.fillRect(0, groundY, W, 12);
}

function drawBird() {
  ctx.save();

  const cx = bird.x + bird.size / 2;
  const cy = bird.y + bird.size / 2;

  ctx.translate(cx, cy);
  ctx.rotate(bird.rotation);

  if (imgBird.complete && imgBird.naturalWidth > 0) {
    ctx.drawImage(imgBird, -bird.size / 2, -bird.size / 2, bird.size, bird.size);
  } else {
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(-bird.size / 2, -bird.size / 2, bird.size, bird.size);
  }

  ctx.restore();
}

function drawUI() {
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(score, 202, 72);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(score, 200, 70);

  if (state === 'ready') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Tap or Space to start', 200, 300);
  }

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('Game Over', 200, 220);

    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('Score: ' + score, 200, 280);

    const isNewBest = score > 0 && score >= best;
    ctx.fillStyle = isNewBest ? '#ffd93d' : '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(isNewBest ? '★ New Best! ★' : 'Best: ' + best, 200, 330);

    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText('Tap to play again', 200, 400);
  }
}

function flap() {
  if (state === 'ready') state = 'playing';
  if (state === 'playing') {
    bird.vy = FLAP;
  } else if (state === 'gameover') {
    resetGame();
  }
}

function gameOver() {
  state = 'gameover';
  shakeTime = 0.3;
  flashTime = 0.6;
  if (score > best) {
    best = score;
    localStorage.setItem('flappyBest', best);
  }
}

function resetGame() {
  bird.y = 300;
  bird.vy = 0;
  bird.rotation = 0;
  pipes = [];
  spawnTimer = 0;
  score = 0;
  state = 'playing';
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    flap();
  }
});

canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  flap();
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  flap();
}, { passive: false });

requestAnimationFrame(loop);