import { computePaint, createPaintTable } from '../colors';
import { mockGroupStatuses, mockRegionStatuses } from '../mock-status';

const base = {
  groupStatuses: mockGroupStatuses(),
  regionStatuses: mockRegionStatuses(),
  enabledOptionalGroups: [] as const,
  selectedRegion: null,
  selectionMode: 'detail' as const,
  pickedGroups: [] as const,
  accentHex: '#1f6feb',
};

describe('computePaint', () => {
  it('colors every region of a group identically in groups mode', () => {
    const table = createPaintTable();
    computePaint(table, { ...base, mode: 'groups' });
    expect(table.chest_upper.color.getHex()).toBe(table.chest_mid.color.getHex());
    expect(table.chest_mid.color.getHex()).toBe(table.chest_lower.color.getHex());
  });

  it('renders disabled optional groups neutral and enabled ones colored', () => {
    const off = createPaintTable();
    computePaint(off, { ...base, mode: 'groups' });
    const on = createPaintTable();
    computePaint(on, { ...base, mode: 'groups', enabledOptionalGroups: ['neck'] });
    expect(off.neck_flexors.color.getHex()).toBe(off.hip_flexors.color.getHex());
    expect(on.neck_flexors.color.getHex()).not.toBe(off.neck_flexors.color.getHex());
  });

  it('dims the unselected regions and brightens the selected group when something is selected', () => {
    const none = createPaintTable();
    computePaint(none, { ...base, mode: 'groups' });
    const sel = createPaintTable();
    computePaint(sel, { ...base, mode: 'groups', selectedRegion: 'quads_vasti' });
    expect(sel.lats.color.r).toBeLessThan(none.lats.color.r + 1e-6);
    expect(sel.quads_rf.color.getHex()).toBe(sel.quads_vasti.color.getHex());
    const lum = (c: { r: number; g: number; b: number }) => c.r + c.g + c.b;
    expect(lum(sel.quads_vasti.color)).toBeGreaterThan(lum(none.quads_vasti.color));
  });

  it('applies provisional opacity', () => {
    const table = createPaintTable();
    computePaint(table, { ...base, mode: 'groups' });
    const provisionalGroup = Object.entries(base.groupStatuses).find(([, s]) => s.provisional)![0];
    const region = Object.keys(table).find((r) => r.startsWith(provisionalGroup))!;
    expect(table[region as keyof typeof table].opacity).toBeCloseTo(0.6);
  });
});
