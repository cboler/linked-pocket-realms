import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import {
  CompassDirection,
  EquipmentItem,
  MonsterEntity,
  RoomExit,
  TravelerEcho,
} from '../core/models/domain.models';
import { LegendRegistryService } from '../core/services/legend-registry.service';
import { MudEngineService } from '../core/services/mud-engine.service';

@Component({
  selector: 'app-first-person-stage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './first-person-stage.html',
  styleUrl: './first-person-stage.scss',
})
export class FirstPersonStageComponent {
  readonly engine = inject(MudEngineService);
  readonly legendRegistry = inject(LegendRegistryService);
  readonly Math = Math;

  readonly selectedMonster = signal<MonsterEntity | null>(null);
  readonly selectedItem = signal<EquipmentItem | null>(null);
  readonly selectedEcho = signal<TravelerEcho | null>(null);

  // Directional Compass & Relative Exits
  readonly playerFacing = computed<CompassDirection>(() => this.engine.playerFacing());
  readonly currentRoom = computed(() => this.engine.currentRoom());

  private readonly compassOrder: CompassDirection[] = ['N', 'E', 'S', 'W'];

  private getRelativeDirection(offset: number): CompassDirection {
    const idx = this.compassOrder.indexOf(this.playerFacing());
    const targetIdx = (idx + offset + 4) % 4;
    return this.compassOrder[targetIdx];
  }

  readonly dirAhead = computed<CompassDirection>(() => this.playerFacing());
  readonly dirLeft = computed<CompassDirection>(() => this.getRelativeDirection(-1));
  readonly dirRight = computed<CompassDirection>(() => this.getRelativeDirection(1));
  readonly dirBehind = computed<CompassDirection>(() => this.getRelativeDirection(2));

  readonly exitAhead = computed<RoomExit | undefined>(() => {
    return this.currentRoom()?.exits.find((e) => e.direction === this.dirAhead());
  });

  readonly exitLeft = computed<RoomExit | undefined>(() => {
    return this.currentRoom()?.exits.find((e) => e.direction === this.dirLeft());
  });

  readonly exitRight = computed<RoomExit | undefined>(() => {
    return this.currentRoom()?.exits.find((e) => e.direction === this.dirRight());
  });

  readonly exitBehind = computed<RoomExit | undefined>(() => {
    return this.currentRoom()?.exits.find((e) => e.direction === this.dirBehind());
  });

  // Thematic keywords from active address and room
  readonly roomTheme = computed<string>(() => {
    const title = this.currentRoom()?.title ?? '';
    const addr = this.engine.activeGateAddress();
    if (this.currentRoom()?.isOvergrowth) return 'overgrowth';
    if (title.includes('Clockwork') || addr.theme === 'Clockwork') return 'clockwork';
    if (title.includes('Fungal') || addr.theme === 'Fungal') return 'fungal';
    if (title.includes('Scorching') || addr.atmosphere === 'Scorching') return 'scorching';
    if (title.includes('Crystalline') || addr.atmosphere === 'Crystalline') return 'crystalline';
    if (title.includes('Abyssal') || addr.atmosphere === 'Abyssal') return 'abyssal';
    if (title.includes('Monolithic') || addr.theme === 'Monolithic') return 'monolithic';
    return 'default';
  });

  // Hotkey listener for tactile W/A/S/D / arrow / Q/E navigation
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    const activeEl = document.activeElement;
    if (
      activeEl instanceof HTMLInputElement ||
      activeEl instanceof HTMLTextAreaElement ||
      activeEl?.getAttribute('contenteditable') === 'true'
    ) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'w' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.stepForward();
    } else if (key === 's' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.stepBack();
    } else if (key === 'a' || event.key === 'ArrowLeft' || key === 'q') {
      event.preventDefault();
      this.turnLeft();
    } else if (key === 'd' || event.key === 'ArrowRight' || key === 'e') {
      event.preventDefault();
      this.turnRight();
    }
  }

  turnLeft(): void {
    this.engine.turnLeft();
  }

  turnRight(): void {
    this.engine.turnRight();
  }

  stepForward(): void {
    if (this.exitAhead()) {
      this.engine.stepForward();
    } else {
      this.engine.appendFeed(
        'NARRATIVE',
        `A solid wall blocks forward movement (${this.playerFacing()}). Turn to check other doorways.`,
      );
    }
  }

  stepBack(): void {
    if (this.exitBehind()) {
      this.engine.stepBack();
    } else {
      this.engine.turnAround();
    }
  }

  onLeftExitClick(): void {
    const exit = this.exitLeft();
    if (exit) {
      this.engine.moveDirection(exit.direction);
    }
  }

  onRightExitClick(): void {
    const exit = this.exitRight();
    if (exit) {
      this.engine.moveDirection(exit.direction);
    }
  }

  onAheadExitClick(): void {
    this.stepForward();
  }

  selectMonster(monster: MonsterEntity): void {
    this.selectedMonster.set(monster);
    this.selectedItem.set(null);
    this.selectedEcho.set(null);
    this.engine.selectedTargetId.set(monster.id);
  }

  selectItem(item: EquipmentItem): void {
    this.selectedItem.set(item);
    this.selectedMonster.set(null);
    this.selectedEcho.set(null);
  }

  selectEcho(echo: TravelerEcho): void {
    this.selectedEcho.set(echo);
    this.selectedMonster.set(null);
    this.selectedItem.set(null);
  }

  attackMonster(monster: MonsterEntity): void {
    this.engine.dispatchCommandIntent({
      type: 'ATTACK',
      rawInput: `attack ${monster.name.toLowerCase()}`,
      source: 'HUD',
      targetId: monster.id,
    });
  }

  castPrimarySkill(monster: MonsterEntity): void {
    const skill = this.engine.character().activeSkills[0];
    const key = skill ? skill.commandKey : 'sunder';
    this.engine.dispatchCommandIntent({
      type: 'CAST_SKILL',
      rawInput: `cast ${key} ${monster.name.toLowerCase()}`,
      source: 'HUD',
      skillKey: key,
      targetId: monster.id,
    });
  }

  inspectTarget(id: string): void {
    this.engine.dispatchCommandIntent({
      type: 'INSPECT',
      rawInput: `inspect ${id}`,
      source: 'HUD',
      targetId: id,
    });
  }

  takeItem(item: EquipmentItem): void {
    this.engine.dispatchCommandIntent({
      type: 'TAKE_ITEM',
      rawInput: `take ${item.name.toLowerCase()}`,
      source: 'HUD',
      targetId: item.id,
    });
    this.selectedItem.set(null);
  }

  pruneCurrentRoom(): void {
    this.engine.dispatchCommandIntent({
      type: 'PRUNE_ROOM',
      rawInput: '@prune',
      source: 'HUD',
      targetId: this.currentRoom()?.id,
    });
  }

  barterItem(item: EquipmentItem): void {
    const echo = this.currentRoom()?.travelerEcho;
    if (echo) {
      this.engine.dispatchCommandIntent({
        type: 'BARTER_ECHO',
        rawInput: `barter ${item.name.toLowerCase()}`,
        source: 'HUD',
        targetId: echo.id,
        payload: { itemId: item.id },
      });
    }
  }
}
