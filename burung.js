<!-- Mulai Plugin Flappy Bird 2 -->
<script>
(function() {
    // --- 1. SETUP CSS UNTUK ANIMASI UI ---
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes flappyPulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(243, 156, 18, 0.7); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(243, 156, 18, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(243, 156, 18, 0); }
        }
        .flappy-btn-hover:hover { transform: scale(1.1) !important; transition: transform 0.2s; }
    `;
    document.head.appendChild(style);

    // --- 2. SETUP AUDIO (WEB AUDIO API untuk SFX 8-Bit) ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx = new AudioContext();

    function playSound(type) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (type === 'flap') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'score') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.setValueAtTime(1200, now + 0.05);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now); osc.stop(now + 0.15);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        }
    }

    // --- 3. MEMBUAT UI ELEMENT ---
    const btn = document.createElement('div');
    btn.innerHTML = '🎮';
    btn.className = 'flappy-btn-hover';
    Object.assign(btn.style, {
        position: 'fixed', bottom: '25px', right: '25px', width: '65px', height: '65px',
        borderRadius: '50%', backgroundColor: '#f39c12', color: 'white',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        fontSize: '32px', cursor: 'pointer', zIndex: '2147483646',
        animation: 'flappyPulse 2s infinite'
    });
    document.body.appendChild(btn);

    const modal = document.createElement('div');
    Object.assign(modal.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: '2147483647',
        display: 'none', justifyContent: 'center', alignItems: 'center',
        flexDirection: 'column', backdropFilter: 'blur(8px)'
    });
    document.body.appendChild(modal);

    const canvas = document.createElement('canvas');
    canvas.width = 340;
    canvas.height = 500;
    Object.assign(canvas.style, {
        backgroundColor: '#70c5ce', border: '5px solid #fff',
        borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    });
    modal.appendChild(canvas);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Kembali ke Web';
    Object.assign(closeBtn.style, {
        marginTop: '20px', padding: '12px 24px', cursor: 'pointer',
        backgroundColor: '#ef4444', color: 'white', border: 'none',
        borderRadius: '25px', fontSize: '16px', fontWeight: 'bold',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'background 0.2s'
    });
    closeBtn.onmouseover = () => closeBtn.style.backgroundColor = '#dc2626';
    closeBtn.onmouseout = () => closeBtn.style.backgroundColor = '#ef4444';
    modal.appendChild(closeBtn);

    // --- 4. LOGIKA & GRAFIK GAME ---
    const ctx = canvas.getContext('2d');
    let frames = 0, reqId;
    const state = { getReady: 0, game: 1, over: 2 };
    let currentState = state.getReady;

    let bird = { x: 60, y: 150, w: 34, h: 24, gravity: 0.25, jump: 5.5, speed: 0, rotation: 0 };
    let pipes = { position: [], w: 50, h: 400, dx: 2.5, gap: 130 };
    let score = { value: 0, best: 0 };
    let clouds = [{x: 100, y: 100}, {x: 300, y: 150}, {x: 450, y: 80}];

    // Sprite Burung Procedural yang Lebih Keren
    function drawBird() {
        ctx.save();
        ctx.translate(bird.x, bird.y);
        
        // Rotasi berdasarkan kecepatan (menukik/mendongak)
        if(currentState === state.game || currentState === state.over) {
            bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (bird.speed * 0.1)));
        } else {
            bird.rotation = 0;
            // Animasi melayang saat getReady
            bird.y = 150 + Math.sin(frames * 0.1) * 5; 
        }
        ctx.rotate(bird.rotation);

        // Tubuh
        ctx.fillStyle = '#f1c40f'; // Kuning cerah
        ctx.beginPath();
        ctx.ellipse(0, 0, 17, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.stroke();

        // Sayap (Mengepak)
        let wingY = (currentState === state.game && frames % 10 < 5) ? -5 : 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-5, wingY, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Paruh
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(22, 4);
        ctx.lineTo(10, 8);
        ctx.fill();
        ctx.stroke();

        // Mata
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(8, -4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(10, -4, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Sprite Pipa Klasik
    function drawPipes() {
        for (let i = 0; i < pipes.position.length; i++) {
            let p = pipes.position[i];
            let topY = p.y;
            let bottomY = p.y + pipes.h + pipes.gap;
            
            ctx.fillStyle = '#73bf2e';
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#543847';

            // Fungsi gambar 1 pipa dengan topi
            const drawSinglePipe = (x, y, h, isTop) => {
                // Batang pipa
                ctx.fillRect(x, y, pipes.w, h);
                ctx.strokeRect(x, y, pipes.w, h);
                // Detail highlight (efek 3D)
                ctx.fillStyle = '#9de659';
                ctx.fillRect(x + 5, y, 5, h);
                ctx.fillStyle = '#73bf2e'; // reset
                
                // Topi pipa
                let capY = isTop ? y + h - 20 : y;
                ctx.fillRect(x - 3, capY, pipes.w + 6, 20);
                ctx.strokeRect(x - 3, capY, pipes.w + 6, 20);
            };

            drawSinglePipe(p.x, topY, pipes.h, true); // Pipa Atas
            drawSinglePipe(p.x, bottomY, canvas.height - bottomY, false); // Pipa Bawah
        }
    }

    // Awan Latar
    function drawBackground() {
        // Langit gradien
        let grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grd.addColorStop(0, "#4ec0ca");
        grd.addColorStop(1, "#ccebf2");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Awan
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        clouds.forEach((c, index) => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, 20, 0, Math.PI * 2);
            ctx.arc(c.x + 15, c.y - 10, 25, 0, Math.PI * 2);
            ctx.arc(c.x + 30, c.y, 20, 0, Math.PI * 2);
            ctx.fill();
            
            // Gerakkan awan
            if(currentState === state.game) c.x -= 0.5;
            if(c.x + 50 < 0) c.x = canvas.width + Math.random() * 50;
        });
    }

    function update() {
        if (currentState !== state.game) {
            if(currentState === state.over) {
                bird.speed += bird.gravity;
                bird.y += bird.speed;
                if(bird.y >= canvas.height - 20) bird.y = canvas.height - 20; // Jatuh ke lantai
            }
            return;
        }

        bird.speed += bird.gravity;
        bird.y += bird.speed;

        // Nabrak lantai / atap
        if (bird.y + 12 >= canvas.height || bird.y - 12 <= 0) {
            playSound('hit');
            currentState = state.over;
        }

        // Generate Pipa baru
        if (frames % 100 === 0) {
            pipes.position.push({
                x: canvas.width,
                y: Math.random() * -200 - 150
            });
        }

        for (let i = 0; i < pipes.position.length; i++) {
            let p = pipes.position[i];
            let bottomY = p.y + pipes.h + pipes.gap;

            // Deteksi Tabrakan (Hitbox yang lebih presisi)
            let birdRadius = 12;
            let hitX = bird.x + birdRadius > p.x && bird.x - birdRadius < p.x + pipes.w;
            let hitTop = bird.y - birdRadius < p.y + pipes.h;
            let hitBottom = bird.y + birdRadius > bottomY;

            if (hitX && (hitTop || hitBottom)) {
                playSound('hit');
                currentState = state.over;
            }

            p.x -= pipes.dx;

            // Cetak Skor
            if (p.x + pipes.w === bird.x - 10) { // Disesuaikan agar pas di tengah
                score.value += 1;
                score.best = Math.max(score.value, score.best);
                playSound('score');
            }

            // Hapus pipa lewat
            if (p.x + pipes.w <= 0) {
                pipes.position.shift();
                i--;
            }
        }
    }

    function draw() {
        drawBackground();
        drawPipes();
        drawBird();

        // UI Teks
        ctx.fillStyle = "#FFF";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 4;
        ctx.textAlign = "center";
        
        if (currentState === state.getReady) {
            ctx.font = "900 35px 'Impact', sans-serif";
            ctx.strokeText("GET READY", canvas.width/2, 180);
            ctx.fillText("GET READY", canvas.width/2, 180);
            
            ctx.font = "bold 20px Arial";
            ctx.lineWidth = 3;
            ctx.strokeText("Klik / Spasi untuk Terbang", canvas.width/2, 230);
            ctx.fillText("Klik / Spasi untuk Terbang", canvas.width/2, 230);
        } else if (currentState === state.over) {
            ctx.font = "900 40px 'Impact', sans-serif";
            ctx.strokeText("GAME OVER", canvas.width/2, 180);
            ctx.fillText("GAME OVER", canvas.width/2, 180);
            
            // Papan Skor
            ctx.fillStyle = '#ded895';
            ctx.fillRect(canvas.width/2 - 70, 220, 140, 80);
            ctx.strokeRect(canvas.width/2 - 70, 220, 140, 80);
            
            ctx.fillStyle = '#000';
            ctx.font = "bold 18px Arial";
            ctx.fillText("SKOR: " + score.value, canvas.width/2, 250);
            ctx.fillText("BEST: " + score.best, canvas.width/2, 280);

            ctx.fillStyle = '#FFF';
            ctx.strokeText("Klik untuk Coba Lagi", canvas.width/2, 340);
            ctx.fillText("Klik untuk Coba Lagi", canvas.width/2, 340);
        } else {
            ctx.font = "900 50px 'Impact', sans-serif";
            ctx.strokeText(score.value, canvas.width/2, 70);
            ctx.fillText(score.value, canvas.width/2, 70);
        }
    }

    function loop() {
        update();
        draw();
        frames++;
        reqId = requestAnimationFrame(loop);
    }

    function flap() {
        if (currentState === state.getReady) {
            currentState = state.game;
            playSound('flap');
            bird.speed = -bird.jump;
        } else if (currentState === state.game) {
            playSound('flap');
            bird.speed = -bird.jump;
        } else if (currentState === state.over && bird.y >= canvas.height - 20) {
            // Reset Game
            pipes.position = [];
            score.value = 0;
            bird.speed = 0;
            bird.y = 150;
            bird.rotation = 0;
            currentState = state.getReady;
        }
    }

    // --- 5. EVENT LISTENER ---
    canvas.addEventListener('click', flap);
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && modal.style.display === 'flex') {
            e.preventDefault();
            flap();
        }
    });

    btn.addEventListener('click', () => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (!reqId) {
            currentState = state.getReady;
            loop();
        }
        // Inisialisasi Audio Engine untuk pertama kali
        if (audioCtx.state === 'suspended') audioCtx.resume();
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        cancelAnimationFrame(reqId);
        reqId = null;
        pipes.position = [];
        score.value = 0;
        bird.y = 150;
        bird.speed = 0;
    });
})();
</script>
<!-- Akhir Plugin Flappy Bird V2 -->
