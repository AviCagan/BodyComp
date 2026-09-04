/**
 * Tiny procedural-geometry kit for the Phase 0 placeholder body. No three.js
 * dependency: plain typed arrays in, glTF-ready buffers out. Deterministic.
 */
export interface MeshData {
  positions: number[]; // xyz triples
  normals: number[]; // xyz triples, unit length
  indices: number[]; // triangle list
}

export type Vec3 = [number, number, number];

function pushVertex(m: MeshData, p: Vec3, n: Vec3) {
  m.positions.push(p[0], p[1], p[2]);
  m.normals.push(n[0], n[1], n[2]);
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** UV sphere, radius 1, centered at the origin. */
export function unitSphere(widthSegments = 20, heightSegments = 12): MeshData {
  const m: MeshData = { positions: [], normals: [], indices: [] };
  for (let iy = 0; iy <= heightSegments; iy++) {
    const v = iy / heightSegments;
    const theta = v * Math.PI;
    for (let ix = 0; ix <= widthSegments; ix++) {
      const u = ix / widthSegments;
      const phi = u * Math.PI * 2;
      const n: Vec3 = [-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)];
      pushVertex(m, n, n);
    }
  }
  const row = widthSegments + 1;
  for (let iy = 0; iy < heightSegments; iy++) {
    for (let ix = 0; ix < widthSegments; ix++) {
      const a = iy * row + ix;
      const b = a + row;
      if (iy !== 0) m.indices.push(a, b, a + 1);
      if (iy !== heightSegments - 1) m.indices.push(a + 1, b, b + 1);
    }
  }
  return m;
}

/**
 * Capsule along +Y: radius r, straight length `length` (total height = length + 2r), centered at
 * origin. Rings run top pole → top equator → bottom equator → bottom pole with the same
 * handedness as `unitSphere`, so triangles wind counter-clockwise seen from outside.
 */
export function capsule(r: number, length: number, radial = 20, capRings = 6): MeshData {
  const m: MeshData = { positions: [], normals: [], indices: [] };
  const half = length / 2;
  const rings: { y: number; rr: number; ny: number }[] = [];
  // top hemisphere: pole (t = π/2) down to the equator (t = 0)
  for (let i = capRings; i >= 0; i--) {
    const t = (i / capRings) * (Math.PI / 2);
    rings.push({ y: half + Math.sin(t) * r, rr: Math.cos(t) * r, ny: Math.sin(t) });
  }
  // bottom hemisphere: equator (t = 0) down to the pole (t = π/2)
  for (let i = 0; i <= capRings; i++) {
    const t = (i / capRings) * (Math.PI / 2);
    rings.push({ y: -half - Math.sin(t) * r, rr: Math.cos(t) * r, ny: -Math.sin(t) });
  }
  for (const ring of rings) {
    const nxz = Math.sqrt(Math.max(0, 1 - ring.ny * ring.ny));
    for (let ix = 0; ix <= radial; ix++) {
      const phi = (ix / radial) * Math.PI * 2;
      const cx = -Math.cos(phi);
      const cz = Math.sin(phi);
      pushVertex(m, [cx * ring.rr, ring.y, cz * ring.rr], normalize([cx * nxz, ring.ny, cz * nxz]));
    }
  }
  const row = radial + 1;
  const last = rings.length - 2;
  for (let iy = 0; iy <= last; iy++) {
    for (let ix = 0; ix < radial; ix++) {
      const a = iy * row + ix;
      const b = a + row;
      if (iy !== 0) m.indices.push(a, b, a + 1);
      if (iy !== last) m.indices.push(a + 1, b, b + 1);
    }
  }
  return m;
}

export interface Placement {
  /** center position */
  at: Vec3;
  /** per-axis scale (ellipsoid radii for a unit sphere; xz radius / y length multipliers for a capsule) */
  scale?: Vec3;
  /** rotation in degrees applied as X, then Y, then Z (intrinsic), before translation */
  rotate?: Vec3;
}

