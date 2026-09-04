import * as THREE from 'three';

/**
 * Procedural neutral MatCap (§6.2 "Look"): soft key light, wrapped diffuse, a little
 * specular and a subtle rim so adjacent regions read as separate. Generated in JS as a
 * DataTexture so the spike does not depend on image decoding through expo-gl; a
 * hand-painted PNG can replace it in Phase 1 without touching the scene code.
 * MeshMatcapMaterial multiplies this by `material.color`, so it must stay grayscale.
 */
export function createMatcapTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const L = normalize([-0.45, 0.55, 0.7]);
  const H = normalize([L[0], L[1], L[2] + 1]);
  for (let y = 0; y < size; y++) {
    const ny = ((y + 0.5) / size) * 2 - 1; // row 0 = bottom (flipY false)
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const r2 = nx * nx + ny * ny;
      let v = 0.18;
      if (r2 <= 1) {
        const nz = Math.sqrt(1 - r2);
        const ndl = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        const wrap = ndl * 0.6 + 0.4;
        const ndh = Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]);
        const spec = Math.pow(ndh, 28) * 0.22;
        const rim = Math.pow(1 - nz, 3) * 0.28;
        v = Math.min(1, 0.28 + 0.6 * wrap + spec + rim);
      }
      const i = (y * size + x) * 4;
      const byte = Math.round(v * 255);
      data[i] = byte;
      data[i + 1] = byte;
      data[i + 2] = byte;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function normalize(v: [number, number, number]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}
