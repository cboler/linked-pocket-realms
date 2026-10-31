import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CompassDirection, ExitDirection, RoomNode } from '../../core/models/domain.models';
import { LegendRegistryService } from '../../core/services/legend-registry.service';
import { MudEngineService } from '../../core/services/mud-engine.service';
import { TransportService } from '../../core/services/transport.service';

export interface CartographyNode {
  room: RoomNode;
  visited: boolean;
  adjacentRumor: boolean;
  glyph: string;
  colorHex: string;
  heatmapColor: string;
  visitorNames: string[];
  sensoryPreview: string;
}

export interface CartographyEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isSecret: boolean;
  isLocked: boolean;
  isSynthesisSeam: boolean;
  isRiftPortal?: boolean;
}

@Component({
  selector: 'app-node-map-graph',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './node-map-graph.html',
  styleUrl: './node-map-graph.scss',
})
export class NodeMapGraphComponent {
  readonly engine = inject(MudEngineService);
  readonly legendRegistry = inject(LegendRegistryService);
  readonly transport = inject(TransportService);

  readonly isMiniMap = input<boolean>(false);
  readonly digDirectionSelected = output<ExitDirection>();
  readonly nodeSelected = output<RoomNode>();

  readonly hoveredMapNode = signal<CartographyNode | null>(null);

  readonly visibleCartographyNodes = computed<CartographyNode[]>(() => {
    const allRooms = this.engine.rooms();
    const char = this.engine.character();
    const visitedSet = new Set(char.visitedRoomIds);
    const role = this.engine.perspective();
    const visitors = this.transport.activeVisitorsList();
    const metrics = this.engine.telemetry().roomMetrics;
    const heatMode = this.engine.heatmapMode();
    const per = this.engine.effectiveAttributes().PER;

    const adjacentSet = new Set<string>();
    for (const r of allRooms) {
      if (visitedSet.has(r.id)) {
        for (const ex of r.exits) {
          if (!ex.isSecret || per >= 12 || role === 'ARCHITECT') {
            adjacentSet.add(ex.targetRoomId);
          }
        }
      }
    }

    return allRooms
      .filter((r) => {
        if (role === 'ARCHITECT' || role === 'SPECTATOR') return true;
        return visitedSet.has(r.id) || adjacentSet.has(r.id);
      })
      .map((r) => {
        const visited = visitedSet.has(r.id);
        const adjacentRumor = !visited && adjacentSet.has(r.id);
        const leg = this.legendRegistry.resolveEntry(r.legendType, r.customLegendId);
        const roomVisitors = visitors
          .filter((v) => v.currentRoomId === r.id)
          .map((v) => v.playerName);
        const m = metrics[r.id];
        let heatVal = 0;
        if (m) {
          if (heatMode === 'LETHALITY') heatVal = Math.min(1, m.playerDeaths / 4);
          else if (heatMode === 'TRAFFIC') heatVal = Math.min(1, m.visitorCount / 15);
          else if (heatMode === 'TIME_SPENT') heatVal = Math.min(1, m.totalTimeSpentMs / 120000);
          else if (heatMode === 'LOOT') heatVal = Math.min(1, m.lootExtractedCount / 6);
        }
        const heatmapColor = this.interpolateHeatColor(heatVal);

        const dangerLevel =
          r.legendType === 'elite-boss'
            ? 'Extreme (Boss)'
            : r.monsters.length > 0
              ? 'Elevated (Hostiles)'
              : r.legendType === 'safe-campfire'
                ? 'Safe Sanctuary'
                : 'Low';
        const sensoryPreview = visited
          ? `${r.title} • ${leg.label}`
          : `Danger: ${dangerLevel} | ${r.rumorSignal} (PER ${per} Scan)`;

        return {
          room: r,
          visited,
          adjacentRumor,
          glyph: visited || role !== 'EXPLORER' ? leg.glyph : '?',
          colorHex: visited || role !== 'EXPLORER' ? leg.colorHex : '#64748b',
          heatmapColor,
          visitorNames: roomVisitors,
          sensoryPreview,
        };
      });
  });

