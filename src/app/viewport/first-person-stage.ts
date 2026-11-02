import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import {
  BazaarListing,
  CompassDirection,
  EquipmentItem,
  MonsterBodyPart,
  MonsterEntity,
  NetworkPeerVisitor,
  RoomExit,
  TravelerEcho,
} from '../core/models/domain.models';
import { LegendRegistryService } from '../core/services/legend-registry.service';
import { MudEngineService } from '../core/services/mud-engine.service';
import { EnemySpriteComponent } from './enemy-sprite/enemy-sprite';

@Component({
  selector: 'app-first-person-stage',
  standalone: true,
  imports: [CommonModule, EnemySpriteComponent],
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
  readonly selectedBazaarListing = signal<BazaarListing | null>(null);
  readonly selectedPeer = signal<NetworkPeerVisitor | null>(null);

  selectBazaarListing(listing: BazaarListing): void {
    this.selectedBazaarListing.set(listing);
    this.selectedMonster.set(null);
    this.selectedItem.set(null);
    this.selectedEcho.set(null);
    this.selectedPeer.set(null);
  }

  buySelectedListing(): void {
    const listing = this.selectedBazaarListing();
    if (listing) {
      this.engine.buyBazaarItem(listing.id);
      this.selectedBazaarListing.set(null);
    }
  }

  selectPeer(peer: NetworkPeerVisitor): void {
    this.selectedPeer.set(peer);
    this.selectedMonster.set(null);
    this.selectedItem.set(null);
    this.selectedEcho.set(null);
    this.selectedBazaarListing.set(null);
  }

  sayHelloToPeer(peer: NetworkPeerVisitor): void {
    this.engine.sendPeerChat(`Hail, ${peer.playerName}! May the gate guide us.`);
  }

  getMonsterTransform(index: number, total: number): string {
    const count = Math.max(1, total);
    const spacing = 150;
    const startX = 400 - (count * spacing) / 2 + 5;
    const posX = startX + index * spacing;
    return `translate(${posX}, 180)`;
  }

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

  // Thematic keywords from active address and room (Word 1 Atmosphere visual shader + Seam Synthesis)
  readonly roomTheme = computed<string>(() => {
    const room = this.currentRoom();
    if (!room) return 'default';
    if (room.isSynthesisSeam) return 'seam-synthesis';
    if (room.isOvergrowth) return 'overgrowth';

    const title = room.title ?? '';
    const atmo = room.atmosphereEffect ?? '';
    const addr = this.engine.activeGateAddress();

    if (
      atmo.includes('Scorching') ||
      title.includes('Scorching') ||
      addr.atmosphere === 'Scorching'
    )
      return 'scorching';
    if (
      atmo.includes('Crystalline') ||
      title.includes('Crystalline') ||
      addr.atmosphere === 'Crystalline'
    )
      return 'crystalline';
    if (
      atmo.includes('Tempestuous') ||
      title.includes('Tempestuous') ||
      addr.atmosphere === 'Tempestuous'
    )
      return 'tempestuous';
    if (
      atmo.includes('Aetherial') ||
      title.includes('Aetherial') ||
      addr.atmosphere === 'Aetherial'
    )
      return 'aetherial';
    if (atmo.includes('Abyssal') || title.includes('Abyssal') || addr.atmosphere === 'Abyssal')
      return 'abyssal';
    if (atmo.includes('Silent') || title.includes('Silent') || addr.atmosphere === 'Silent')
      return 'silent';
    if (atmo.includes('Blighted') || title.includes('Blighted') || addr.atmosphere === 'Blighted')
      return 'blighted';
    if (atmo.includes('Gilded') || title.includes('Gilded') || addr.atmosphere === 'Gilded')
      return 'gilded';
    if (title.includes('Clockwork') || addr.theme === 'Clockwork') return 'clockwork';
    if (title.includes('Fungal') || addr.theme === 'Fungal') return 'fungal';
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
    this.engine.selectTargetMonster(monster.id);
  }

  selectAnatomicalPart(part: MonsterBodyPart): void {
    if (part.isSevered) return;
    const currentPartId = this.engine.selectedTargetPartId();
    this.engine.selectTargetPart(currentPartId === part.id ? null : part.id);
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
    const partId = this.engine.selectedTargetPartId();
    this.engine.dispatchCommandIntent({
      type: 'ATTACK',
      rawInput: `attack ${monster.name.toLowerCase()}`,
      source: 'HUD',
      targetId: monster.id,
      payload: partId ? { targetPartId: partId } : undefined,
    });
  }

  castPrimarySkill(monster: MonsterEntity): void {
    const skill = this.engine.character().activeSkills[0];
    const key = skill ? skill.commandKey : 'sunder';
    const partId = this.engine.selectedTargetPartId();
    this.engine.dispatchCommandIntent({
      type: 'CAST_SKILL',
      rawInput: `cast ${key} ${monster.name.toLowerCase()}`,
      source: 'HUD',
      skillKey: key,
      targetId: monster.id,
      payload: partId ? { targetPartId: partId } : undefined,
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
