import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super(GameConstants.SceneKeys.GAME_OVER);
    }

    create() {
        this.scene.stop(GameConstants.SceneKeys.MAIN_UI);

        const won = Boolean(this.registry.get('gameWon'));
        const screenCenterX: number = this.scale.width / 2;
        const titleY: number = this.scale.height / 3;
        this.add.text(screenCenterX, titleY, won ? 'WARDEN DEFEATED' : 'GAME OVER',
            {fontSize: won ? '64px' : '96px', color: won ? '#8ffcff' : '#fff', align: 'center', fontFamily: 'future'}).setOrigin(0.5);
        this.add.text(screenCenterX, titleY + 160, "SCORE",
            {fontSize: '28px', align: 'center', color: '#ff9de8', fontFamily: 'future'}).setOrigin(0.5);

        this.add.text(screenCenterX, titleY + 220, this.registry.get(RegistryConstants.Keys.PLAYER_SCORE).toString(),
            {fontSize: '48px', color: '#fff', align: 'center', fontFamily: 'future'}).setOrigin(0.5);

        this.add.text(screenCenterX, this.scale.height - 256, 'Press SPACE to play again',
            {fontSize: '24px', color: '#d6d4ff', align: 'center', fontFamily: 'future'}).setOrigin(0.5);

        // Ignore the OS key repeat: SPACE is often still held from shooting when the player dies
        this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
            if (event.repeat)
                return;

            this.scene.start(GameConstants.SceneKeys.HOME);
        });

        console.log("GameOverScene created");
    }
}
