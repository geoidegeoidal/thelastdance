import Phaser from 'phaser';

class FollowerCat {
    constructor(scene, catType, x, y, index) {
        this.scene = scene;
        this.catType = catType;
        this.index = index; // Para el desplazamiento visual
        
        const idleKey = `cat${catType}_idle`;
        this.sprite = scene.physics.add.sprite(x, y, idleKey).setScale(0.6); // Escala reducida de 1.2 a 0.6
        
        // Desactivar física para el gato, ya que seguirá el rastro exacto del jugador
        this.sprite.body.setAllowGravity(false);
        this.sprite.body.setImmovable(true);
        
        // Cada gato mira más atrás en el mismo historial del jugador
        this.historyLength = 20 + (index * 15); // Aumentado un poco el espacio entre gatos (de 10 a 15)
    }

    update(targetHistory) {
        if (targetHistory.length > this.historyLength) {
            const pastState = targetHistory[targetHistory.length - this.historyLength - 1];
            
            if (pastState) {
                // Desplazamiento visual fijo de 12 píxeles para todos los gatos, para que se amontonen en la misma posición
                const offsetDirection = pastState.flipX ? 1 : -1;
                const visualOffsetX = offsetDirection * 12;
                
                this.sprite.x = pastState.x + visualOffsetX;
                this.sprite.y = pastState.y + 6; // Ajuste vertical (+6px) para que sus patas toquen el suelo debido a la escala 0.6
                this.sprite.setFlipX(pastState.flipX);
                
                if (pastState.isMoving) {
                    this.sprite.anims.play(`cat${this.catType}_run`, true);
                } else {
                    this.sprite.anims.play(`cat${this.catType}_idle`, true);
                }
            }
        } else {
            this.sprite.anims.play(`cat${this.catType}_idle`, true);
        }
    }
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.level = data.level || 1;
    this.maxLevel = 5;
    // Cargar gatos desde el registry (estado global) - por defecto vacío, sin gatos al inicio
    this.catsObtained = this.registry.get('catsObtained') || []; 
    // Contador de cartas encontradas
    this.lettersFound = 0;
  }

  create() {
    // 1. Crear el mapa de Tiled
    const map = this.make.tilemap({ key: 'mapa' });
    
    // 2. Asociar los tilesets
    const cieloTiles = map.addTilesetImage('cielo', 'cielo');
    const terrenoTiles = map.addTilesetImage('Terreno', 'Terreno');
    const decorTiles = map.addTilesetImage('Decoraciones', 'Decoraciones');

    // 3. Crear las capas (aseguramos que existan en el mapa o devolvemos nulo si no)
    const cieloLayer = map.createLayer('Cielo', cieloTiles, 0, 0);
    const terrenoLayer = map.createLayer('Terreno', terrenoTiles, 0, 0);
    const decoracionesLayer = map.createLayer('Decoraciones', decorTiles, 0, 0);

    // Ajustar los límites del mundo a los del mapa
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // 4. Configurar colisiones
    if (terrenoLayer) {
        terrenoLayer.setCollisionByExclusion([-1]);
    }

    // UI HUD
    this.add.text(16, 16, `Nivel: ${this.level}/5\nEstación: ${this.getSeasonName()}`, {
      fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#ffffff',
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 0, fill: true }
    }).setScrollFactor(0).setDepth(100);

    // Gatos Obtenidos UI
    this.catIcons = [];
    for (let i = 0; i < 6; i++) {
        let icon = this.add.image(16 + (i * 32), 60, 'retro_icons', 6);
        icon.setScrollFactor(0).setDepth(100);
        if (i >= this.catsObtained.length) {
            icon.setTint(0x333333);
        }
        this.catIcons.push(icon);
    }
    
    // 5. Encontrar Spawn del jugador
    const spawnPoint = map.findObject("Spawn", obj => obj); // Coge el primero
    let startX = 100;
    let startY = 100;
    if (spawnPoint) {
        startX = spawnPoint.x;
        startY = spawnPoint.y;
    }

    // Jugador
    this.player = this.physics.add.sprite(startX, startY, 'player', 0);
    this.player.body.setSize(16, 24); // Hitbox más pequeña para evitar atascos en 16x16
    this.player.body.setOffset(8, 8); 
    this.player.setBounce(0.05);
    this.player.setCollideWorldBounds(true);
    
    this.jumps = 0; // Para el doble salto

    // Cámara
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
    this.cameras.main.setZoom(3.5); // Mucho más zoom para limitar la visión del escenario

    if (terrenoLayer) {
        this.physics.add.collider(this.player, terrenoLayer);
    }

    // 6. Generadores de Gatos (usando los tiles de Tiled)
    this.catTriggersGroup = this.physics.add.staticGroup();
    const gatosLayer = map.getObjectLayer('Gatos');
    if (gatosLayer && gatosLayer.objects) {
        gatosLayer.objects.forEach(obj => {
            const frame = obj.gid ? obj.gid - 309 : 91; // 309 es el firstgid de Decoraciones
            // En Tiled, el origen de Tile Objects es abajo-izquierda (0, 1), por lo que ajustamos +8, -8 para centrar 16x16
            const trigger = this.catTriggersGroup.create(obj.x + 8, obj.y - 8, 'Decoraciones_sprites', frame); 
            
            // Ajustar la colisión para que sea un rectángulo bajito (ej: 12 de alto) en la base
            trigger.body.setSize(14, 10);
            trigger.body.setOffset(1, 6);

            // Animación flotante suave
            this.tweens.add({ targets: trigger, y: trigger.y - 4, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        });
    }
    this.physics.add.overlap(this.player, this.catTriggersGroup, this.collectCatTrigger, null, this);

    // 7. Generador de Carta (Cofre, usando los tiles de Tiled)
    this.chestsGroup = this.physics.add.staticGroup();
    const cartasLayer = map.getObjectLayer('Cartas');
    if (cartasLayer && cartasLayer.objects) {
        let maxChestX = -1;
        cartasLayer.objects.forEach(obj => {
            if (obj.x > maxChestX) maxChestX = obj.x;
        });

        cartasLayer.objects.forEach(obj => {
            const frame = obj.gid ? obj.gid - 309 : 109;
            const chest = this.chestsGroup.create(obj.x + 8, obj.y - 8, 'Decoraciones_sprites', frame);
            chest.body.setSize(16, 16);
            if (obj.x === maxChestX) {
                chest.isFinalChest = true;
            }
        });
    }
    // NOTA: La colisión e interacción del cofre ahora se revisa en el update() para que no falle.

    // 8. Instanciar Gatos Seguidores
    this.playerHistory = [];
    for(let i=0; i<200; i++){
        this.playerHistory.push({ x: startX, y: startY, flipX: false, isMoving: false });
    }
    
    this.followerCats = [];
    this.catsObtained.forEach((catType, index) => {
        const cat = new FollowerCat(this, catType, startX, startY, index);
        this.followerCats.push(cat);
    });
    
    // Control de estado para saber cuándo aterrizamos
    this.wasInAir = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    // 8. Texto flotante de interacción (pequeño y en el mundo) con fondo
    // Se escalan inversamente al zoom para que mantengan su tamaño visual en pantalla
    const Z = 3.5;
    this.interactBg = this.add.rectangle(0, 0, 200, 26, 0x000000, 0.6)
        .setOrigin(0.5).setVisible(false).setDepth(49).setScale(1/Z);
    this.interactPrompt = this.add.text(0, 0, 'Leer Carta [E]', {
        fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#ffffff'
    }).setOrigin(0.5).setVisible(false).setDepth(50).setScale(1/Z);

    // Contenedor para UI fija (HUD)
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    
    // Al escalar el contenedor inversamente al zoom, neutralizamos el efecto del zoom de la cámara para la UI
    this.uiContainer = this.add.container(cx, cy).setScrollFactor(0).setDepth(100).setScale(1/Z);

    this.uiTextBg = this.add.rectangle(0, -180, 500, 30, 0x000000, 0.6).setOrigin(0.5);
    this.uiTextBg.setVisible(false);

    this.uiText = this.add.text(0, -180, '', {
        fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#ffff00', 
        shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 0, fill: true }, align: 'center'
    }).setOrigin(0.5);
    this.uiText.setVisible(false);
    
    this.uiContainer.add([this.uiTextBg, this.uiText]);
    
    // Iniciar música de fondo
    if (!this.sound.get('musica_fondo')) {
        this.bgMusic = this.sound.add('musica_fondo', { loop: true, volume: 0.4 });
        this.bgMusic.play();
    } else if (!this.sound.get('musica_fondo').isPlaying) {
        this.sound.get('musica_fondo').play();
    }

    this.canAdvance = false;
  }

  getSeasonName() {
      const seasons = ['Primavera', 'Verano', 'Otoño', 'Invierno', 'Espacio'];
      return seasons[this.level - 1] || '???';
  }

    collectCatTrigger(player, trigger) {
        trigger.disableBody(true, true);
        
        const baseTypes = ['_tuxedo', '_tuxedo', '_carey', '_calico', '_tuxedo', '_carey2'];
        
        let newType = '_tuxedo'; // Fallback
        for (let i = 0; i < baseTypes.length; i++) {
            const currentType = baseTypes[i];
            const needed = baseTypes.filter(t => t === currentType).length;
            const obtained = this.catsObtained.filter(t => t === currentType).length;
            if (obtained < needed) {
                newType = currentType;
                break;
            }
        }
        
        this.catsObtained.push(newType);
        this.registry.set('catsObtained', this.catsObtained);
      
      // Update HUD
      const newIndex = this.catsObtained.length - 1;
      if (newIndex < 6 && this.catIcons[newIndex]) {
          this.catIcons[newIndex].clearTint();
          // Añadir pequeño salto de recolección al HUD
          this.tweens.add({
              targets: this.catIcons[newIndex],
              scale: 1.5,
              duration: 200,
              yoyo: true,
              ease: 'Quad.easeInOut'
          });
      }

      // Crear el nuevo gato visualmente
      const newCat = new FollowerCat(this, newType, this.player.x, this.player.y, this.followerCats.length);
      this.followerCats.push(newCat);

      this.playRetroSound('cat');
      this.showMessage("¡Un nuevo gato se une al viaje!");
  }

  showMessage(text) {
      this.uiText.setText(text);
      this.uiText.setVisible(true);
      this.uiTextBg.setVisible(true);
      this.time.delayedCall(3000, () => {
          this.uiText.setVisible(false);
          this.uiTextBg.setVisible(false);
      });
  }

  // Se removió collectLetter porque ahora se evalúa en el update()

  showLetterUI() {
      const cx = this.cameras.main.width / 2;
      const cy = this.cameras.main.height / 2;
      const Z = 3.5;
      
      this.playRetroSound('letter_open');
      
      let typeWriterEvent = null;

      // Overlay oscuro (fuera del contenedor para que no tenga la animación de rebote)
      this.letterOverlay = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7)
          .setScrollFactor(0).setDepth(105).setScale(1/Z).setAlpha(0);

      this.tweens.add({ targets: this.letterOverlay, alpha: 1, duration: 300 });

      // Usar un contenedor escalado inversamente para neutralizar el zoom
      this.letterContainer = this.add.container(cx, cy).setScrollFactor(0).setDepth(110);
      this.letterContainer.setScale(0); // Inicia en 0 para la animación
      this.letterContainer.setAlpha(0);

      // Dimensiones de la carta (Formato retrato, más larga)
      const w = 320;
      const h = 460;

      // Sombra
      const shadow = this.add.rectangle(8, 12, w, h, 0x000000, 0.4);

      // Dibujar "papel" base
      const letterBox = this.add.rectangle(0, 0, w, h, 0xf4e4bc)
          .setStrokeStyle(4, 0x8b5a2b);
          
      // Borde interno decorativo
      const innerBorder = this.add.rectangle(0, 0, w - 16, h - 16)
          .setStrokeStyle(1, 0xcba36f);

      // Listón rojo cruzado
      const ribbon = this.add.rectangle(0, -h/2 + 50, w, 24, 0x880000);

      // Sello de cera con más detalle
      const waxSealBg = this.add.circle(0, -h/2 + 50, 18, 0x770000);
      const waxSeal = this.add.circle(0, -h/2 + 50, 14, 0xbb0000).setStrokeStyle(1, 0x550000);

      // Textos dinámicos para cada cofre
      const letterTexts = [
          "Hola amor, sé que a veces sientes que el peso es mucho, pero confía en ti.",
          "Cada paso que das en este viaje cuenta, incluso los más pequeños.",
          "No olvides respirar. Yo estoy aquí, apoyándote en todo lo que logras.",
          "Eres más fuerte de lo que crees. Sigue adelante.",
          "Estos gatitos te acompañan, igual que mis pensamientos positivos.",
          "Ya falta poco. Sé que puedes superar esto y más.",
          "Y si algo te puedo dejar para estos días, que sea la música que en el cotidiano de la ciudad, me hace recordarte a ti."
      ];
      
      const isLastLetter = (this.currentChest && this.currentChest.isFinalChest) || (this.lettersFound === letterTexts.length - 1);
      
      let textToShow;
      if (isLastLetter) {
          textToShow = letterTexts[letterTexts.length - 1]; // Siempre el último texto
      } else {
          textToShow = letterTexts[this.lettersFound % (letterTexts.length - 1)]; // Ciclamos en los textos normales
      }
      this.lettersFound++;

      this.letterText = this.add.text(-w/2 + 30, -h/2 + 90, '', {
          fontFamily: '"Press Start 2P"',
          fontSize: '10px',
          fill: '#3a2311', // Tinta oscura
          lineSpacing: 14,
          wordWrap: { width: w - 60 }
      });

      const promptText = this.add.text(0, h/2 - 25, "Presiona ENTER o Clic para cerrar", {
          fontFamily: '"Press Start 2P"',
          fontSize: '7px',
          fill: '#8b5a2b'
      }).setOrigin(0.5);
      
      // Animación de respiración para el prompt
      this.tweens.add({
          targets: promptText,
          alpha: 0.2,
          duration: 800,
          yoyo: true,
          repeat: -1
      });

      this.letterContainer.add([shadow, letterBox, innerBorder, ribbon, waxSealBg, waxSeal, this.letterText, promptText]);

      // Animación de entrada de la carta
      this.tweens.add({
          targets: this.letterContainer,
          scaleX: 1/Z,
          scaleY: 1/Z,
          alpha: 1,
          duration: 600,
          ease: 'Back.easeOut',
          onComplete: () => {
              // Efecto máquina de escribir inicia después de la animación
              let i = 0;
              typeWriterEvent = this.time.addEvent({
                  delay: 60, // Ligeramente más lento para saborear el sonido
                  callback: () => {
                      if (this.letterText && this.letterText.active) {
                          const char = textToShow[i];
                          this.letterText.text += char;
                          if (char !== ' ') {
                              this.playRetroSound('typewriter');
                          }
                          i++;
                          
                          // Si terminó de escribir y es la última carta, mostrar Spotify
                          if (i === textToShow.length && isLastLetter) {
                              this.time.delayedCall(500, () => this.showSpotifyOverlay(closeLetter));
                          }
                      }
                  },
                  repeat: textToShow.length - 1
              });
          }
      });
      
      let isClosing = false;
      const closeLetter = () => {
          if (isClosing) return;
          isClosing = true;
          
          // Destruir el evento de escritura si sigue activo
          if (typeWriterEvent) typeWriterEvent.destroy();
          
          // Destruir overlay de Spotify si existe
          const spotify = document.getElementById('spotify-overlay');
          if (spotify) spotify.remove();
          
          // Destruir la UI de la carta completa
          this.letterOverlay.destroy();
          this.letterContainer.destroy();
          
          if (this.currentChest) {
              this.currentChest.disableBody(true, false);
              this.currentChest = null;
          }
          
          this.canAdvance = false; // Permitir al jugador seguir moviéndose en este nivel
      };

      // Permitir cerrar con ENTER (si el canvas tiene foco)
      this.input.keyboard.once('keydown-ENTER', closeLetter);
  }

  showSpotifyOverlay(closeLetterCallback) {
      const gameContainer = document.getElementById('game-container');
      if (!gameContainer) return;
      
      const div = document.createElement('div');
      div.id = 'spotify-overlay';
      div.style.position = 'absolute';
      div.style.top = '50%';
      div.style.left = '50%';
      // Posicionado en la mitad inferior de la carta
      div.style.transform = 'translate(-50%, -10%) scale(0.8)';
      div.style.width = '280px';
      div.style.opacity = '0';
      div.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      div.style.zIndex = '1000';
      div.style.pointerEvents = 'auto'; // El iframe roba los clics
      
      div.innerHTML = `
        <div id="spotify-reveal-btn" style="cursor: pointer; background: #8b5a2b; color: #f4e4bc; font-family: 'Press Start 2P', monospace; font-size: 10px; text-align: center; padding: 15px; border: 4px solid #5c3a21; border-radius: 8px; box-shadow: 0 4px 0 #3a2311; transition: all 0.2s; margin-bottom: 10px;">
            <div style="margin-bottom: 8px; font-size: 16px;">🎵</div>
            Toca aquí para abrir
        </div>
        <div id="spotify-iframe-container" style="display: none; opacity: 0; transition: opacity 1s; margin-bottom: 10px;">
            <iframe data-testid="embed-iframe" style="border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);" src="https://open.spotify.com/embed/playlist/3jkVXI43iwxA4DjCSavMA8?utm_source=generator&si=b3691cd56d8e489d" width="100%" height="280" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        </div>
        <div id="spotify-close-btn" style="cursor: pointer; background: #550000; color: white; font-family: 'Press Start 2P', monospace; font-size: 8px; text-align: center; padding: 10px; border: 2px solid #330000; border-radius: 4px; box-shadow: 0 2px 0 #220000;">
            Cerrar Carta
        </div>
      `;
      
      // Detener clics para que no pasen al canvas
      div.addEventListener('pointerdown', e => e.stopPropagation());
      div.addEventListener('mousedown', e => e.stopPropagation());
      div.addEventListener('click', e => e.stopPropagation());
      
      gameContainer.appendChild(div);
      
      // Activar animación
      setTimeout(() => {
          div.style.transform = 'translate(-50%, -10%) scale(1)';
          div.style.opacity = '1';
      }, 50);

      // Lógica del botón de regalo
      const btn = document.getElementById('spotify-reveal-btn');
      const iframeContainer = document.getElementById('spotify-iframe-container');
      
      btn.addEventListener('click', (e) => {
          e.stopPropagation();
          // Efecto de botón presionado
          btn.style.transform = 'translateY(4px)';
          btn.style.boxShadow = '0 0 0 #3a2311';
          
          this.playRetroSound('letter_open'); // Sonido mágico adicional
          
          setTimeout(() => {
              btn.style.display = 'none';
              div.style.transform = 'translate(-50%, -30%) scale(1)'; // Subir un poco el iframe
              iframeContainer.style.display = 'block';
              setTimeout(() => {
                  iframeContainer.style.opacity = '1';
              }, 50);
          }, 300);
      });
      
      // Lógica del botón de cerrar
      const closeBtn = document.getElementById('spotify-close-btn');
      closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (closeLetterCallback) {
              closeLetterCallback();
          }
      });
  }

  update() {
    if (this.canAdvance) return;

    const speed = 100; // Reducido de 150 a 100 para dar más precisión al plataformeo
    const jumpVelocity = -450; // Ajustado a -450 para compensar la nueva gravedad (1500)

    // Guardar historial del jugador SIEMPRE (basado en tiempo)
    this.playerHistory.push({
        x: this.player.x,
        y: this.player.y,
        flipX: this.player.flipX,
        isMoving: (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0)
    });
    if (this.playerHistory.length > 200) {
        this.playerHistory.shift();
    }

    // --- INTERACCIÓN CON EL COFRE ---
    let touchingChest = null;
    this.physics.overlap(this.player, this.chestsGroup, (player, chest) => {
        touchingChest = chest;
    });

    if (touchingChest && !this.canAdvance) {
        // Movimiento flotante senoidal
        const floatY = touchingChest.y - 20 + Math.sin(this.time.now / 150) * 3;
        
        this.interactBg.setPosition(touchingChest.x, floatY);
        this.interactPrompt.setPosition(touchingChest.x, floatY);
        
        this.interactBg.setVisible(true);
        this.interactPrompt.setVisible(true);

        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.canAdvance = true;
            this.currentChest = touchingChest;
            touchingChest.setAlpha(0.5);
            this.interactBg.setVisible(false);
            this.interactPrompt.setVisible(false);
            this.showLetterUI();
        }
    } else {
        this.interactBg.setVisible(false);
        this.interactPrompt.setVisible(false);
    }
    // --------------------------------

    // Mejor detección de suelo (blocked.down es más fiable para tilemaps que touching.down)
    const isGrounded = this.player.body.blocked.down || this.player.body.touching.down;

    // Detectar si acabamos de aterrizar
    if (this.wasInAir && isGrounded) {
        this.playRetroSound('land');
    }
    this.wasInAir = !isGrounded;

    // Movimiento
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
      if (isGrounded) {
          this.player.anims.play('run', true);
      }
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
      if (isGrounded) {
          this.player.anims.play('run', true);
      }
    } else {
      this.player.setVelocityX(0);
      if (isGrounded) {
          this.player.anims.play('idle', true);
      }
    }

    // Salto y Doble Salto
    if (isGrounded) {
        this.jumps = 0;
    }

    const justDownJump = Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.cursors.up);

    if (justDownJump && this.jumps < 2) {
      this.player.setVelocityY(jumpVelocity);
      this.playRetroSound('jump');
      this.player.anims.play('jump', true);
      this.jumps++;
    }

    // Animación en el aire
    if (!isGrounded) {
        if (this.player.body.velocity.y < 0) {
            this.player.anims.play('jump', true);
        } else {
            this.player.anims.play('fall', true);
        }
    }

    // Actualizar todos los gatos (leyendo directamente del historial del jugador)
    for (let i = 0; i < this.followerCats.length; i++) {
        this.followerCats[i].update(this.playerHistory);
    }
  }

  // --- GENERADOR DE SONIDOS RETRO PROCEDURALES ---
  playRetroSound(type) {
      const ctx = this.sound.context;
      if (!ctx) return; // Si el navegador bloqueó el audio o no está disponible
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      if (type === 'cat') {
          // Sonido de "PowerUp" o moneda
          osc.type = 'square';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
      } 
      else if (type === 'letter_open') {
          // Acorde mágico / revelación
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now); // Nota C5
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659.25, now + 0.15); // Nota E5
          gain2.gain.setValueAtTime(0.15, now + 0.15);
          gain2.gain.linearRampToValueAtTime(0, now + 0.5);
          osc2.start(now + 0.15);
          osc2.stop(now + 0.5);
      } 
      else if (type === 'typewriter') {
          // "Tic" percusivo
          osc.type = 'triangle';
          // Variar la frecuencia aleatoriamente para simular distintas teclas mecánicas
          const freq = 600 + Math.random() * 300;
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.1, now); // Volumen incrementado
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.start(now);
          osc.stop(now + 0.04);
      }
      else if (type === 'jump') {
          // Deslizamiento rápido hacia arriba
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
      }
      else if (type === 'land') {
          // Golpe sordo (thud) de baja frecuencia
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
      }
  }
}
