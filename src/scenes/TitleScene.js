import Phaser from 'phaser';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    // Iniciar música de fondo (evitando que se duplique)
    if (!this.sound.get('musica_fondo')) {
        this.bgMusic = this.sound.add('musica_fondo', { loop: true, volume: 0.4 });
        this.bgMusic.play();
    } else if (!this.sound.get('musica_fondo').isPlaying) {
        this.sound.get('musica_fondo').play();
    }

    // Fondo usando el cielo del juego
    const bg = this.add.image(cx, cy, 'cielo');
    bg.setScale(this.cameras.main.width / bg.width, this.cameras.main.height / bg.height);
    
    // 1. Partículas Mágicas (Estrellitas cayendo)
    const g = this.make.graphics({x:0, y:0, add:false});
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(3, 3, 3);
    g.generateTexture('star_particle', 6, 6);

    this.add.particles(0, 0, 'star_particle', {
        x: { min: 0, max: this.cameras.main.width },
        y: -10,
        lifespan: 6000,
        speedY: { min: 10, max: 40 },
        speedX: { min: -10, max: 10 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.8, end: 0 },
        blendMode: 'ADD',
        frequency: 150
    });

    // 2. Título Principal Elevado
    const title = this.add.text(cx, cy - 90, 'EL ÚLTIMO VIAJE', {
        fontFamily: '"Press Start 2P"',
        fontSize: '56px',
        fill: '#ffffff',
        stroke: '#4a2511',
        strokeThickness: 12,
        shadow: { offsetX: 0, offsetY: 8, color: '#000000', blur: 4, fill: true }
    }).setOrigin(0.5);
    
    // Gradiente dorado al título
    title.setTint(0xfffbdf, 0xfffbdf, 0xffa500, 0xffa500);

    // Animación de flotación suave para el título
    this.tweens.add({
        targets: title,
        y: title.y - 12,
        duration: 2500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // 3. Panel de Instrucciones Redondeado y Elegante
    const panelW = 660;
    const panelH = 85;
    
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 0.65);
    graphics.fillRoundedRect(cx - panelW/2, cy + 10, panelW, panelH, 16);
    graphics.lineStyle(4, 0x8b5a2b, 1);
    graphics.strokeRoundedRect(cx - panelW/2, cy + 10, panelW, panelH, 16);

    // Fuentes mejoradas y coloridas para los controles
    this.add.text(cx, cy + 35, 
        '[←] [→] Mover  |  [ESPACIO] Saltar (Toca 2 veces = Doble Salto)', {
        fontFamily: '"Press Start 2P"',
        fontSize: '11px',
        fill: '#ffd700', // Dorado
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, fill: true }
    }).setOrigin(0.5);

    this.add.text(cx, cy + 65, 
        '[ E ] Abrir Cofres  |  [ENTER] Cerrar Cartas', {
        fontFamily: '"Press Start 2P"',
        fontSize: '11px',
        fill: '#aadaff', // Azul claro
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, fill: true }
    }).setOrigin(0.5);

    // 4. Texto de Inicio Pulsante
    const promptText = this.add.text(cx, cy + 140, '>> PRESIONA ENTER PARA COMENZAR <<', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        fill: '#ffffff',
        shadow: { offsetX: 0, offsetY: 0, color: '#ffaaaa', blur: 8, fill: true }
    }).setOrigin(0.5);

    this.tweens.add({
        targets: promptText,
        alpha: 0.2,
        scale: 1.05,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Personaje y los 5 gatitos caminando de extremo a extremo
    this.walkersContainer = this.add.container(-200, cy + 220);
    
    const p = this.add.sprite(0, 0, 'player').play('run').setScale(2);
    this.walkersContainer.add(p);
    
    const catKeys = ['cat_tuxedo', 'cat_tuxedo', 'cat_tuxedo', 'cat_carey', 'cat_carey2', 'cat_calico'];
    const sprites = [p];
    this.catSprites = [];
    catKeys.forEach((key, index) => {
        // Escala 1 (se ven como 16x16 al lado del player que es escala 2)
        // Offset Y de 16 para que sus patitas toquen el mismo suelo que el player
        const cat = this.add.sprite(-25 * (index + 1), 16, key + '_run').play(key + '_run').setScale(1);
        cat.setVisible(false); // Ocultos al inicio
        this.walkersContainer.add(cat);
        sprites.push(cat);
        this.catSprites.push(cat);
    });

    this.visibleCats = 0; // Contador de gatos que se han unido

    // Tween para que caminen de izquierda a derecha y viceversa
    this.tweens.add({
        targets: this.walkersContainer,
        x: this.cameras.main.width + 250,
        duration: 8000,
        yoyo: true,
        repeat: -1,
        onYoyo: () => {
            // Al rebotar, espejamos el contenedor entero para que caminen hacia la izquierda
            this.walkersContainer.setScale(-1, 1);
            // Aparece un gato nuevo
            if (this.visibleCats < this.catSprites.length) {
                this.catSprites[this.visibleCats].setVisible(true);
                this.visibleCats++;
            }
        },
        onRepeat: () => {
            // Al repetir, vuelven a mirar a la derecha
            this.walkersContainer.setScale(1, 1);
            // Aparece un gato nuevo
            if (this.visibleCats < this.catSprites.length) {
                this.catSprites[this.visibleCats].setVisible(true);
                this.visibleCats++;
            }
        }
    });

    // Creador
    const creditsText = this.add.text(cx, this.cameras.main.height - 30, 'Creado con amor por Jorge Ulloa', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#8b5a2b',
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true }
    }).setOrigin(0.5);

    // Input para empezar
    this.input.keyboard.once('keydown-ENTER', () => {
        // Reproducir sonido retro de inicio de juego
        this.playStartSound();
        
        // Transición de cámara
        this.cameras.main.fade(1000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene', { level: 1 });
        });
    });
  }
  
  playStartSound() {
      const ctx = this.sound.context;
      if (!ctx) return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      // Sonido de start clásico (arpegio rápido)
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.1);
      osc.frequency.setValueAtTime(659, now + 0.2);
      osc.frequency.setValueAtTime(880, now + 0.3);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      
      osc.start(now);
      osc.stop(now + 0.5);
  }
}
