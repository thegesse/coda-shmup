import {BulletData} from "../gameData/BulletData.ts";

export default class Bullet extends Phaser.GameObjects.Rectangle {
    private _arcadeBody: Phaser.Physics.Arcade.Body;

    private _damage: number = 0;

    public get damage(): number {
        return this._damage;
    }

    public init() {
        this.scene.physics.add.existing(this);

        this._arcadeBody = this.body as Phaser.Physics.Arcade.Body;
        this._arcadeBody.allowGravity = false;
        this._arcadeBody.setFriction(0, 0);
    }

    public enable(x: number, y: number, velocityX: number, velocityY: number, data: BulletData) {
        this.setPosition(x, y);
        this.setSize(data.width, data.height);
        this.setOrigin(0.5);
        this.setFillStyle(data.color).setStrokeStyle(Math.max(1, Math.min(data.width, data.height) * 0.12), 0xffffff, 0.8);
        this.setBlendMode(Phaser.BlendModes.ADD);

        this.scene.physics.world.add(this._arcadeBody);
        this.setActive(true);
        this.setVisible(true);

        this._arcadeBody.setVelocity(velocityX, velocityY);
        this._damage = data.damage;

        // Rotate the bullet to face the direction it's moving
        this.setRotation(this._arcadeBody.velocity.angle());

        // Maths way
        // this.setRotation(Math.atan2(velocityY, velocityX));

        // Long laser hitboxes follow their visible shape; compact danmaku stay forgiving circles.
        if (Math.max(data.width, data.height) / Math.min(data.width, data.height) >= 5) {
            this._arcadeBody.setSize(data.width, data.height);
        } else {
            this._arcadeBody.setCircle(Math.max(data.width, data.height) / 2);
        }
    }

    public disable() {
        this.scene.physics.world.disableBody(this._arcadeBody);
        this.setActive(false);
        this.setVisible(false);
    }

    update(timeSinceLaunch: number, deltaTime: number) {
        super.update(timeSinceLaunch, deltaTime);

        // Bullets can now fly in any direction: recycle them when they leave the screen on any side
        const camera = this.scene.cameras.main;
        if (this.x < -this.displayWidth || this.x > camera.width + this.displayWidth
            || this.y < -this.displayHeight || this.y > camera.height + this.displayHeight) {
            this.disable();
        }
    }
}