  readonly cartographyEdges = computed<CartographyEdge[]>(() => {
    const visibleNodes = this.visibleCartographyNodes();
    const nodeMap = new Map(visibleNodes.map((n) => [n.room.id, n.room]));
    const edges: CartographyEdge[] = [];
    const seen = new Set<string>();
    const role = this.engine.perspective();
    const per = this.engine.effectiveAttributes().PER;

    for (const n of visibleNodes) {
      for (const ex of n.room.exits) {
        if (ex.isSecret && role === 'EXPLORER' && per < 12) continue;
        const target = nodeMap.get(ex.targetRoomId);
        if (!target) continue;
        const pairKey = [n.room.id, target.id].sort().join('--');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        const isSynthesisSeam = Boolean(
          ex.isSynthesisSeam ||
          (!n.room.isOvergrowth && target.isOvergrowth) ||
          (n.room.isOvergrowth && !target.isOvergrowth),
        );

        const isRiftPortal = Boolean(
          ex.isRiftPortal || n.room.isRiftPortal || target.isRiftPortal,
        );

        edges.push({
          id: pairKey,
          x1: n.room.x,
          y1: n.room.y,
          x2: target.x,
          y2: target.y,
          isSecret: !!ex.isSecret,
          isLocked: !!ex.isLocked,
          isSynthesisSeam,
          isRiftPortal,
        });
      }
    }
    return edges;
  });

  readonly architectGhostDigDirections = computed<
    { direction: ExitDirection; label: string; x: number; y: number }[]
  >(() => {
    if (this.engine.perspective() !== 'ARCHITECT' || this.isMiniMap()) return [];
    const cur = this.engine.currentRoom();
    if (!cur) return [];
    const existingDirs = new Set(cur.exits.map((e) => e.direction));
    const offsets: { direction: ExitDirection; label: string; dx: number; dy: number }[] = [
      {
        direction: 'N',
        label: '+ Dig North',
        dx: cur.y < 120 ? 75 : 0,
        dy: cur.y < 120 ? -55 : -90,
      },
      { direction: 'S', label: '+ Dig South', dx: 0, dy: 90 },
      { direction: 'E', label: '+ Dig East', dx: 115, dy: 0 },
      { direction: 'W', label: '+ Dig West', dx: -115, dy: 0 },
    ];
    return offsets
      .filter((o) => !existingDirs.has(o.direction))
      .map((o) => ({
        direction: o.direction,
        label: o.label,
        x: Math.max(45, Math.min(895, cur.x + o.dx)),
        y: Math.max(28, Math.min(525, cur.y + o.dy)),
      }));
  });

  onNodeClick(room: RoomNode): void {
    const curRoom = this.engine.currentRoom();
    const exit = curRoom.exits.find((e) => e.targetRoomId === room.id);
    if (exit) {
      this.engine.moveDirection(exit.direction);
      if (this.engine.perspective() === 'ARCHITECT') {
        this.engine.selectedArchitectRoomId.set(room.id);
      }
      this.nodeSelected.emit(room);
      return;
    }
    if (this.engine.perspective() === 'ARCHITECT') {
      this.engine.selectedArchitectRoomId.set(room.id);
      this.engine.moveToRoom(room.id);
      this.nodeSelected.emit(room);
      return;
    }
    if (this.engine.character().visitedRoomIds.includes(room.id)) {
      this.engine.moveToRoom(room.id);
      this.nodeSelected.emit(room);
    }
  }

  openDigPopover(direction: ExitDirection): void {
    this.digDirectionSelected.emit(direction);
  }

  getFacingRotationAngle(facing: CompassDirection): number {
    switch (facing) {
      case 'N':
        return 0;
      case 'E':
        return 90;
      case 'S':
        return 180;
      case 'W':
        return 270;
      default:
        return 0;
    }
  }

  private interpolateHeatColor(ratio: number): string {
    if (ratio <= 0.05) return '#1e293b';
    if (ratio < 0.4) return '#0284c7';
    if (ratio < 0.7) return '#f59e0b';
    return '#ef4444';
  }
}
