import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class PauseMenuScene extends Phaser.Scene {
    constructor() {
        super(GameConstants.SceneKeys.PAUSE_MENU);
    }

    create() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const shade = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x07051a, 0.82);
        shade.setInteractive();

        const panel = this.add.graphics();
        panel.fillStyle(0x17102f, 0.98);
        panel.fillRoundedRect(centerX - 270, centerY - 300, 540, 600, 28);
        panel.lineStyle(3, 0x8ffcff, 0.9);
        panel.strokeRoundedRect(centerX - 270, centerY - 300, 540, 600, 28);

        this.add.text(centerX, centerY - 218, 'PAUSED', {
            fontFamily: 'future', fontSize: '48px', color: '#ffffff',
            stroke: '#453b91', strokeThickness: 5
        }).setOrigin(0.5);
        this.add.text(centerX, centerY - 148,
            `SCORE  ${Number(this.registry.get(RegistryConstants.Keys.PLAYER_SCORE) ?? 0).toString().padStart(6, '0')}`,
            {fontFamily: 'future', fontSize: '18px', color: '#8ffcff'}).setOrigin(0.5);

        this.addMenuButton(centerX, centerY - 48, 'RESUME', () => this.resumeGame(), 0x8ffcff);
        this.addMenuButton(centerX, centerY + 54, 'RESTART RUN', () => this.restartRun(), 0xff9de8);
        this.addMenuButton(centerX, centerY + 156, 'RETURN TO TITLE', () => this.returnToTitle(), 0xd6d4ff);

        this.add.text(centerX, centerY + 244, 'ESC  RESUME     R  RESTART     Q  TITLE', {
            fontFamily: 'future', fontSize: '12px', color: '#a9a4c8'
        }).setOrigin(0.5);

        this.input.keyboard?.on('keydown-ESC', this.resumeGame, this);
        this.input.keyboard?.on('keydown-R', this.restartRun, this);
        this.input.keyboard?.on('keydown-Q', this.returnToTitle, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.keyboard?.off('keydown-ESC', this.resumeGame, this);
            this.input.keyboard?.off('keydown-R', this.restartRun, this);
            this.input.keyboard?.off('keydown-Q', this.returnToTitle, this);
        });
    }

    private addMenuButton(x: number, y: number, label: string, action: () => void, color: number) {
    const button = this.add.text(x, y, label, {
        fontFamily: 'future',
        fontSize: '24px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        padding: { x: 28, y: 14 },
        backgroundColor: '#211943'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setScale(1.06).setBackgroundColor({ backgroundColor: '#38285c' }));
    button.on('pointerout', () => button.setScale(1).setBackgroundColor({ backgroundColor: '#211943' }));
    button.on('pointerdown', action);
}

    private resumeGame() {
        this.scene.stop(GameConstants.SceneKeys.PAUSE_MENU);
        this.scene.resume(GameConstants.SceneKeys.MAIN_GAME);
        this.scene.resume(GameConstants.SceneKeys.MAIN_UI);
    }

    private restartRun() {
        this.scene.stop(GameConstants.SceneKeys.PAUSE_MENU);
        this.scene.resume(GameConstants.SceneKeys.MAIN_UI);
        this.scene.restart(GameConstants.SceneKeys.MAIN_GAME);
    }

    private returnToTitle() {
        this.scene.stop(GameConstants.SceneKeys.PAUSE_MENU);
        this.scene.stop(GameConstants.SceneKeys.MAIN_UI);
        this.scene.stop(GameConstants.SceneKeys.MAIN_GAME);
        this.scene.start(GameConstants.SceneKeys.HOME);
    }
}
