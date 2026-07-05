"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/* 3D 메카 조립 씬 — 부품이 사방에서 날아와 결합하고,
   눈/코어가 점등한 뒤 카메라를 향해 돌진한다 (~3.4초) */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const easeInCubic = (x: number) => x * x * x;

type PartSpec = {
  delay: number;
  from: readonly [number, number, number];
  fromRot: readonly [number, number, number];
};

const PART_SPECS: Record<string, PartSpec> = {
  torso: { delay: 0.15, from: [0, 10, -6], fromRot: [1.2, 0.6, 0.4] },
  head: { delay: 0.55, from: [0, 11, 3], fromRot: [-1.4, 1.0, 0.5] },
  armL: { delay: 0.85, from: [-12, 5, 2], fromRot: [0.4, 0, 1.6] },
  armR: { delay: 1.0, from: [12, 5, 2], fromRot: [0.4, 0, -1.6] },
  legL: { delay: 1.2, from: [-6, -7, 4], fromRot: [-1.2, 0.4, 0.8] },
  legR: { delay: 1.35, from: [6, -7, 4], fromRot: [-1.2, -0.4, -0.8] },
};
const ASSEMBLE_TIME = 0.55;
const IGNITE_AT = 1.9;
const CHARGE_AT = 2.55;

function useSceneClock() {
  const startRef = useRef<number | null>(null);
  return (elapsed: number) => {
    if (startRef.current === null) startRef.current = elapsed;
    return elapsed - startRef.current;
  };
}

function StudioEnv() {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.fog = new THREE.FogExp2("#02040e", 0.035);
    scene.background = new THREE.Color("#02040e");
  }, [gl, scene]);
  return null;
}

function CameraRig() {
  const local = useSceneClock();
  useFrame(({ camera, clock }) => {
    const t = local(clock.getElapsedTime());
    // 서서히 다가가는 돌리인
    const z = 8.2 - clamp01(t / 3.4) * 1.6;
    // 부품 착지 시 카메라 흔들림
    let shake = 0;
    for (const spec of Object.values(PART_SPECS)) {
      const landAt = spec.delay + ASSEMBLE_TIME * 0.8;
      if (t > landAt) shake += Math.exp(-(t - landAt) * 9) * 0.09;
    }
    const jx = (Math.sin(t * 53.1) + Math.sin(t * 31.7)) * shake;
    const jy = (Math.sin(t * 47.3) + Math.sin(t * 29.1)) * shake;
    camera.position.set(jx, 2.5 + jy, z);
    camera.lookAt(0, 2.1, 0);
  });
  return null;
}

/** 금속 몸체/발광 부위 공용 재질 */
function useMechMaterials() {
  return useMemo(() => {
    const body = new THREE.MeshStandardMaterial({
      color: "#232c3d",
      metalness: 0.95,
      roughness: 0.28,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: "#0d1220",
      metalness: 0.9,
      roughness: 0.4,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: "#3a4a66",
      metalness: 1,
      roughness: 0.18,
    });
    const glow = new THREE.MeshStandardMaterial({
      color: "#031018",
      metalness: 0.2,
      roughness: 0.4,
      emissive: new THREE.Color("#00d4ff"),
      emissiveIntensity: 0,
    });
    const glowPurple = new THREE.MeshStandardMaterial({
      color: "#0a0618",
      metalness: 0.2,
      roughness: 0.4,
      emissive: new THREE.Color("#a78bfa"),
      emissiveIntensity: 0.6,
    });
    return { body, dark, trim, glow, glowPurple };
  }, []);
}

