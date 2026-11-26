import {Loader} from "phaser";
import GameConstants from "../GameConstants.ts";

export default class HomeScene extends Phaser.Scene {
    private bossSelection = 0;
    private bossPreview: Phaser.GameObjects.Image;
    private bossName: Phaser.GameObjects.Text;
    private bossDescription: Phaser.GameObjects.Text;

    constructor() {
        super(GameConstants.SceneKeys.HOME);
    }

    preload() {
        const width: number = this.scale.width;
        const y: number = this.scale.height / 2;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(0, y, width, 64);
        this.load.on(Loader.Events.PROGRESS, function (value: number) { // 0-1
            console.log("Loading : " + value);

            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(0, y, width * value, 64);
        });
        this.load.on(Loader.Events.COMPLETE, function () {
            console.log("Loading complete");

            progressBar.destroy();
            progressBox.destroy();
        });

        this.load.setPath('assets');

        this.load.image('bg', 'Backgrounds/darkPurple.png');
        this.load.image('planet', 'Planets/planet00.png');
        this.load.atlas('sprites', 'Spritesheet/gameSprites.png', 'Spritesheet/gameSprites.json');
        this.load.bitmapFont('future-bmp', 'Fonts/kenvector_future.png', 'Fonts/kenvector_future.xml');
        this.load.font('future', 'Fonts/kenvector_future.ttf');
        this.load.json('playerShips', 'Data/playerShips.json');
        this.load.json('miniBossSheet', new URL('../components/MiniBossSheet.json', import.meta.url).href);
        this.load.audio('sfx_laser1', 'Sounds/sfx_laser1.ogg');
        this.load.audio('sfx_laser2', 'Sounds/sfx_laser2.ogg');
    }

    create() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        this.bossSelection = Number(this.registry.get('bossSelection') ?? 0);
        this.add.image(centerX, centerY - 180, 'planet').setAlpha(0.8).setScale(1.1);
        this.add.text(centerX, centerY - 360, 'CODA SHMUP',
            {fontSize: '72px', color: '#fff', fontFamily: 'future', stroke: '#453b91', strokeThickness: 4}).setOrigin(0.5);
        this.bossPreview = this.add.image(centerX, centerY - 195, 'sprites', 'ufoRed')
            .setScale(2.5).setTint(0xff8acb);
        this.add.text(centerX, centerY - 72, 'SELECT YOUR BOSS', {
            fontSize: '18px', color: '#8ffcff', fontFamily: 'future', letterSpacing: 4
        }).setOrigin(0.5);
        this.bossName = this.add.text(centerX, centerY - 20, '', {
            fontSize: '28px', color: '#ff9de8', fontFamily: 'future', letterSpacing: 2
        }).setOrigin(0.5);
        this.bossDescription = this.add.text(centerX, centerY + 30, '', {
            fontSize: '16px', color: '#d6d4ff', fontFamily: 'future', align: 'center',
            wordWrap: {width: this.scale.width - 120}
        }).setOrigin(0.5);
        this.add.text(centerX, centerY + 112, '←  /  →    CHANGE BOSS', {
            fontSize: '16px', color: '#8ffcff', fontFamily: 'future'
        }).setOrigin(0.5);
        this.add.text(centerX, centerY + 182, 'ARROWS MOVE   •   SHIFT FOCUS   •   ESC PAUSE',
            {fontSize: '18px', color: '#d6d4ff', fontFamily: 'future'}).setOrigin(0.5);
        this.add.text(centerX, centerY + 250, 'PRESS SPACE TO START',
            {fontSize: '24px', color: '#8ffcff', fontFamily: 'future'}).setOrigin(0.5);
        this.updateBossChoice();

        this.input.keyboard?.on('keydown-LEFT', this.previousBoss, this);
        this.input.keyboard?.on('keydown-RIGHT', this.nextBoss, this);

        // Ignore the OS key repeat: SPACE may still be held from the previous game
        this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
            if (event.repeat)
                return;

            this.registry.set('bossSelection', this.bossSelection);
            this.scene.launch(GameConstants.SceneKeys.MAIN_UI);
            this.scene.start(GameConstants.SceneKeys.MAIN_GAME);
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.keyboard?.off('keydown-LEFT', this.previousBoss, this);
            this.input.keyboard?.off('keydown-RIGHT', this.nextBoss, this);
        });

        console.log("HomeScene created");
    }

    private previousBoss() {
        this.bossSelection = (this.bossSelection + 1) % 2;
        this.updateBossChoice();
    }

    private nextBoss() {
        this.bossSelection = (this.bossSelection + 1) % 2;
        this.updateBossChoice();
    }

    private updateBossChoice() {
        if (this.bossSelection === 0) {
            this.bossName.setText('MOONLIT WARDEN');
            this.bossDescription.setText('An eleven-part formation weaving rings, fans, and sweeping curtains.');
            this.bossPreview.setTexture('sprites', 'ufoRed').setScale(2.5).setTint(0xff8acb);
        } else {
            this.bossName.setText('CAFFEINE COMET');
            this.bossDescription.setText('One restless cosmic cup. Dodge its accelerating espresso storms.');
            this.bossPreview.setTexture('sprites', 'cofeemove').setScale(4.5).clearTint();
        }
    }
}
