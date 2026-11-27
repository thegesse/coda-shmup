import {GameObjects, Plugins, Physics, Scene} from "phaser";
import Health from "../components/Health.ts";
import Bullet from "../entities/Bullet.ts";
import Enemy from "../entities/Enemy.ts";
import Player from "../entities/Player.ts";
import GroupUtils from "../utils/GroupUtils.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class EntityManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'EntityManager';
    public static readonly MAPPING_NAME: string = 'entityManager';

    // noinspection JSUnusedGlobalSymbols
    private readonly bulletGroupConfig = {
        classType: Bullet,
        maxSize: 1024,
        runChildUpdate: true,
        createCallback: (bullet: GameObjects.GameObject) => {
            (bullet as Bullet).init();
        }
    }

    private static readonly BOSS_HEALTH_PER_UNIT = 44;
    private static readonly BOSS_UNIT_COUNT = 11;

    private _player: Player;
    private _playerBullets: Physics.Arcade.Group;
    private _enemies: Physics.Arcade.Group;
    private _enemyBullets: Physics.Arcade.Group;
    private _bossHealth: number = EntityManager.BOSS_HEALTH_PER_UNIT * EntityManager.BOSS_UNIT_COUNT;
    private _bossPatternPhase: number = 0;

    constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
        super(scene, pluginManager, EntityManager.PLUGIN_KEY);

        console.log("[EntityManager] Initialized");
    }

    destroy() {
        super.destroy();

        console.log("[EntityManager] Destroyed");
    }

    public initAndSpawnPlayer(): Player {
        this._playerBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(64, this._playerBullets);

        this._player = new Player(this.scene!, this.scene!.cameras.main.centerX, this.scene!.cameras.main.height - 128);
        this._player.init(this._playerBullets);
        this.scene!.registry.set('player', this._player);

        console.log("[EntityManager] Player spawned");

        this.game!.events.emit(GameConstants.Events.PLAYER_SPAWNED_EVENT, this._player);

        return this._player;
    }

    public initEnemies(): Physics.Arcade.Group {
        this._enemyBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(1024, this._enemyBullets);

        this._enemies = this.scene!.physics.add.group({
            classType: Enemy,
            defaultKey: 'sprites',
            defaultFrame: 'ufoRed',
            createCallback: (enemy) => {
                (enemy as Enemy).init(this._enemyBullets);
            }
        });

        this.spawnBossFormation();

        console.log("[EntityManager] Enemies initialized");

        return this._enemies;
    }

    public initGroupCollisions() {
        this.scene!.physics.add.overlap(this._playerBullets, this._enemies, (bullet, target) => {
            const playerBullet = bullet as Bullet;
            const enemy = target as Enemy;
            if (!enemy.active)
                return;

            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE, 10);
            playerBullet.disable();
            enemy.getComponent(Health)?.damage(playerBullet.damage);
            this._bossHealth = Math.max(0, this._bossHealth - playerBullet.damage);
            this.scene!.registry.set('bossHealth', this._bossHealth);

            if (this._bossHealth === 0) {
                this._enemies.getChildren().forEach(child => {
                    (child as Enemy).disable();
                });
            }
        });

        this.scene!.physics.add.overlap(this._player, this._enemyBullets, (player, bullet) => {
            (bullet as Bullet).disable();
            (player as Player).takeHit(8);

            this.scene?.cameras.main.shake(100, 0.01);
        });

        this.scene!.physics.add.overlap(this._player, this._enemies, (player) => {
            (player as Player).takeHit(12);
        });

        console.log("[EntityManager] Group collisions initialized");
    }

    private spawnBossFormation() {
        this._bossPatternPhase = 0;
        const width = this.scene!.cameras.main.width;
        const astralBoss = Number(this.scene!.registry.get('bossSelection') ?? 0) === 1;

        if (astralBoss) {
            const enemy = this._enemies.get() as Enemy;
            enemy?.enableAstralBoss(width / 2, 190);
        } else {
            const margin = 64;
            const usableWidth = width - margin * 2;

            for (let i = 0; i < EntityManager.BOSS_UNIT_COUNT; i++) {
                const enemy = this._enemies.get() as Enemy;
                if (!enemy)
                    continue;

                const x = margin + usableWidth * (i / (EntityManager.BOSS_UNIT_COUNT - 1));
                enemy.enableBoss(i, x, 130);
            }
        }

        this._bossHealth = EntityManager.BOSS_HEALTH_PER_UNIT * EntityManager.BOSS_UNIT_COUNT;
        this.scene!.registry.set('bossHealth', this._bossHealth);
        this.scene!.registry.set('bossMaxHealth', this._bossHealth);
        this.scene!.registry.set('bossPatternPhase', this._bossPatternPhase);

        this.scene!.time.addEvent({
            delay: 12000,
            callback: () => {
                this._bossPatternPhase = (this._bossPatternPhase + 1) % 5;
                this.scene!.registry.set('bossPatternPhase', this._bossPatternPhase);
            },
            callbackScope: this,
            loop: true
        });

        console.log("[EntityManager] Boss formation spawned");
    }

}
