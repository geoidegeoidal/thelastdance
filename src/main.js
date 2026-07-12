import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import LetterScene from './scenes/LetterScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 720,
  pixelArt: true, // Importante para estética Stardew Valley
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1500 }, // Aumentada de 800 a 1500 para evitar que flote
      debug: false
    }
  },
  scene: [BootScene, TitleScene, GameScene, LetterScene]
};

// Limpiar contenedor en caso de recargas por HMR (Vite)
const container = document.getElementById('game-container');
if (container) {
  container.innerHTML = '';
}

const game = new Phaser.Game(config);
