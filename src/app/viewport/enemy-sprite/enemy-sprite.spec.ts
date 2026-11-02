import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MonsterEntity } from '../../core/models/domain.models';
import { EnemySpriteComponent } from './enemy-sprite';

@Component({
  standalone: true,
  imports: [EnemySpriteComponent],
  template: `
    <svg viewBox="0 0 800 480">
      <g
        app-enemy-sprite
        [monster]="testMonster"
        [roomTheme]="'scorching'"
        [isSelected]="selected"
      ></g>
    </svg>
  `,
})
class TestHostComponent {
  testMonster: MonsterEntity = {
    id: 'test-mob-1',
    templateId: 'brass-scuttler',
    name: 'Scorching Brass Scuttler',
    level: 7,
    isBoss: false,
    hp: 80,
    maxHp: 100,
    atk: 14,
    mitigationPct: 15,
    speed: 12,
    atbGauge: 50,
    element: 'Fire',
    weakness: 'Frost',
    statuses: [],
    adjectives: ['Scorching'],
    loreSnippet: 'A burning scuttler.',
    secretWeaknessHint: 'Vulnerable to frost.',
    lootTable: [],
  };
  selected = false;
}

describe('EnemySpriteComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  it('should render the enemy sprite with name, level, hp bar, and tactical badges', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const nameplate = root.querySelector('.monster-nameplate');
    expect(nameplate?.textContent).toContain('Scorching Brass Scuttler (Lv.7)');

    // Tactical Badges
    const badges = root.querySelectorAll('.tactical-badges-group text');
    expect(badges.length).toBeGreaterThan(0);
    const badgeTexts = Array.from(badges).map((b) => b.textContent?.trim());
    expect(badgeTexts).toContain('Scorching');

    // Threat shadow
    const threatEllipse = root.querySelector('ellipse[rx="60"]');
    expect(threatEllipse).toBeTruthy();

    // Archetype data attribute
    const spriteRoot = root.querySelector('.enemy-sprite-root');
    expect(spriteRoot?.getAttribute('data-archetype')).toBe('brass-scuttler');
    expect(spriteRoot?.getAttribute('data-particles')).toBe('embers');
  });

  it('should render boss concentric threat ring when isBoss is true', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    host.testMonster = {
      ...host.testMonster,
      name: 'Scorching Arch-Regent of the Deep Crypt',
      templateId: 'boss-arch-regent',
      isBoss: true,
      adjectives: ['Scorching', 'Boss'],
    };
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const bossRing = root.querySelector('.boss-threat-ring');
    expect(bossRing).toBeTruthy();

    const badges = root.querySelectorAll('.tactical-badges-group text');
    const badgeTexts = Array.from(badges).map((b) => b.textContent?.trim());
    expect(badgeTexts).toContain('BOSS');
  });
});
