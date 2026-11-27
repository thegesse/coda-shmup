import {Scene, GameObjects} from 'phaser';
import Health from "../components/Health.ts";
import RegistryConstants from "../RegistryConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import SaveConstants from "../SaveConstants.ts";
import EntityManager from "../managers/EntityManager.ts";
import GameConstants from "../GameConstants.ts";

export default class MainGameScene extends Scene {
    private bg: GameObjects.TileSprite;
    private planet: GameObjects.Image;
    private stars: GameObjects.Arc[] = [];
    private saveManager: SaveManager;
    private entityManager: EntityManager;
    private ending = false;

    constructor() {
        super(GameConstants.SceneKeys.MAIN_GAME);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        this.stars = [];
        this.ending = false;
        if (!this.saveManager) {
            console.error('SaveManager plugin not found');
        }
        this.saveManager?.load();

        const bgMargin = 512;
        this.bg = this.add.tileSprite(this.cameras.main.centerX, this.cameras.main.centerY,
            this.cameras.main.width + bgMargin, this.cameras.main.height + bgMargin, 'bg').setTileScale(2);
        this.planet = this.add.image(0, -512, 'planet').setOrigin(0);
        this.planet.setAlpha(0.72).setDepth(1);

        // Layered, drifting stars add depth without needing extra art assets.
        const starColors = [0x83eaff, 0xd2a6ff, 0xffffff];
        for (let i = 0; i < 92; i++) {
            const radius = Phaser.Math.FloatBetween(1, i % 9 === 0 ? 3.2 : 1.8);
            const star = this.add.circle(
                Phaser.Math.Between(8, this.scale.width - 8),
                Phaser.Math.Between(0, this.scale.height),
                radius,
                Phaser.Utils.Array.GetRandom(starColors),
                Phaser.Math.FloatBetween(0.3, 0.85)
            ).setDepth(i % 5 === 0 ? 2 : 0);
            this.stars.push(star);
        }

        if (!this.entityManager) {
            console.error('EntityManager plugin not found');
        }

        const player = this.entityManager.initAndSpawnPlayer();
        player.getComponent(Health)?.once(Health.DEATH_EVENT, () => {
            // Hide the player and let its explosion play before showing the game over screen
            player.disableBody(true, true);
            this.time.delayedCall(1000, () => this.endGame(false), [], this);
        }, this);
        const onBossHealthChanged = (_parent: unknown, value: number) => {
            if (Number(value) <= 0) {
                this.registry.events.off('changedata-bossHealth', onBossHealthChanged, this);
                this.time.delayedCall(1200, () => this.endGame(true), [], this);
            }
        };
        this.registry.events.on('changedata-bossHealth', onBossHealthChanged, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.registry.events.off('changedata-bossHealth', onBossHealthChanged, this);
        });
        this.entityManager.initEnemies();
        this.entityManager.initGroupCollisions();

        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-ESC', this.openPauseMenu, this);
            this.input.keyboard.on('keydown-R', this.restartRun, this);
            this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
                this.input.keyboard?.off('keydown-ESC', this.openPauseMenu, this);
                this.input.keyboard?.off('keydown-R', this.restartRun, this);
            });
        } else {
            console.error('No keyboard input');
        }

        this.registry.set(RegistryConstants.Keys.PLAYER_SCORE, 0);

        console.log("MainGameScene created");
    }

    private openPauseMenu() {
        this.scene.launch(GameConstants.SceneKeys.PAUSE_MENU);
        this.scene.pause(GameConstants.SceneKeys.MAIN_GAME);
        this.scene.pause(GameConstants.SceneKeys.MAIN_UI);
    }

    private restartRun() {
        this.scene.restart();
    }

    private endGame(won: boolean) {
        if (this.ending)
            return;
        this.ending = true;
        this.registry.set('gameWon', won);
        const bestScore: number = Number(this.saveManager.getData(SaveConstants.Keys.PLAYER_BEST_SCORE) ?? 0);
        const currentScore: number = Number(this.registry.get(RegistryConstants.Keys.PLAYER_SCORE) ?? 0);
        if (currentScore > bestScore) {
            this.saveManager.setData(SaveConstants.Keys.PLAYER_BEST_SCORE, currentScore);
            console.log("New Best Score: " + currentScore);
        }

        this.scene.start(GameConstants.SceneKeys.GAME_OVER);
    }

    update(_timeSinceLaunch: number, deltaTime: number) {
        this.bg.tilePositionY -= 0.1 * deltaTime;
        this.planet.y += 0.40 * deltaTime;
        for (const star of this.stars) {
            star.y += (star.depth === 2 ? 0.12 : 0.055) * deltaTime;
            if (star.y > this.scale.height + 4) {
                star.y = -4;
                star.x = Phaser.Math.Between(8, this.scale.width - 8);
            }
        }
    }
}
