import Phaser from 'phaser';

export default class LetterScene extends Phaser.Scene {
  constructor() {
    super('LetterScene');
  }

  init(data) {
    this.level = data.level || 1;
    this.maxLevel = 5;
  }

  create() {
    // Fondo oscuro para la carta
    this.add.rectangle(0, 0, 800, 600, 0x111111).setOrigin(0);

    // Contenedor de la carta
    const paper = this.add.rectangle(400, 300, 600, 400, 0xf4ecd8);
    paper.setStrokeStyle(4, 0x8b4513);

    // Textos temporales para cada nivel (la carta completa se divide en partes)
    const letterParts = [
      "No hay nivel 0",
      "Parte 1: Ha pasado un tiempo...\n\nTodavía recuerdo cuando...",
      "Parte 2: Intenté buscar una solución,\npero a veces las cosas\nsimplemente no encajan.",
      "Parte 3: No es culpa de nadie.\nSupongo que ambos cambiamos\ny tomamos rumbos distintos.",
      "Parte 4: Me llevo los buenos recuerdos.\nAprendí mucho a tu lado.",
      "Parte 5 (Final): Esta es una bonita despedida.\nQue te vaya increíble.\n\nAtte: ..."
    ];

    const currentText = letterParts[this.level] || "Gracias por jugar.";

    this.add.text(400, 250, currentText, {
      fontFamily: '"Press Start 2P"',
      fontSize: '16px',
      fill: '#4a3b32', // Letra color marrón oscuro (Stardew Valley vibes)
      align: 'center',
      wordWrap: { width: 500 }
    }).setOrigin(0.5);

    // Indicador de presionar continuar
    const continueText = this.add.text(400, 460, "Presiona [ESPACIO] para continuar", {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      fill: '#8b4513'
    }).setOrigin(0.5);

    // Efecto parpadeo
    this.tweens.add({
      targets: continueText,
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // TODO: Aquí se reproducirá la música de YouTube cuando se provean los mp3.
    // this.sound.play(`cancion_nivel_${this.level}`);

    // Tecla para avanzar
    this.input.keyboard.once('keydown-SPACE', () => {
      if (this.level < this.maxLevel) {
        this.scene.start('GameScene', { level: this.level + 1 });
      } else {
        // Juego terminado
        this.scene.start('BootScene'); // Reiniciar o ir a una escena de fin (Créditos)
      }
    });
  }
}
