import type {BulletData} from "./BulletData.ts";

export type MiniBossSheet = {
    spreadshot: {
        spread: number;
        angle: number;
        num_bullets: number;
        fire_delay_min: number;
        fire_delay_max: number;
        animation_frame_rate: number;
        projectile: BulletData;
    };
    miniboss: {
        health: number;
        speed: number;
        movement_pattern: 'sine_wave';
        wave_amplitude: number;
        wave_frequency: number;
        scale: number;
        orientation_degrees: number;
        max_damage_per_hit: number;
        tinted_speed_multiplier: number;
    };
};
