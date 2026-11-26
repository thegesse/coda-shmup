import type {BulletData} from '../gameData/BulletData.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";

export default class Enemy extends Entity {
    private readonly _bulletData: BulletData = {
        width: 24,
        height: 24,
        color: 0xf25f5c,
        speed: 512,
        damage: 1,
    };
    private _shootTimerConfig: Phaser.Types.Time.TimerEventConfig;
    private _shootTimer: Phaser.Time.TimerEvent;
    private _type: 'strafer' | 'diver' | 'fast' | 'boss' = 'strafer';
    private _horizontalDirection: number = 1;
    private _elapsedTime: number = 0;
    private _bossIndex: number = -1;
    private _baseX: number = 0;
    private _patternRotation: number = 0;
    private _isAstralBoss = false;

    public init(bulletsGroup: Phaser.Physics.Arcade.Group) {
        const isAstralEncounter = Number(this.scene.registry.get('bossSelection') ?? 0) === 1;
        this.addComponent(new Health(isAstralEncounter ? 308 : 44, this));
        this.addComponent(new Movement(0.2));
        this.addComponent(new Weapon(bulletsGroup, this._bulletData));

        // Listen once per enemy, not on every enable(): pooled enemies are reused many times
        const health = this.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, () => {
            this.setTintFill(0xffffff);

            if (health?.current == 0)
            {
                this.disableBody();
            }

            this.scene.time.delayedCall(50, () => {
                this.clearTint();

                if (health?.current == 0)
                {
                    this.disable();
                }
            });
        });

        this.angle = 90;

        this._shootTimerConfig = {
            delay: Phaser.Math.Between(isAstralEncounter ? 520 : 1900, isAstralEncounter ? 780 : 2500),
            callback: this.shoot,
            callbackScope: this,
            loop: true
        };
        this._shootTimer = this.scene.time.addEvent(this._shootTimerConfig);

        // Create animation when enemy is about to shoot in the global animation manager
        if (!this.scene.anims.exists('ufoShoot')) {
            this.scene.anims.create({
                key: 'ufoShoot',
                frames: [
                    {key: 'sprites', frame: 'ufoRed'},
                    {key: 'sprites', frame: 'ufoRed-shoot0'},
                    {key: 'sprites', frame: 'ufoRed-shoot1'}
                ],
                frameRate: 4,
            });
        }

