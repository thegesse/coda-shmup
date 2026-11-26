import {Input, Scene} from "phaser";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import type {BulletData} from "../gameData/BulletData.ts";
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";

export default class Player extends Entity {
    private static readonly HITBOX_RADIUS = 5;
    private readonly _bulletData: BulletData = {
        width: 12,
        height: 4,
        color: 0xffe066,
        speed: 1024,
        damage: 1
    };

    private readonly _cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    private _playerShipData: PlayerShipData;
    private _rateOfFire: number;
    private _lastShotTime: number;
    public weapon: Weapon;

    private _weaponMode: 'normal' | 'beam' = 'normal';
    private _invulnerabilityRemaining = 0;
    private _hitboxGlow?: Phaser.GameObjects.Arc;
    private _hitboxHalo?: Phaser.GameObjects.Arc;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'sprites');

        if (this.scene.input.keyboard) {
            this._cursorKeys = this.scene.input.keyboard.createCursorKeys();

            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.ONE).on('down', () => this.selectPlayerShip(1));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.TWO).on('down', () => this.selectPlayerShip(2));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.THREE).on('down', () => this.selectPlayerShip(3));
        }
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group) {
        this.addComponent(new Health(50, this));
        this.addComponent(new Movement());
        this.weapon = new Weapon(bulletsGroup, this._bulletData);
        this.addComponent(this.weapon);

        this.angle = -90;

        this.selectPlayerShip(1);

        this._hitboxHalo = this.scene.add.circle(this.x, this.y, 9, 0x70ff00, 0.2)
            .setStrokeStyle(3, 0x8cff00, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(20);
        this._hitboxGlow = this.scene.add.circle(this.x, this.y, Player.HITBOX_RADIUS, 0x071000, 0.96)
            .setStrokeStyle(2, 0xe5ff00, 1).setDepth(21);
        this.scene.tweens.add({
            targets: this._hitboxHalo,
            alpha: {from: 0.5, to: 1},
            duration: 520,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this._rateOfFire = 0.14;
        this._lastShotTime = 0;

        this.getComponent(Health)?.on(Health.CHANGE_EVENT, () => {
            this.arcadeBody.setEnable(false);

            this.scene.time.delayedCall(50, () => {
                // A dead player stays disabled
                if (this.active)
                    this.arcadeBody.setEnable(true);
            });
        });
    }

    public selectPlayerShip(playerShipDataId: number) {
        const playerShipsData = this.scene.cache.json.get('playerShips') as PlayerShipsData;
        this._playerShipData = playerShipsData[playerShipDataId];

        this.setTexture('sprites', this._playerShipData.texture);
        // Center the small Touhou-style hurtbox on the ship's visible center.
        const radius = Player.HITBOX_RADIUS;
        this.arcadeBody.setCircle(
            radius,
            Math.max(0, this.displayWidth / 2 - radius),
            Math.max(0, this.displayHeight / 2 - radius)
        );

        this.getComponent(Movement)?.setSpeed(this._playerShipData.movementSpeed);
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        const focused = this._cursorKeys.shift.isDown;
        this._hitboxHalo?.setPosition(this.arcadeBody.center.x, this.arcadeBody.center.y);
        this._hitboxGlow?.setPosition(this.arcadeBody.center.x, this.arcadeBody.center.y);
        this._invulnerabilityRemaining = Math.max(0, this._invulnerabilityRemaining - deltaTime);
        this.setAlpha(this._invulnerabilityRemaining > 0
            ? (Math.floor(timeSinceLaunch / 70) % 2 ? 0.35 : 1)
            : 1);

        // Press left or right arrow keys to move the player smoothly horizontally using deltaTime
        const movementMultiplier = focused ? 0.45 : 1;
        const horizontal = Number(this._cursorKeys.right.isDown) - Number(this._cursorKeys.left.isDown);
        const vertical = Number(this._cursorKeys.down.isDown) - Number(this._cursorKeys.up.isDown);
        const diagonalScale = horizontal !== 0 && vertical !== 0 ? Math.SQRT1_2 : 1;
        if (horizontal !== 0) {
            this.getComponent(Movement)?.moveHorizontally(this, horizontal * deltaTime * movementMultiplier * diagonalScale);
        }

        // Press up or down arrow keys to move the player smoothly vertically using deltaTime
        if (vertical !== 0) {
            this.getComponent(Movement)?.moveVertically(this, vertical * deltaTime * movementMultiplier * diagonalScale);
        }

        // Clamp player position to screen bounds
        this.x = Phaser.Math.Clamp(
            this.x,
            this.displayWidth / 2,
            this.scene.cameras.main.width - this.displayWidth / 2
        );
        this.y = Phaser.Math.Clamp(
            this.y,
            this.displayHeight / 2,
            this.scene.cameras.main.height - this.displayHeight / 2
        );

        // Press space to shoot
        const shotInterval = this._weaponMode === 'beam' ? 100 : this._rateOfFire * 1000;
        if (timeSinceLaunch - this._lastShotTime > shotInterval) {
            if (this._weaponMode === 'beam')
                this.weapon.shootBeam(this);
            else
                this.weapon.shoot(this);

            this.scene.sound.play('sfx_laser1');
            this._lastShotTime = timeSinceLaunch;
        }
    }

    public takeHit(amount: number) {
        if (this._invulnerabilityRemaining > 0 || !this.active)
            return;
        this._invulnerabilityRemaining = 1100;
        this.getComponent(Health)?.damage(amount);
    }
}
