import {Scene} from "phaser";
import Entity from "./Entity.ts";
import Health from "../components/Health.ts";
import Weapon from "../components/Weapon.ts";
import SinusoidalMovement from "../components/SinusiodalMovement.ts";
import type {MiniBossSheet} from "../gameData/MiniBossData.ts";

export default class MiniBoss extends Entity {
    private _shootTimer: Phaser.Time.TimerEvent;
    private _movement: SinusoidalMovement;
    private _health: Health;
    private _weapon: Weapon;
    private _settings: MiniBossSheet;

    public constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'sprites', 'ufoRed');
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, settings: MiniBossSheet) {
        this._settings = settings;
        this.setScale(settings.miniboss.scale);

        this._health = new Health(settings.miniboss.health, this);
        this._movement = new SinusoidalMovement(
            settings.miniboss.speed,
            settings.miniboss.wave_amplitude,
            settings.miniboss.wave_frequency
        );
        this._weapon = new Weapon(bulletsGroup, settings.spreadshot.projectile);

        this.addComponent(this._health);
        this.addComponent(this._movement);
        this.addComponent(this._weapon);

        this._health.on(Health.CHANGE_EVENT, () => {
            this.setTintFill(0xffffff);

            if (this._health.current === 0)
                this.disableBody();

            this.scene.time.delayedCall(50, () => {
                this.clearTint();

                if (this._health.current === 0)
                    this.disable();
            });
        });

        this.angle = settings.miniboss.orientation_degrees;
        this.arcadeBody.setCircle(this.displayWidth / 2);

        if (!this.scene.anims.exists('ufoShoot')) {
            this.scene.anims.create({
                key: 'ufoShoot',
                frames: [
                    {key: 'sprites', frame: 'ufoRed'},
                    {key: 'sprites', frame: 'ufoRed-shoot0'},
                    {key: 'sprites', frame: 'ufoRed-shoot1'}
                ],
                frameRate: settings.spreadshot.animation_frame_rate,
            });
        }

        this._shootTimer = this.scene.time.addEvent({
            delay: this.getShootDelay(),
            callback: this.shoot,
            callbackScope: this,
            loop: true,
            paused: true
        });

        this.enable(this.x, this.y);
    }

    public enable(x: number, y: number) {
        this.enableBody(true, x, y, true, true);
        this._movement.setSpeed(this._settings.miniboss.speed);
        this._movement.reset(this);
        this._health.heal(this._health.max, false);
        this._shootTimer.reset({
            delay: this.getShootDelay(),
            callback: this.shoot,
            callbackScope: this,
            loop: true
        });
    }

    public takeBulletDamage(incomingDamage: number) {
        const damage = Math.min(incomingDamage, this._settings.miniboss.max_damage_per_hit);
        this._health.damage(damage);
    }

    public disable() {
        this.stop();
        this.removeAllListeners(Phaser.Animations.Events.ANIMATION_COMPLETE);

        this.disableBody(true, true);
        this._shootTimer.paused = true;
    }

    private shoot() {
        this.play('ufoShoot');
        this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.setTexture('sprites', 'ufoRed');
            this._weapon.shootSpread(
                this,
                this._settings.spreadshot.spread,
                this._settings.spreadshot.num_bullets,
                this._settings.spreadshot.angle
            );
            this.scene.sound.play('sfx_laser2');
        });
    }

    private getShootDelay(): number {
        return Phaser.Math.Between(
            this._settings.spreadshot.fire_delay_min,
            this._settings.spreadshot.fire_delay_max
        );
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        if (this.y > this.scene.cameras.main.height + this.displayHeight) {
            this.disable();
            return;
        }

        if (this._settings.miniboss.movement_pattern === 'sine_wave') {
            const movementDelta = this.isTinted
                ? deltaTime * this._settings.miniboss.tinted_speed_multiplier
                : deltaTime;
            this._movement.moveSinusoidally(this, movementDelta);
        }
    }
}