        this.arcadeBody.setCircle(this.displayWidth / 2);
    }

    public enable(x: number, y: number) {
        this.enableBody(true, x, y - this.displayHeight, true, true);
        this._type = Phaser.Math.RND.pick(['strafer', 'diver', 'fast']);
        this._horizontalDirection = Phaser.Math.RND.pick([-1, 1]);
        this._elapsedTime = 0;

        if (this._type === 'diver')
            this.setTexture('sprites', 'ufoRed-shoot0');
        else if (this._type === 'fast')
            this.setTexture('sprites', 'ufoRed-shoot1');
        else
            this.setTexture('sprites', 'ufoRed');

        this._shootTimer.reset(this._shootTimerConfig);

        // Restore health, in case the enemy is reused from the pool, without emitting events
        const health = this.getComponent(Health);
        health?.heal(health.max, false);
    }

    public enableBoss(index: number, x: number, y: number) {
        this.enableBody(true, x, y, true, true);
        this._type = 'boss';
        this._isAstralBoss = false;
        this._bossIndex = index;
        this._baseX = x;
        this._elapsedTime = 0;
        this._patternRotation = index * Math.PI / 11;
        this.setScale(1.8);
        this.setTexture('sprites', index % 2 === 0 ? 'ufoRed-shoot0' : 'ufoRed');

        const health = this.getComponent(Health);
        health?.heal(health.max, false);
        this._shootTimer.reset(this._shootTimerConfig);
    }

    public enableAstralBoss(x: number, y: number) {
        this.enableBody(true, x, y, true, true);
        this._type = 'boss';
        this._isAstralBoss = true;
        this._bossIndex = 5;
        this._baseX = x;
        this._elapsedTime = 0;
        this._patternRotation = 0;
        this.setScale(4.5);
        this.setTexture('sprites', 'cofeemove');
        this.setAngle(0);
        this.clearTint();

        const health = this.getComponent(Health);
        health?.heal(health.max, false);
        this._shootTimer.reset(this._shootTimerConfig);
    }

    public disable() {
        this.stop();
        this.removeAllListeners(Phaser.Animations.Events.ANIMATION_COMPLETE);
        this.disableBody(true, true);
        this._shootTimer.paused = true;
        this.setScale(1);
        this.clearTint();
    }

    private shoot() {
        if (this._isAstralBoss) {
            this.setTexture('sprites', 'cofeeshoot');
            this.scene.time.delayedCall(180, () => {
                if (!this.active)
                    return;
                this.setTexture('sprites', 'cofeemove');
                this.shootAstralPattern();
                this.scene.sound.play('sfx_laser2');
            });
            return;
        }

        this.play('ufoShoot');
        this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.setTexture('sprites', this._type === 'boss' && this._bossIndex % 2 === 0
                ? 'ufoRed-shoot0'
                : 'ufoRed');

            if (this._type === 'boss') {
                const groupDelay = this._bossIndex < 6 ? 0 : 750;
                this.scene.time.delayedCall(groupDelay, () => {
                    if (this.active)
                        this.shootBossPattern();
                });
            } else if (this._type === 'fast') {
                this.shootBeam(Math.PI / 2);
            } else {
                this.shootVariantBullet(Math.PI / 2);
            }

            this.scene.sound.play('sfx_laser2');
        });
    }

    private shootAstralPattern() {
        const weapon = this.getComponent(Weapon);
        const phase = Number(this.scene.registry.get('bossPatternPhase') ?? 0);
        const player = this.scene.registry.get('player') as Phaser.GameObjects.Sprite | undefined;
        const aim = player
            ? Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y)
            : Math.PI / 2;

        if (phase === 0) {
            // A wider coffee-colored fan with alternating projectile speeds.
            for (let lane = -8; lane <= 8; lane++) {
                weapon?.shootWithData(this, {
                    width: 19, height: 19, color: 0xffbd69,
                    speed: lane % 2 === 0 ? 410 : 610, damage: 1
                }, aim + lane * 0.075);
            }
        } else if (phase === 1) {
            // Dense gravity ring, followed by a faster aimed espresso burst.
            weapon?.shootRadialWithData(this, 24, {
                width: 19, height: 19, color: 0xb884ff, speed: 325, damage: 1
            }, this._patternRotation);
            for (let lane = -3; lane <= 3; lane++) {
                weapon?.shootWithData(this, {
                    width: 16, height: 16, color: 0xff684f, speed: 690, damage: 1
                }, aim + lane * 0.065);
            }
            this._patternRotation += Math.PI / 10;
        } else if (phase === 2) {
            // Twin spirals rotate in opposite directions and cross near the player.
            weapon?.shootRadialWithData(this, 20, {
                width: 17, height: 17, color: 0x69eaff, speed: 420, damage: 1
            }, this._patternRotation);
            weapon?.shootRadialWithData(this, 20, {
                width: 13, height: 13, color: 0xff68c8, speed: 510, damage: 1
            }, -this._patternRotation + Math.PI / 16);
            this._patternRotation += Math.PI / 12;
        } else if (phase === 3) {
            // A horizontal sweep of heavy droplets, then a narrow fast center lane.
            for (let lane = -8; lane <= 8; lane++) {
                weapon?.shootWithData(this, {
                    width: 21, height: 21, color: 0x8dff9a,
                    speed: lane % 3 === 0 ? 650 : 370, damage: 1
                }, Math.PI / 2 + lane * 0.06);
            }
            for (let lane = -2; lane <= 2; lane++) {
                weapon?.shootWithData(this, {
                    width: 14, height: 14, color: 0xffffff, speed: 740, damage: 1
                }, aim + lane * 0.04);
            }
        } else {
            // Final phase: a dense radial bloom with five aimed comets through it.
            weapon?.shootRadialWithData(this, 30, {
                width: 17, height: 17, color: 0xff70a8, speed: 405, damage: 1
            }, this._patternRotation);
            for (let lane = -3; lane <= 3; lane++) {
                weapon?.shootWithData(this, {
                    width: 15, height: 15, color: 0xffe77a, speed: 760, damage: 1
                }, aim + lane * 0.09);
            }
            this._patternRotation -= Math.PI / 14;
        }
    }

    private shootBossPattern() {
        const weapon = this.getComponent(Weapon);
        const pattern = this.scene.registry.get('bossPatternPhase') as number ?? 0;
        const player = this.scene.registry.get('player') as Phaser.GameObjects.Sprite | undefined;
        const aimedAngle = player
            ? Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y)
            : Math.PI / 2;

        switch (pattern) {
            case 0: { // Twin flower rings: one slow wall and one faster weave.
                weapon?.shootRadialWithData(this, 12, {
                    width: 22, height: 22, color: 0x65ddff, speed: 255, damage: 1
                }, this._patternRotation);
                weapon?.shootRadialWithData(this, 7, {
                    width: 15, height: 15, color: 0xff70d8, speed: 535, damage: 1
                }, -this._patternRotation * 1.7);
                this._patternRotation += Math.PI / 13;
                break;
            }
            case 1: { // Fan aimed at the player's current position.
                for (let lane = -4; lane <= 4; lane++) {
                    weapon?.shootWithData(this, {
                        width: 20, height: 20, color: 0xff9a54, speed: 590, damage: 1
                    }, aimedAngle + lane * 0.105);
                }
                break;
            }
            case 2: { // Two counter-rotating spiral ribbons.
                const spiral = this._patternRotation + this._bossIndex * 0.12;
                weapon?.shootRadialWithData(this, 14, {
                    width: 18, height: 18, color: 0xb28cff, speed: 315, damage: 1
                }, spiral);
                weapon?.shootRadialWithData(this, 8, {
                    width: 14, height: 14, color: 0x62ffe0, speed: 455, damage: 1
                }, spiral + Math.PI / 8);
                this._patternRotation += Math.PI / 9;
                break;
            }
            case 3: { // Dense curtain with alternating fast and slow lanes.
                for (let lane = -5; lane <= 5; lane++) {
                    weapon?.shootWithData(this, {
                        width: 17, height: 17, color: lane % 2 === 0 ? 0xffe16b : 0xff68ba,
                        speed: lane % 2 === 0 ? 565 : 295, damage: 1
                    }, Math.PI / 2 + lane * 0.075);
                }
                break;
            }
            default: { // Crossfire: an aimed burst nested inside a rotating ring.
                for (let lane = -2; lane <= 2; lane++) {
                    weapon?.shootWithData(this, {
                        width: 20, height: 20, color: 0xff678d, speed: 625, damage: 1
                    }, aimedAngle + lane * 0.13);
                }
                weapon?.shootRadialWithData(this, 10, {
                    width: 15, height: 15, color: 0x6fdcff, speed: 275, damage: 1
                }, this._patternRotation);
                this._patternRotation -= Math.PI / 11;
                break;
            }
        }
    }

    private shootBeam(angle: number = Math.PI / 2) {
        this.getComponent(Weapon)?.shootBeam(
            this,
            {
                width: 18,
                height: 220,
                color: 0xff3333,
                speed: 620,
                damage: 1
            },
            angle
        );
    }

    private shootVariantBullet(angle: number = this.rotation) {
        this.getComponent(Weapon)?.shootWithData(this, this.getBulletData(), angle);
    }

    private getBulletData(): BulletData {
        if (this._type === 'diver')
            return {...this._bulletData, color: 0x55ccff, speed: 620};
        if (this._type === 'fast')
            return {...this._bulletData, color: 0xff55ff};
        return {...this._bulletData, color: 0xffaa33};
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime)

        // Destroy entities when out of screen
        if (this.y > this.scene.cameras.main.height + this.displayHeight) {
            this.disable();
        }

        if (this._type === 'boss') {
            this._elapsedTime += deltaTime / 1000;
            if (this._isAstralBoss) {
                const dashCycle = (this._elapsedTime + this._bossIndex * 0.4) % 4.2;
                const dash = dashCycle < 0.48
                    ? Math.sin(dashCycle / 0.48 * Math.PI) * this.scene.cameras.main.width * 0.16
                    : 0;
                const dashDirection = Math.sin(this._bossIndex + 1) < 0 ? -1 : 1;
                this.x = this._baseX
                    + Math.sin(this._elapsedTime * 1.35) * this.scene.cameras.main.width * 0.34
                    + dash * dashDirection;
                this.y = 205 + Math.sin(this._elapsedTime * 2.1) * 88;
                this.setScale(4.5 + Math.sin(this._elapsedTime * 8) * 0.12);
                this.setAngle(Math.sin(this._elapsedTime * 3.2) * 9);
            } else {
                this.y = 130 + Math.sin(this._elapsedTime * 1.1 + this._bossIndex * 0.3) * 12;
                this.x = this._baseX + Math.sin(this._elapsedTime * 1.2 + this._bossIndex * 0.22) * 90;
            }
            this.x = Phaser.Math.Clamp(this.x, this.displayWidth / 2, this.scene.cameras.main.width - this.displayWidth / 2);
            this.y = Phaser.Math.Clamp(this.y, this._isAstralBoss ? 130 : 118, this._isAstralBoss ? 320 : 180);
        } else if (this._type === 'strafer') {
            this._elapsedTime += deltaTime / 1000;
            this.x += Math.sin(this._elapsedTime * 2) * 0.18 * deltaTime;
        } else if (this._type === 'diver') {
            this.x += this._horizontalDirection * 0.16 * deltaTime;
        } else {
            this.x += this._horizontalDirection * 0.08 * deltaTime;
        }

        if (!this.isTinted && this._type !== 'boss') {
            const fallSpeed = this._type === 'fast' ? 0.48 : this._type === 'diver' ? 0.38 : 0.28;
            this.getComponent(Movement)?.moveVertically(this, deltaTime * fallSpeed);
        } else {
            this.getComponent(Movement)?.moveVertically(this, deltaTime * 0.1);
        }
    }
}
