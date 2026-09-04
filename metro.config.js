// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle migrations are imported as .sql text (with babel-plugin-inline-import).
config.resolver.sourceExts.push('sql');
// 3D bodies ship as binary glTF.
config.resolver.assetExts.push('glb', 'gltf');

// Single copy of three (see docs/DECISIONS.md, ADR-0004): @react-three/fiber's native build is
// CommonJS and `require('three')` selects three's "require" export (build/three.cjs), while app
// code and three-stdlib `import` it and select the "import" export (build/three.module.js). Without
// this, Metro bundles both, fiber warns "Multiple instances of Three.js", Vector3/Euler props break,
// and fiber's React Native FileLoader/TextureLoader polyfills patch the copy GLTFLoader does not use.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return context.resolveRequest({ ...context, isESMImport: false }, moduleName, platform);
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
