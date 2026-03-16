"use client";

import { useEffect, useRef } from "react";
import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
} from "postprocessing";
import * as THREE from "three";

type GridScanProps = {
  sensitivity?: number;
  lineThickness?: number;
  linesColor?: string;
  gridScale?: number;
  scanColor?: string;
  scanOpacity?: number;
  enablePost?: boolean;
  bloomIntensity?: number;
  chromaticAberration?: number;
  noiseIntensity?: number;
  className?: string;
  style?: React.CSSProperties;
};

const vert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform float uLineThickness;
uniform vec3 uLinesColor;
uniform vec3 uScanColor;
uniform float uGridScale;
uniform float uScanOpacity;
uniform float uNoise;
uniform vec2 uMouse;
uniform float uSensitivity;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 78.233);
  return fract(p.x * p.y);
}

float gridMask(vec2 uv, float thickness) {
  vec2 fw = fwidth(uv) + vec2(1e-4);
  vec2 gv = abs(fract(uv - 0.5) - 0.5) / fw;
  float d = min(gv.x, gv.y);
  return 1.0 - smoothstep(0.0, max(0.01, thickness), d);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  vec2 mouse = uMouse * (0.24 * clamp(uSensitivity, 0.0, 1.0));

  vec3 ro = vec3(0.0, 0.0, -0.2);
  vec3 rd = normalize(vec3(p, 1.45));

  float pitch = -mouse.y * 0.35;
  float yaw = mouse.x * 0.45;
  float cp = cos(pitch), sp = sin(pitch);
  float cy = cos(yaw), sy = sin(yaw);
  rd.yz = mat2(cp, -sp, sp, cp) * rd.yz;
  rd.xz = mat2(cy, -sy, sy, cy) * rd.xz;

  float halfW = 1.05;
  float halfH = 0.58;
  float zMax = 11.0;
  float tMin = 1e9;
  vec3 hit = vec3(0.0);
  float hitType = 0.0;

  for (int i = 0; i < 4; i++) {
    float s = mod(float(i), 2.0) < 0.5 ? -1.0 : 1.0;
    bool isYPlane = i < 2;

    if (isYPlane) {
      if (abs(rd.y) > 1e-5) {
        float t = (s * halfH - ro.y) / rd.y;
        vec3 h = ro + rd * t;
        if (t > 0.0 && abs(h.x) <= halfW && h.z >= 0.0 && h.z <= zMax && t < tMin) {
          tMin = t;
          hit = h;
          hitType = 1.0;
        }
      }
    } else {
      if (abs(rd.x) > 1e-5) {
        float t = (s * halfW - ro.x) / rd.x;
        vec3 h = ro + rd * t;
        if (t > 0.0 && abs(h.y) <= halfH && h.z >= 0.0 && h.z <= zMax && t < tMin) {
          tMin = t;
          hit = h;
          hitType = 0.0;
        }
      }
    }
  }

  vec3 color = vec3(0.02, 0.005, 0.07);
  float vignette = 1.0 - smoothstep(0.45, 1.35, length(p));
  color *= mix(0.5, 1.15, vignette);

  if (tMin < 1e8) {
    float scale = max(0.05, uGridScale);
    vec2 guv = hitType > 0.5 ? vec2(hit.z, hit.x) : vec2(hit.z, hit.y);
    guv /= scale;
    guv.y += sin(hit.z * 1.3 + iTime * 0.65) * 0.05;

    float lines = gridMask(guv, 0.55 + uLineThickness * 0.9);
    float depthFade = exp(-hit.z * 0.18);
    float nearBoost = 1.0 - smoothstep(0.0, 8.0, hit.z);

    float scanPos = mod(iTime * 2.1, zMax + 1.5) - 0.75;
    float scanBand = exp(-pow((hit.z - scanPos) * 2.7, 2.0));
    float scanAura = exp(-pow((hit.z - scanPos) * 1.2, 2.0)) * 0.35;

    float edgeDistX = 1.0 - smoothstep(0.0, 0.08, abs(abs(hit.x) - halfW));
    float edgeDistY = 1.0 - smoothstep(0.0, 0.08, abs(abs(hit.y) - halfH));
    float edgeGlow = max(edgeDistX, edgeDistY);

    vec3 gridCol = uLinesColor * lines * (0.45 + 0.75 * nearBoost + 0.2 * edgeGlow);
    vec3 scanCol = uScanColor * (scanBand + scanAura) * uScanOpacity;

    color += (gridCol + scanCol) * (0.45 + 0.55 * depthFade);
  }

  float n = hash(fragCoord + iTime * 60.0);
  color += (n - 0.5) * uNoise;
  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, 1.0);
}

void main() {
  vec4 c;
  mainImage(c, vUv * iResolution.xy);
  gl_FragColor = c;
}
`;

function srgbColor(hex: string) {
  return new THREE.Color(hex).convertSRGBToLinear();
}

export default function GridScan({
  sensitivity = 0.55,
  lineThickness = 1,
  linesColor = "#392e4e",
  gridScale = 0.1,
  scanColor = "#FF9FFC",
  scanOpacity = 0.4,
  enablePost = true,
  bloomIntensity = 0.6,
  chromaticAberration = 0.002,
  noiseIntensity = 0.01,
  className,
  style,
}: GridScanProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const currentMouse = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      iResolution: {
        value: new THREE.Vector3(
          container.clientWidth,
          container.clientHeight,
          renderer.getPixelRatio(),
        ),
      },
      iTime: { value: 0 },
      uLineThickness: { value: lineThickness },
      uLinesColor: { value: srgbColor(linesColor) },
      uScanColor: { value: srgbColor(scanColor) },
      uGridScale: { value: gridScale },
      uScanOpacity: { value: scanOpacity },
      uNoise: { value: noiseIntensity },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uSensitivity: { value: sensitivity },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    let composer: EffectComposer | null = null;
    if (enablePost) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      const bloom = new BloomEffect({
        intensity: Math.max(0, bloomIntensity),
      });
      const chroma = new ChromaticAberrationEffect({
        offset: new THREE.Vector2(chromaticAberration, chromaticAberration),
        radialModulation: true,
        modulationOffset: 0,
      });

      const effects = new EffectPass(camera, bloom, chroma);
      effects.renderToScreen = true;
      composer.addPass(effects);
    }

    const onPointerMove = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = -((event.clientY / window.innerHeight) * 2 - 1);
      targetMouse.current.set(nx, ny);
    };

    const onBlur = () => {
      targetMouse.current.set(0, 0);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("blur", onBlur);

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      material.uniforms.iResolution.value.set(width, height, renderer.getPixelRatio());
      composer?.setSize(width, height);
    });
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    let rafId = 0;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      currentMouse.current.lerp(targetMouse.current, 0.08);
      material.uniforms.uMouse.value.copy(currentMouse.current);
      material.uniforms.iTime.value = clock.getElapsedTime();

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", onBlur);
      resizeObserver.disconnect();
      composer?.dispose();
      material.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [
    bloomIntensity,
    chromaticAberration,
    enablePost,
    gridScale,
    lineThickness,
    linesColor,
    noiseIntensity,
    scanColor,
    scanOpacity,
    sensitivity,
  ]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
      style={style}
    />
  );
}
