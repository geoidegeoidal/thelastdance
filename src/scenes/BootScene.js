import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load Blue Haired Woman spritesheet
    this.load.spritesheet('player', import.meta.env.BASE_URL + 'assets/Blue Haired Woman/blue_haired_woman.png', { frameWidth: 32, frameHeight: 32 });

    // Load Tilemap JSON
    this.load.tilemapTiledJSON('mapa', import.meta.env.BASE_URL + 'assets/Mapa.json');
    
    // Cargar música de fondo
    this.load.audio('musica_fondo', import.meta.env.BASE_URL + 'assets/musica_fondo.mp3');

      // Load Cat Follower spritesheets
      // Cat 1: Tuxedo (Batman)
      this.load.spritesheet('cat_tuxedo_idle', import.meta.env.BASE_URL + 'assets/cats/AllCatsDemo/BatmanCatFree/IdleCatt.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('cat_tuxedo_run', import.meta.env.BASE_URL + 'assets/cats/AllCatsDemo/BatmanCatFree/JumpCattt.png', { frameWidth: 32, frameHeight: 32 });
      
      // Cat 2: Carey 1 (Tiger)
      this.load.spritesheet('cat_carey_idle', import.meta.env.BASE_URL + 'assets/cats/AllCatsDemo/TigerCatFree/IdleCatt.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('cat_carey_run', import.meta.env.BASE_URL + 'assets/cats/AllCatsDemo/TigerCatFree/JumpCattt.png', { frameWidth: 32, frameHeight: 32 });
      
      // Cat 3: Carey 2 (Brown)
      this.load.spritesheet('cat_carey2_idle', import.meta.env.BASE_URL + 'assets/cats/AllCatsDemo/Brown/IdleCattt.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('cat_carey2_run', import.meta.env.BASE_URL + 'assets/cats/AllCatsDemo/Brown/JumpCatttt.png', { frameWidth: 32, frameHeight: 32 });
      
      // Cat 4: Calico (ThreeColor)
      this.load.spritesheet('cat_calico_idle', import.meta.env.BASE_URL + 'assets/cats/AllCatsDemo/ThreeColorFree/IdleCatt.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('cat_calico_run', import.meta.env.BASE_URL + 'assets/cats/AllCatsDemo/ThreeColorFree/JumpCattt.png', { frameWidth: 32, frameHeight: 32 });

    // Load Tileset images for Tiled map
    this.load.image('cielo', import.meta.env.BASE_URL + 'assets/tilesets/fourSeasonsPlatformer_ [tileset, version 2.0]/background_/sky_.png');
    this.load.image('Terreno', import.meta.env.BASE_URL + 'assets/tilesets/fourSeasonsPlatformer_ [tileset, version 2.0]/midground_/summer_.png');
    this.load.image('Decoraciones', import.meta.env.BASE_URL + 'assets/tilesets/fourSeasonsPlatformer_ [tileset, version 2.0]/objects_/staticObjects_.png');
    this.load.spritesheet('Decoraciones_sprites', import.meta.env.BASE_URL + 'assets/tilesets/fourSeasonsPlatformer_ [tileset, version 2.0]/objects_/staticObjects_.png', { frameWidth: 16, frameHeight: 16 });

    // Load Items and Icons
    // Cat Trigger (ID 7 -> Index 6 of SuperRetroWorld icons)
    this.load.spritesheet('retro_icons', import.meta.env.BASE_URL + 'assets/characters/SuperRetroWorld_CharacterPack_Full/rpgmaker/MV/characters/$_srw_free_icons1.png', { frameWidth: 48, frameHeight: 48 });
    
    // Chests for the letters
    this.load.spritesheet('chests', import.meta.env.BASE_URL + 'assets/characters/SuperRetroWorld_CharacterPack_Full/rpgmaker/MV/characters/_srw_free_chests.png', { frameWidth: 54, frameHeight: 96 });

  }

  create() {
    // Create Blue Haired Woman Animations
    this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
    });

    this.anims.create({
        key: 'run',
        frames: this.anims.generateFrameNumbers('player', { start: 16, end: 19 }), // Row 5 is right walk
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'jump',
        frames: [ { key: 'player', frame: 17 } ],
        frameRate: 5,
        repeat: 0
    });
    
    this.anims.create({
        key: 'fall',
        frames: [ { key: 'player', frame: 19 } ],
        frameRate: 5,
        repeat: 0
    });

    // Create Cat Animations
    const catTypes = ['_tuxedo', '_carey', '_carey2', '_calico'];
    
    catTypes.forEach(type => {
        this.anims.create({
            key: `cat${type}_idle`,
            frames: this.anims.generateFrameNumbers(`cat${type}_idle`, { start: 0, end: 6 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: `cat${type}_run`,
            frames: this.anims.generateFrameNumbers(`cat${type}_run`, { start: 0, end: 7 }),
            frameRate: 12,
            repeat: -1
        });
    });

    // Inicializar el menú principal
    this.scene.start('TitleScene');
  }
}
