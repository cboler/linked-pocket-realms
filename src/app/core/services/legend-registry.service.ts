import { Injectable, signal, computed } from '@angular/core';
import { CoreLegendType, LegendEntry, LegendRegistry } from '../models/domain.models';

const CORE_LEGEND_ENTRIES: Record<CoreLegendType, LegendEntry> = {
  'anchor-portal': {
    id: 'anchor-portal',
    classification: 'anchor-portal',
    glyph: '◈',
    label: 'Anchor Portal',
    colorHex: '#38bdf8',
    tooltipDescription: 'Chaos Gate nexus connecting Pocket Realms across browser instances.',
  },
  'safe-campfire': {
    id: 'safe-campfire',
    classification: 'safe-campfire',
    glyph: '♨',
    label: 'Safe Campfire',
    colorHex: '#34d399',
    tooltipDescription: 'Sanctuary node that restores HP, Stamina, and clears negative statuses.',
  },
  'elite-boss': {
    id: 'elite-boss',
    classification: 'elite-boss',
    glyph: '☠',
    label: 'Elite/Boss Chamber',
    colorHex: '#f87171',
    tooltipDescription: 'High-lethality chamber housing the Realm Boss and signed Relic drops.',
  },
  'puzzle-mechanism': {
    id: 'puzzle-mechanism',
    classification: 'puzzle-mechanism',
    glyph: '⚙',
    label: 'Puzzle/Mechanism',
    colorHex: '#c084fc',
    tooltipDescription: 'Interactive contraption or sealed lock governed by declarative triggers.',
  },
  'lore-terminal': {
    id: 'lore-terminal',
    classification: 'lore-terminal',
    glyph: '▤',
    label: 'Lore Terminal',
    colorHex: '#60a5fa',
    tooltipDescription: 'Data monolith containing archived memories and weakness hints.',
  },
  'treasure-vault': {
    id: 'treasure-vault',
    classification: 'treasure-vault',
    glyph: '❖',
    label: 'Treasure Vault',
    colorHex: '#fbbf24',
    tooltipDescription: 'Secured cache containing equipment, relics, or resource caches.',
  },
  'hazard-trap': {
    id: 'hazard-trap',
    classification: 'hazard-trap',
    glyph: '▲',
    label: 'Hazard/Trap',
    colorHex: '#fb923c',
    tooltipDescription: 'Environmental hazard node that inflicts elemental statuses on entry.',
  },
  'merchant-shrine': {
    id: 'merchant-shrine',
    classification: 'merchant-shrine',
    glyph: '⚖',
    label: 'Merchant/Shrine',
    colorHex: '#2dd4bf',
    tooltipDescription: 'Barter terminal or blessing altar for travelers.',
  },
  corridor: {
    id: 'corridor',
    classification: 'corridor',
    glyph: '·',
    label: 'Transit Hall',
    colorHex: '#94a3b8',
    tooltipDescription: 'Standard structural passage connecting major realm chambers.',
  },
  custom: {
    id: 'custom',
    classification: 'custom',
    glyph: '✦',
    label: 'Architect Custom Node',
    colorHex: '#f472b6',
    tooltipDescription: 'Custom symbol registered by this Pocket Realm Architect.',
    isCustom: true,
  },
};

@Injectable({
  providedIn: 'root',
})
export class LegendRegistryService {
  private readonly customEntriesMap = signal<Record<string, LegendEntry>>({});

  readonly registry = computed<LegendRegistry>(() => ({
    coreEntries: CORE_LEGEND_ENTRIES,
    customEntries: this.customEntriesMap(),
  }));

  readonly allLegendEntries = computed<LegendEntry[]>(() => {
    const core = Object.values(CORE_LEGEND_ENTRIES).filter((e) => e.classification !== 'custom');
    const custom = Object.values(this.customEntriesMap());
    return [...core, ...custom];
  });

  resolveEntry(classification: CoreLegendType, customLegendId?: string): LegendEntry {
    if (customLegendId && this.customEntriesMap()[customLegendId]) {
      return this.customEntriesMap()[customLegendId];
    }
    return CORE_LEGEND_ENTRIES[classification] ?? CORE_LEGEND_ENTRIES.corridor;
  }

  registerCustomEntry(entry: Omit<LegendEntry, 'classification' | 'isCustom'>): LegendEntry {
    const normalized: LegendEntry = {
      ...entry,
      classification: 'custom',
      isCustom: true,
    };
    this.customEntriesMap.update((prev) => ({
      ...prev,
      [normalized.id]: normalized,
    }));
    return normalized;
  }

  mergeHostCustomLegends(entries: LegendEntry[]): void {
    if (!entries || entries.length === 0) return;
    this.customEntriesMap.update((prev) => {
      const next = { ...prev };
      for (const entry of entries) {
        next[entry.id] = {
          ...entry,
          classification: 'custom',
          isCustom: true,
        };
      }
      return next;
    });
  }

  clearCustomEntries(): void {
    this.customEntriesMap.set({});
  }
}