function Robot() {
  const mats = useMechMaterials();
  const partRefs = useRef<Record<string, THREE.Group | null>>({});
  const rootRef = useRef<THREE.Group>(null);
  const coreLightRef = useRef<THREE.PointLight>(null);
  const local = useSceneClock();

  useFrame(({ clock }) => {
    const t = local(clock.getElapsedTime());

    // 부품 비행 결합
    for (const [key, spec] of Object.entries(PART_SPECS)) {
      const g = partRefs.current[key];
      if (!g) continue;
      const p = clamp01((t - spec.delay) / ASSEMBLE_TIME);
      const e = p >= 1 ? 1 : easeOutBack(p);
      g.position.set(
        spec.from[0] * (1 - e),
        spec.from[1] * (1 - e),
        spec.from[2] * (1 - e),
      );
      g.rotation.set(
        spec.fromRot[0] * (1 - e),
        spec.fromRot[1] * (1 - e),
        spec.fromRot[2] * (1 - e),
      );
      g.visible = t >= spec.delay - 0.02;
    }

    // 점등: 눈/코어 발광 램프업 (플리커 포함)
    const ig = clamp01((t - IGNITE_AT) / 0.35);
    const flicker =
      ig > 0 && ig < 1 ? (Math.sin(t * 60) > -0.2 ? 1 : 0.25) : 1;
    mats.glow.emissiveIntensity = ig * 3.2 * flicker;
    if (coreLightRef.current) {
      coreLightRef.current.intensity = ig * 26 * flicker;
    }

    // 완성 후 미세 아이들 + 차지 돌진
    const root = rootRef.current;
    if (root) {
      root.rotation.y = Math.sin(t * 0.7) * 0.07;
      if (t > CHARGE_AT) {
        const c = easeInCubic(clamp01((t - CHARGE_AT) / 0.9));
        const s = 1 + c * 2.6;
        root.scale.setScalar(s);
        root.position.z = c * 5.5;
        mats.glow.emissiveIntensity = 3.2 + c * 8;
      } else {
        root.scale.setScalar(1);
        root.position.z = 0;
      }
    }
  });

  const setRef = (key: string) => (g: THREE.Group | null) => {
    partRefs.current[key] = g;
  };

  return (
    <group ref={rootRef}>
      {/* 몸통 + 골반 */}
      <group ref={setRef("torso")}>
        <mesh material={mats.body} position={[0, 2.72, 0]}>
          <boxGeometry args={[1.7, 1.15, 0.95]} />
        </mesh>
        <mesh material={mats.trim} position={[0, 3.02, 0.38]}>
          <boxGeometry args={[1.2, 0.34, 0.3]} />
        </mesh>
        {/* 가슴 코어 */}
        <mesh material={mats.glow} position={[0, 2.62, 0.5]}>
          <cylinderGeometry args={[0.21, 0.21, 0.12, 24]} />
        </mesh>
        <pointLight
          ref={coreLightRef}
          position={[0, 2.62, 0.9]}
          color="#00d4ff"
          intensity={0}
          distance={7}
        />
        <mesh material={mats.dark} position={[0, 2.0, 0]}>
          <boxGeometry args={[1.0, 0.4, 0.7]} />
        </mesh>
        <mesh material={mats.body} position={[0, 1.68, 0]}>
          <boxGeometry args={[1.15, 0.42, 0.75]} />
        </mesh>
        {/* 백팩 윙 */}
        <mesh
          material={mats.trim}
          position={[-0.85, 3.15, -0.5]}
          rotation={[0, 0, 0.5]}
        >
          <boxGeometry args={[0.16, 1.25, 0.45]} />
        </mesh>
        <mesh
          material={mats.trim}
          position={[0.85, 3.15, -0.5]}
          rotation={[0, 0, -0.5]}
        >
          <boxGeometry args={[0.16, 1.25, 0.45]} />
        </mesh>
      </group>

      {/* 머리 */}
      <group ref={setRef("head")}>
        <mesh material={mats.body} position={[0, 3.62, 0]}>
          <boxGeometry args={[0.58, 0.52, 0.58]} />
        </mesh>
        {/* 바이저(눈) */}
        <mesh material={mats.glow} position={[0, 3.64, 0.28]}>
          <boxGeometry args={[0.42, 0.11, 0.06]} />
        </mesh>
        <mesh material={mats.trim} position={[0, 3.94, 0]}>
          <boxGeometry args={[0.66, 0.1, 0.62]} />
        </mesh>
        <mesh material={mats.glowPurple} position={[0, 4.14, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.34, 8]} />
        </mesh>
      </group>

      {/* 팔 (좌/우) */}
      {([-1, 1] as const).map((side) => (
        <group key={side} ref={setRef(side === -1 ? "armL" : "armR")}>
          {/* 어깨 */}
          <mesh material={mats.body} position={[side * 1.18, 3.12, 0]}>
            <boxGeometry args={[0.62, 0.55, 0.72]} />
          </mesh>
          <mesh material={mats.glowPurple} position={[side * 1.18, 3.42, 0]}>
            <boxGeometry args={[0.5, 0.07, 0.6]} />
          </mesh>
          {/* 상완 */}
          <mesh material={mats.dark} position={[side * 1.22, 2.5, 0]}>
            <boxGeometry args={[0.36, 0.85, 0.4]} />
          </mesh>
          {/* 전완 */}
          <mesh material={mats.body} position={[side * 1.26, 1.72, 0.05]}>
            <boxGeometry args={[0.44, 0.95, 0.48]} />
          </mesh>
          <mesh material={mats.glow} position={[side * 1.26, 1.72, 0.3]}>
            <boxGeometry args={[0.1, 0.7, 0.04]} />
          </mesh>
          {/* 주먹 */}
          <mesh material={mats.trim} position={[side * 1.26, 1.12, 0.05]}>
            <sphereGeometry args={[0.26, 20, 16]} />
          </mesh>
        </group>
      ))}

      {/* 다리 (좌/우) */}
      {([-1, 1] as const).map((side) => (
        <group key={side} ref={setRef(side === -1 ? "legL" : "legR")}>
          {/* 허벅지 */}
          <mesh material={mats.body} position={[side * 0.42, 1.22, 0]}>
            <boxGeometry args={[0.48, 0.95, 0.55]} />
          </mesh>
          {/* 무릎 */}
          <mesh material={mats.glowPurple} position={[side * 0.42, 0.78, 0.22]}>
            <sphereGeometry args={[0.13, 16, 12]} />
          </mesh>
          {/* 정강이 */}
          <mesh material={mats.dark} position={[side * 0.42, 0.5, 0.02]}>
            <boxGeometry args={[0.42, 0.85, 0.48]} />
          </mesh>
          <mesh material={mats.glow} position={[side * 0.42, 0.5, 0.27]}>
            <boxGeometry args={[0.09, 0.55, 0.04]} />
          </mesh>
          {/* 발 */}
          <mesh material={mats.trim} position={[side * 0.42, 0.09, 0.14]}>
            <boxGeometry args={[0.5, 0.18, 0.85]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 부품 착지 시 바닥 충격파 링 */
function ShockRings() {
  const local = useSceneClock();
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const landings = useMemo(
    () =>
      Object.values(PART_SPECS).map((s) => s.delay + ASSEMBLE_TIME * 0.8),
    [],
  );
  useFrame(({ clock }) => {
    const t = local(clock.getElapsedTime());
    landings.forEach((at, i) => {
      const m = refs.current[i];
      if (!m) return;
      const p = (t - at) / 0.7;
      if (p < 0 || p > 1) {
        m.visible = false;
        return;
      }
      m.visible = true;
      const s = 0.4 + p * 6;
      m.scale.set(s, s, s);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - p);
    });
  });
  return (
    <>
      {landings.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
          visible={false}
        >
          <ringGeometry args={[0.9, 1, 48]} />
          <meshBasicMaterial
            color="#00d4ff"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/** 떠다니는 발광 스파크 */
function Sparks() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 7;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.random() * 6;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.12;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#67e8f9"
        size={0.055}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[26, 64]} />
        <meshStandardMaterial
          color="#060a14"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      <gridHelper
        args={[52, 52, "#0e7490", "#16213a"]}
        position={[0, 0.01, 0]}
      />
    </>
  );
}

export default function RobotScene3D() {
  return (
    <Canvas
      camera={{ position: [0, 2.5, 8.2], fov: 42 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
    >
      <StudioEnv />
      <CameraRig />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-6, 8, 6]} color="#7dd3fc" intensity={2.4} />
      <directionalLight position={[6, 5, -4]} color="#a78bfa" intensity={1.8} />
      <spotLight
        position={[0, 12, 2]}
        angle={0.5}
        penumbra={0.6}
        color="#ffffff"
        intensity={90}
        distance={30}
      />
      <pointLight position={[0, 1.2, -5]} color="#7c3aed" intensity={22} />
      <Robot />
      <ShockRings />
      <Sparks />
      <Ground />
    </Canvas>
  );
}
