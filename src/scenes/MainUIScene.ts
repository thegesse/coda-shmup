import {GameObjects, Scenes, Scene} from "phaser";
import Health from "../components/Health.ts";
import Player from "../entities/Player.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class MainUIScene extends Scene {
    private _playerHealthBar: GameObjects.Rectangle;
    private _playerHealthText: GameObjects.Text;
    private _scoreText: GameObjects.BitmapText;
    private _bossHealthBar: GameObjects.Rectangle;
    private _bossHealthText: GameObjects.Text;
    private _hudWidth = 220;
    private _bossWidth = 520;

    constructor() {
        super(GameConstants.SceneKeys.MAIN_UI);
    }

    // noinspection JSUnusedGlobalSymbols
    init() {
        this.game.events.on(GameConstants.Events.PLAYER_SPAWNED_EVENT, this.onPlayerSpawned, this);
        this.registry.events.on(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onPlayerScoreChanged, this);
        this.registry.events.on('changedata-bossHealth', this.onBossHealthChanged, this);
        this.registry.events.on('changedata-bossPatternPhase', this.onBossPhaseChanged, this);

        this.events.once(Scenes.Events.SHUTDOWN, () => {
            this.game.events.off(GameConstants.Events.PLAYER_SPAWNED_EVENT, this.onPlayerSpawned, this);
            this.registry.events.off(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onPlayerScoreChanged, this);
            this.registry.events.off('changedata-bossHealth', this.onBossHealthChanged, this);
            this.registry.events.off('changedata-bossPatternPhase', this.onBossPhaseChanged, this);
        }, this);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        const width = this.scale.width;
        const scoreX = width - 52;
        let scoreStr: string = "".padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        if (this.registry.has(RegistryConstants.Keys.PLAYER_SCORE))
            scoreStr = this.registry.get(RegistryConstants.Keys.PLAYER_SCORE).toString()
                .padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        const panel = this.add.graphics().setDepth(50);
        panel.fillStyle(0x100d2a, 0.78);
        panel.fillRoundedRect(26, 28, 300, 112, 18);
        panel.lineStyle(2, 0x71eaff, 0.7);
        panel.strokeRoundedRect(26, 28, 300, 112, 18);
        panel.fillStyle(0x100d2a, 0.78);
        panel.fillRoundedRect(scoreX - 226, 28, 200, 112, 18);
        panel.lineStyle(2, 0xff79db, 0.7);
        panel.strokeRoundedRect(scoreX - 226, 28, 200, 112, 18);

        this.add.text(48, 42, 'VITALS', {fontFamily: 'future', fontSize: '18px', color: '#8ffcff'}).setDepth(51);
        this.add.text(48, 103, 'LIFE', {fontFamily: 'future', fontSize: '13px', color: '#d6d4ff'}).setDepth(51);
        this.add.rectangle(104, 112, this._hudWidth, 12, 0x3b315d).setOrigin(0, 0.5).setDepth(51);
        this._playerHealthBar = this.add.rectangle(104, 112, this._hudWidth, 8, 0x6cf7c8).setOrigin(0, 0.5).setDepth(52);
        this._playerHealthText = this.add.text(322, 101, '100%', {fontFamily: 'future', fontSize: '16px', color: '#ffffff'}).setOrigin(1, 0).setDepth(51);

        this.add.text(scoreX - 204, 42, 'SCORE', {fontFamily: 'future', fontSize: '18px', color: '#ff9de8'}).setDepth(51);
        this._scoreText = this.add.bitmapText(scoreX - 42, 88, 'future-bmp', scoreStr, 28).setOrigin(1, 0.5).setTint(0xffffff).setDepth(51);

        const bossX = width / 2 - this._bossWidth / 2;
        const bossName = Number(this.registry.get('bossSelection') ?? 0) === 1
            ? 'CAFFEINE COMET'
            : 'MOONLIT WARDEN';
        this.add.text(width / 2, 34, `B O S S   /   ${bossName}`, {
            fontFamily: 'future', fontSize: '18px', color: '#ffc4f2'
        }).setOrigin(0.5, 0).setDepth(51);
        this.add.rectangle(bossX, 68, this._bossWidth, 12, 0x3b315d).setOrigin(0, 0.5).setDepth(51);
        this._bossHealthBar = this.add.rectangle(bossX, 68, this._bossWidth, 8, 0xff72c6).setOrigin(0, 0.5).setDepth(52);
        this._bossHealthText = this.add.text(width / 2, 88, 'PHASE 01  •  308 / 308', {
            fontFamily: 'future', fontSize: '13px', color: '#ddd8ff'
        }).setOrigin(0.5, 0).setDepth(51);

        const defaultBossHealth = Number(this.registry.get('bossSelection') ?? 0) === 1 ? 308 : 484;
        this.updateBossHealth(
            Number(this.registry.get('bossHealth') ?? defaultBossHealth),
            Number(this.registry.get('bossMaxHealth') ?? defaultBossHealth)
        );

        this.scene.bringToTop();

        console.log("MainUIScene created");
    }

    private onPlayerScoreChanged(_: any, value: number) {
        const scoreStr: string = value.toString().padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        this._scoreText.setText(scoreStr);
    }

    private onPlayerSpawned(player: Player) {
        const health = player.getComponent(Health);
        this.updatePlayerHealth(health?.current ?? 0, health?.max ?? 1);

        health?.on(Health.CHANGE_EVENT, (current: number) => {
            this.updatePlayerHealth(current, health.max);
        }, this);
    }

    private onBossHealthChanged(_: any, value: number) {
        const max = Number(this.registry.get('bossMaxHealth') ?? value);
        this.updateBossHealth(Number(value), max);
    }

    private onBossPhaseChanged() {
        this.updateBossHealth(
            Number(this.registry.get('bossHealth') ?? 0),
            Number(this.registry.get('bossMaxHealth') ?? 1)
        );
    }

    private updatePlayerHealth(current: number, max: number) {
        const percentage = max > 0 ? Math.round(current / max * 100) : 0;
        this._playerHealthBar.setDisplaySize(this._hudWidth * percentage / 100, 8);
        this._playerHealthText.setText(`${percentage}%`);

        if (percentage <= 25)
            this._playerHealthBar.setFillStyle(0xff5555);
        else if (percentage <= 50)
            this._playerHealthBar.setFillStyle(0xffaa55);
        else
            this._playerHealthBar.setFillStyle(0x55cc55);
    }

    private updateBossHealth(current: number, max: number) {
        const percentage = max > 0 ? Math.max(0, current / max) : 0;
        this._bossHealthBar.setDisplaySize(this._bossWidth * percentage, 8);
        const phase = Number(this.registry.get('bossPatternPhase') ?? 0) + 1;
        const phaseNames = Number(this.registry.get('bossSelection') ?? 0) === 1
            ? ['ESPRESSO FAN', 'GRAVITY BREW', 'TWIN SPIRAL', 'GREEN COMET', 'LAST CALL']
            : ['BLOOM', 'SEEKER', 'SPIRAL', 'CURTAIN', 'CROSSFIRE'];
        this._bossHealthText.setText(`PHASE 0${phase}  /  ${phaseNames[phase - 1] ?? 'FINAL'}  •  ${current} / ${max}`);

        if (percentage <= 0.25)
            this._bossHealthBar.setFillStyle(0xff5555);
        else if (percentage <= 0.5)
            this._bossHealthBar.setFillStyle(0xffaa55);
        else
            this._bossHealthBar.setFillStyle(0xff55aa);
    }
}
