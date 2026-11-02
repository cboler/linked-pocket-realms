import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MonsterEntity } from '../../core/models/domain.models';
import { AdjectiveVisualProfile, resolveMonsterVisualProfile } from './enemy-visual-resolver';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'g[app-enemy-sprite]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './enemy-sprite.html',
  styleUrl: './enemy-sprite.scss',
  host: {
    '[attr.data-archetype]': 'profile().archetype',
    '[attr.data-particles]': 'profile().particles',
    '[class.selected]': 'isSelected()',
    '[class.is-boss]': 'monster().isBoss',
    '[class.enemy-sprite-host]': 'true',
  },
})
export class EnemySpriteComponent {
  readonly monster = input.required<MonsterEntity>();
  readonly roomTheme = input<string>('default');
  readonly isSelected = input<boolean>(false);
  readonly Math = Math;

  readonly profile = computed<AdjectiveVisualProfile>(() =>
    resolveMonsterVisualProfile(this.monster(), this.roomTheme()),
  );

  readonly hpPct = computed<number>(() => {
    const m = this.monster();
    return Math.max(0, Math.min(100, (m.hp / (m.maxHp || 1)) * 100));
  });

  readonly hpColor = computed<string>(() => {
    const pct = this.hpPct();
    if (pct > 50) return '#22c55e';
    if (pct > 25) return '#eab308';
    return '#ef4444';
  });
}