function rotMatrix(deg: Vec3): number[] {
  const [ax, ay, az] = deg.map((d) => (d * Math.PI) / 180) as Vec3;
  const cx = Math.cos(ax),
    sx = Math.sin(ax),
    cy = Math.cos(ay),
    sy = Math.sin(ay),
    cz = Math.cos(az),
    sz = Math.sin(az);
  // R = Rz * Ry * Rx
  return [
    cz * cy,
    cz * sy * sx - sz * cx,
    cz * sy * cx + sz * sx,
    sz * cy,
    sz * sy * sx + cz * cx,
    sz * sy * cx - cz * sx,
    -sy,
    cy * sx,
    cy * cx,
  ];
}

function mul(mat: number[], v: Vec3): Vec3 {
  return [
    mat[0]! * v[0] + mat[1]! * v[1] + mat[2]! * v[2],
    mat[3]! * v[0] + mat[4]! * v[1] + mat[5]! * v[2],
    mat[6]! * v[0] + mat[7]! * v[1] + mat[8]! * v[2],
  ];
}

/** Returns a transformed copy: scale (non-uniform, normals corrected), rotate, translate. */
export function place(base: MeshData, p: Placement): MeshData {
  const s = p.scale ?? [1, 1, 1];
  const R = rotMatrix(p.rotate ?? [0, 0, 0]);
  const out: MeshData = { positions: [], normals: [], indices: [...base.indices] };
  for (let i = 0; i < base.positions.length; i += 3) {
    const v: Vec3 = [base.positions[i]! * s[0], base.positions[i + 1]! * s[1], base.positions[i + 2]! * s[2]];
    const n0: Vec3 = normalize([base.normals[i]! / s[0], base.normals[i + 1]! / s[1], base.normals[i + 2]! / s[2]]);
    const rv = mul(R, v);
    const rn = mul(R, n0);
    out.positions.push(rv[0] + p.at[0], rv[1] + p.at[1], rv[2] + p.at[2]);
    out.normals.push(rn[0], rn[1], rn[2]);
  }
  return out;
}

/** Mirror across the YZ plane (x → −x), flipping winding so faces stay outward. */
export function mirrorX(m: MeshData): MeshData {
  const out: MeshData = { positions: [], normals: [], indices: [] };
  for (let i = 0; i < m.positions.length; i += 3) {
    out.positions.push(-m.positions[i]!, m.positions[i + 1]!, m.positions[i + 2]!);
    out.normals.push(-m.normals[i]!, m.normals[i + 1]!, m.normals[i + 2]!);
  }
  for (let i = 0; i < m.indices.length; i += 3) out.indices.push(m.indices[i]!, m.indices[i + 2]!, m.indices[i + 1]!);
  return out;
}

export function merge(parts: MeshData[]): MeshData {
  const out: MeshData = { positions: [], normals: [], indices: [] };
  for (const p of parts) {
    const offset = out.positions.length / 3;
    out.positions.push(...p.positions);
    out.normals.push(...p.normals);
    for (const i of p.indices) out.indices.push(i + offset);
  }
  return out;
}

/**
 * Piecewise-linear width profile s(y): scales each vertex's x/z distance from the
 * midline by s(y). Mirrors the Phase 1 female morph idea (brief §6.3 step 6).
 */
export function applyWidthProfile(m: MeshData, profile: { y: number; s: number }[]): MeshData {
  const sorted = [...profile].sort((a, b) => a.y - b.y);
  const sAt = (y: number) => {
    if (y <= sorted[0]!.y) return sorted[0]!.s;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]!,
        b = sorted[i + 1]!;
      if (y <= b.y) return a.s + ((y - a.y) / (b.y - a.y)) * (b.s - a.s);
    }
    return sorted[sorted.length - 1]!.s;
  };
  const out: MeshData = { positions: [], normals: [...m.normals], indices: [...m.indices] };
  for (let i = 0; i < m.positions.length; i += 3) {
    const y = m.positions[i + 1]!;
    const s = sAt(y);
    out.positions.push(m.positions[i]! * s, y, m.positions[i + 2]! * s);
  }
  return out;
}

export function triangleCount(m: MeshData): number {
  return m.indices.length / 3;
}
