import {
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  motion,
  useReducedMotion,
} from "framer-motion";

import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber";

import * as THREE from "three";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useTranslation } from "react-i18next";

import { Seo } from "@/lib/seo";
import { LocaleLink } from "@/components/LocaleLink";

import {
  DashboardMockup,
  ApprovalMockup,
  StatusMockup,
} from "@/mockups/OperationsMockups";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

type HowStep = {
  title: string;
  text: string;
  audit: string;
  status: string;
};

type ExceptionItem = {
  when: string;
  outcome: string;
  detail: string;
};

/* ========================================================================== */
/* PERFORMANCE HELPERS                                                        */
/* ========================================================================== */

function useNearViewport<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = "180px",
) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }

    let intersecting = false;

    const sync = () => {
      setActive(intersecting && document.visibilityState === "visible");
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        sync();
      },
      {
        rootMargin,
        threshold: 0,
      },
    );

    observer.observe(element);
    document.addEventListener("visibilitychange", sync);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ref, rootMargin]);

  return active;
}

function useEnhancedVisuals() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: {
        saveData?: boolean;
      };
    };

    const desktop = window.matchMedia("(min-width: 960px)").matches;
    const saveData = Boolean(nav.connection?.saveData);
    const enoughCpu = (nav.hardwareConcurrency ?? 4) >= 4;
    const enoughMemory = nav.deviceMemory == null || nav.deviceMemory >= 4;

    setEnabled(desktop && !saveData && enoughCpu && enoughMemory);
  }, []);

  return enabled;
}

function useDeferredMount(enabled: boolean, timeout = 420) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!enabled || mounted || typeof window === "undefined") return;

    let cancelled = false;
    let frameA = 0;
    let frameB = 0;
    let timeoutId = 0;
    let idleId: number | undefined;

    const commit = () => {
      frameA = window.requestAnimationFrame(() => {
        frameB = window.requestAnimationFrame(() => {
          if (!cancelled) setMounted(true);
        });
      });
    };

    const win = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (win.requestIdleCallback) {
      idleId = win.requestIdleCallback(commit, { timeout });
    } else {
      timeoutId = window.setTimeout(commit, Math.min(timeout, 220));
    }

    return () => {
      cancelled = true;
      if (idleId != null) win.cancelIdleCallback?.(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
      if (frameA) window.cancelAnimationFrame(frameA);
      if (frameB) window.cancelAnimationFrame(frameB);
    };
  }, [enabled, mounted, timeout]);

  return mounted;
}

/* ========================================================================== */
/* LIGHTWEIGHT THREE.JS HERO                                                  */
/* ========================================================================== */

function DemandFramePump({
  active,
  fps = 24,
}: {
  active: boolean;
  fps?: number;
}) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    let raf = 0;
    let last = 0;
    const interval = 1000 / fps;

    const tick = (time: number) => {
      if (time - last >= interval) {
        last = time;
        invalidate();
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(raf);
  }, [active, fps, invalidate]);

  return null;
}

function HowHeroField({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const { points, edges } = useMemo(() => {
    const count = 50;
    const pointData = new Float32Array(count * 3);
    const edgeData: number[] = [];
    let seed = 90317;

    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let index = 0; index < count; index += 1) {
      pointData[index * 3] = (random() - 0.5) * 15;
      pointData[index * 3 + 1] = (random() - 0.5) * 8;
      pointData[index * 3 + 2] = (random() - 0.5) * 6 - 1.2;
    }

    for (let index = 0; index < 12; index += 1) {
      const a = Math.floor(random() * count);
      let b = Math.floor(random() * count);

      if (a === b) b = (b + 1) % count;

      edgeData.push(
        pointData[a * 3],
        pointData[a * 3 + 1],
        pointData[a * 3 + 2],
        pointData[b * 3],
        pointData[b * 3 + 1],
        pointData[b * 3 + 2],
      );
    }

    return {
      points: pointData,
      edges: new Float32Array(edgeData),
    };
  }, []);

  useFrame((state, delta) => {
    if (!active || reducedMotion) return;

    if (rootRef.current) {
      rootRef.current.rotation.z += delta * 0.0025;
      rootRef.current.rotation.y = THREE.MathUtils.lerp(
        rootRef.current.rotation.y,
        state.pointer.x * 0.045,
        0.022,
      );
      rootRef.current.rotation.x = THREE.MathUtils.lerp(
        rootRef.current.rotation.x,
        -state.pointer.y * 0.025,
        0.022,
      );
    }

    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.004;
    }
  });

  return (
    <group ref={rootRef} position={[1.2, 0, 0]}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[edges, 3]}
          />
        </bufferGeometry>

        <lineBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[points, 3]}
          />
        </bufferGeometry>

        <pointsMaterial
          size={0.036}
          color="#7dd3fc"
          transparent
          opacity={0.42}
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      <mesh position={[3.4, 0.1, -2.8]} rotation={[1.12, 0.3, -0.22]}>
        <torusGeometry args={[2.05, 0.012, 6, 76]} />
        <meshBasicMaterial color="#2dd4bf" transparent opacity={0.21} />
      </mesh>

      <mesh position={[3.4, 0.1, -2.7]} rotation={[1.28, -0.45, 0.18]}>
        <torusGeometry args={[1.48, 0.01, 6, 68]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.19} />
      </mesh>

      <mesh position={[3.4, 0.1, -2.55]} rotation={[0.3, 0.45, 0.15]}>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshBasicMaterial
          color="#818cf8"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>

      {[
        [1.25, 1.65, -1.4, "#5eead4"],
        [2.45, -1.45, -1.1, "#67e8f9"],
        [4.25, 1.45, -1.5, "#93c5fd"],
        [5.2, -0.95, -1.8, "#a5b4fc"],
      ].map(([x, y, z, color], index) => (
        <mesh key={index} position={[x as number, y as number, z as number]}>
          <sphereGeometry args={[0.052, 10, 10]} />
          <meshBasicMaterial color={color as string} />
        </mesh>
      ))}
    </group>
  );
}

function HeroThreeBackground({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-80"
      aria-hidden="true"
    >
      <Canvas
        frameloop="demand"
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: "high-performance",
        }}
        dpr={1}
      >
        <DemandFramePump
          active={active && !reducedMotion}
          fps={24}
        />

        <HowHeroField
          active={active}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  );
}

/* ========================================================================== */
/* HERO FILE FLOW — WIREFRAME-BOUND DOCUMENTS                                */
/* ========================================================================== */

type HeroFlowFileType = "Paper" | "Data" | "Information" | "Process";

type HeroFlowFile = {
  type: HeroFlowFileType;
  name: string;
  route: number;
  offset: number;
  duration: number;
  direction?: 1 | -1;
  depth: number;
  className?: string;
};

const HERO_FLOW_PATHS = [
  "M -90 188 C 152 116 274 254 456 226 C 648 196 774 76 946 118 C 1080 150 1162 228 1280 194",
  "M -80 620 C 146 660 270 500 454 536 C 638 572 746 712 918 638 C 1058 578 1140 478 1280 524",
] as const;

const HERO_FLOW_FILES: HeroFlowFile[] = [
  {
    type: "Paper",
    name: "Source layer",
    route: 0,
    offset: 0.12,
    duration: 18,
    depth: 20,
  },
  {
    type: "Data",
    name: "Structured signals",
    route: 1,
    offset: 0.32,
    duration: 21,
    direction: -1,
    depth: 28,
  },
  {
    type: "Information",
    name: "Context + meaning",
    route: 0,
    offset: 0.58,
    duration: 24,
    depth: 34,
    className: "hidden md:block",
  },
  {
    type: "Process",
    name: "Governed workflow",
    route: 1,
    offset: 0.78,
    duration: 26,
    direction: -1,
    depth: 30,
    className: "hidden md:block",
  },
];

const HERO_FLOW_THEME: Record<
  HeroFlowFileType,
  {
    badge: string;
    line: string;
    glow: string;
    dot: string;
  }
> = {
  Paper: {
    badge: "border-teal-300/20 bg-teal-400/10 text-teal-200",
    line: "bg-teal-300",
    glow: "bg-teal-400/10",
    dot: "bg-teal-300 shadow-[0_0_14px_rgba(94,234,212,.75)]",
  },
  Data: {
    badge: "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
    line: "bg-cyan-300",
    glow: "bg-cyan-400/10",
    dot: "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.75)]",
  },
  Information: {
    badge: "border-blue-300/20 bg-blue-400/10 text-blue-200",
    line: "bg-blue-300",
    glow: "bg-blue-400/10",
    dot: "bg-blue-300 shadow-[0_0_14px_rgba(147,197,253,.75)]",
  },
  Process: {
    badge: "border-indigo-300/20 bg-indigo-400/10 text-indigo-200",
    line: "bg-indigo-300",
    glow: "bg-indigo-400/10",
    dot: "bg-indigo-300 shadow-[0_0_14px_rgba(165,180,252,.75)]",
  },
};

function HeroFlowFileCard({
  file,
  index,
  active,
  reducedMotion,
}: {
  file: HeroFlowFile;
  index: number;
  active: boolean;
  reducedMotion: boolean;
}) {
  const theme = HERO_FLOW_THEME[file.type];

  return (
    <div
      className={`hiw-flow-file absolute left-0 top-0 opacity-0 ${file.className ?? ""}`}
      data-route={file.route}
      data-offset={file.offset}
      data-duration={file.duration}
      data-direction={file.direction ?? 1}
      data-depth={file.depth}
      aria-hidden="true"
    >
      <div className="hiw-flow-file-parallax will-change-transform">
        <motion.div
          animate={
            active && !reducedMotion
              ? {
                  y: [0, -4 - (index % 3), 0],
                  scale: [1, 1.025, 1],
                }
              : undefined
          }
          transition={{
            duration: 3.2 + (index % 4) * 0.45,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.08,
          }}
          className="group relative w-[118px] overflow-hidden rounded-xl border border-white/[0.13] bg-[#061525]/82 p-3 shadow-[0_16px_48px_rgba(0,0,0,.28)] backdrop-blur-sm sm:w-[132px]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full ${theme.glow} blur-2xl`}
          />

          <motion.div
            animate={
              active && !reducedMotion
                ? { x: ["-150%", "260%"] }
                : undefined
            }
            transition={{
              duration: 2.6,
              repeat: Infinity,
              repeatDelay: 3.2 + (index % 3),
              delay: index * 0.18,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute -top-[50%] h-[200%] w-8 rotate-[18deg] bg-white/[0.055] blur-md"
          />

          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`rounded-md border px-1.5 py-1 text-[7px] font-bold tracking-[0.14em] ${theme.badge}`}
              >
                {file.type}
              </span>

              <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
            </div>

            <div className="mt-3 flex items-start gap-2.5">
              <div className="relative h-9 w-8 shrink-0 overflow-hidden rounded-md border border-white/[0.11] bg-white/[0.045]">
                <span className="absolute right-0 top-0 h-2.5 w-2.5 border-b border-l border-white/10 bg-white/[0.045]" />
                <span className={`absolute bottom-2 left-1.5 h-[2px] w-4 rounded-full ${theme.line}`} />
                <span className="absolute bottom-[5px] left-1.5 h-[2px] w-5 rounded-full bg-white/12" />
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className={`h-[2px] w-8 rounded-full ${theme.line}`} />
                <div className="mt-2 space-y-1">
                  <div className="h-[2px] w-full rounded-full bg-white/16" />
                  <div className="h-[2px] w-[78%] rounded-full bg-white/10" />
                  <div className="h-[2px] w-[58%] rounded-full bg-white/[0.075]" />
                </div>
              </div>
            </div>

            <p className="mt-3 truncate text-[8px] font-medium tracking-[0.02em] text-white/44">
              {file.name}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function HeroFileFlow({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root || reducedMotion || typeof window === "undefined") return;

    const section = root.closest("section");
    if (!section) return;

    const paths = Array.from(
      root.querySelectorAll<SVGPathElement>(".hiw-flow-path-anchor"),
    );
    const cards = Array.from(
      root.querySelectorAll<HTMLElement>(".hiw-flow-file"),
    );
    const parallaxLayers = cards.map((card) =>
      card.querySelector<HTMLElement>(".hiw-flow-file-parallax"),
    );

    const pathLengths = paths.map((path) => path.getTotalLength());
    let rootWidth = root.clientWidth;
    let rootHeight = root.clientHeight;
    let raf = 0;
    let pointerRaf = 0;
    let lastFrame = 0;
    const frameInterval = 1000 / 30;
    const startedAt = performance.now();

    const resizeObserver = new ResizeObserver(() => {
      rootWidth = root.clientWidth;
      rootHeight = root.clientHeight;
    });
    resizeObserver.observe(root);

    const renderFiles = (time: number) => {
      if (activeRef.current && time - lastFrame >= frameInterval) {
        lastFrame = time;
        const elapsed = (time - startedAt) / 1000;

        cards.forEach((card) => {
          const route = Number(card.dataset.route ?? 0);
          const path = paths[route];
          const length = pathLengths[route] ?? 0;

          if (!path || !length) return;

          const duration = Math.max(8, Number(card.dataset.duration ?? 20));
          const offset = Number(card.dataset.offset ?? 0);
          const direction = Number(card.dataset.direction ?? 1);
          let progress = offset + (elapsed / duration) * direction;
          progress %= 1;
          if (progress < 0) progress += 1;

          const point = path.getPointAtLength(length * progress);
          const nextPoint = path.getPointAtLength(
            Math.min(length, length * progress + 3),
          );
          const angle =
            (Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180) /
            Math.PI;

          const edgeFade = Math.min(progress, 1 - progress) * 9;
          const opacity = Math.max(0.12, Math.min(0.9, edgeFade));
          const x = (point.x / 1200) * rootWidth;
          const y = (point.y / 820) * rootHeight;

          gsap.set(card, {
            x: x - card.offsetWidth / 2,
            y: y - card.offsetHeight / 2,
            rotationZ: angle * 0.12,
            opacity,
            force3D: true,
          });
        });
      }

      raf = window.requestAnimationFrame(renderFiles);
    };

    raf = window.requestAnimationFrame(renderFiles);

    const xQuick = parallaxLayers.map((layer) =>
      layer
        ? gsap.quickTo(layer, "x", { duration: 0.7, ease: "power3.out" })
        : null,
    );
    const yQuick = parallaxLayers.map((layer) =>
      layer
        ? gsap.quickTo(layer, "y", { duration: 0.7, ease: "power3.out" })
        : null,
    );
    const rotateXQuick = parallaxLayers.map((layer) =>
      layer
        ? gsap.quickTo(layer, "rotateX", { duration: 0.75, ease: "power3.out" })
        : null,
    );
    const rotateYQuick = parallaxLayers.map((layer) =>
      layer
        ? gsap.quickTo(layer, "rotateY", { duration: 0.75, ease: "power3.out" })
        : null,
    );

    let latestPointer: PointerEvent | null = null;

    const applyPointer = () => {
      pointerRaf = 0;
      const event = latestPointer;
      if (!event || !activeRef.current) return;

      const rect = section.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;

      cards.forEach((card, index) => {
        const depth = Number(card.dataset.depth ?? 20);
        xQuick[index]?.(nx * depth * 0.72);
        yQuick[index]?.(ny * depth * 0.46);
        rotateYQuick[index]?.(nx * 7.5);
        rotateXQuick[index]?.(-ny * 5.5);
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      latestPointer = event;
      if (!pointerRaf) {
        pointerRaf = window.requestAnimationFrame(applyPointer);
      }
    };

    const resetPointer = () => {
      latestPointer = null;
      parallaxLayers.forEach((_, index) => {
        xQuick[index]?.(0);
        yQuick[index]?.(0);
        rotateXQuick[index]?.(0);
        rotateYQuick[index]?.(0);
      });
    };

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (finePointer.matches) {
      section.addEventListener("pointermove", handlePointerMove, { passive: true });
      section.addEventListener("pointerleave", resetPointer);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      if (pointerRaf) window.cancelAnimationFrame(pointerRaf);
      resizeObserver.disconnect();
      section.removeEventListener("pointermove", handlePointerMove);
      section.removeEventListener("pointerleave", resetPointer);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      ref={rootRef}
      className="hiw-file-flow-layer pointer-events-none absolute inset-0 z-[6] overflow-hidden will-change-transform"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 820"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="hiw-file-route-0" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0" />
            <stop offset="42%" stopColor="#22d3ee" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="hiw-file-route-1" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.03" />
            <stop offset="48%" stopColor="#22d3ee" stopOpacity="0.56" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {HERO_FLOW_PATHS.map((path, index) => (
          <g key={path}>
            <path
              className="hiw-flow-path-anchor"
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth="1"
            />
            <path
              d={path}
              fill="none"
              stroke={index % 2 === 0 ? "#22d3ee" : "#60a5fa"}
              strokeOpacity="0.035"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              className="hiw-flow-route"
              d={path}
              fill="none"
              stroke={`url(#hiw-file-route-${index})`}
              strokeWidth="1.35"
              strokeLinecap="round"
            />
            <path
              className="hiw-file-electric"
              d={path}
              fill="none"
              stroke={index % 2 === 0 ? "#67e8f9" : "#93c5fd"}
              strokeWidth="1.65"
              strokeDasharray={index % 2 === 0 ? "3 24" : "4 28"}
              strokeLinecap="round"
              opacity="0.4"
            />
          </g>
        ))}
      </svg>

      {HERO_FLOW_FILES.map((file, index) => (
        <HeroFlowFileCard
          key={`${file.name}-${index}`}
          file={file}
          index={index}
          active={active}
          reducedMotion={reducedMotion}
        />
      ))}
    </div>
  );
}

/* ========================================================================== */
/* HERO                                                                       */
/* ========================================================================== */

function HowHero({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const ambientRef = useRef<gsap.core.Timeline | null>(null);

  const reducedMotion = Boolean(useReducedMotion());
  const active = useNearViewport(sectionRef, "140px");
  const enhancedVisuals = useEnhancedVisuals();
  const mountThree = useDeferredMount(
    active && enhancedVisuals && !reducedMotion,
    240,
  );

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || reducedMotion || typeof window === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const findHeader = () => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-site-header], header[role="banner"], header, .site-header, .app-header, .sticky.top-0',
        ),
      );

      return (
        candidates.find((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const anchored = style.position === "sticky" || style.position === "fixed";

          return anchored && rect.height >= 40 && rect.height <= 180;
        }) ?? null
      );
    };

    const getHeaderOffset = () =>
      Math.round(findHeader()?.getBoundingClientRect().height ?? 0);

    const ctx = gsap.context(() => {
      const copy = section.querySelector<HTMLElement>(".hiw-intro-copy-wrap");
      const threeWrap = section.querySelector<HTMLElement>(".hiw-hero-three-wrap");
      const stage = section.querySelector<HTMLElement>(".hiw-hero-stage");
      const stageCore = section.querySelector<HTMLElement>(".hiw-stage-core-wrap");
      const orbitA = section.querySelector<HTMLElement>(".hiw-stage-orbit-a");
      const orbitB = section.querySelector<HTMLElement>(".hiw-stage-orbit-b");
      const orbitC = section.querySelector<HTMLElement>(".hiw-stage-orbit-c");
      const stageNodes = Array.from(
        section.querySelectorAll<HTMLElement>(".hiw-stage-node"),
      );
      const grid = section.querySelector<HTMLElement>(".hiw-intro-grid");
      const wire = section.querySelector<HTMLElement>(".hiw-intro-wire");
      const fileFlow = section.querySelector<HTMLElement>(".hiw-file-flow-layer");
      const beam = section.querySelector<HTMLElement>(".hiw-intro-beam");
      const glowA = section.querySelector<HTMLElement>(".hiw-intro-glow-a");
      const glowB = section.querySelector<HTMLElement>(".hiw-intro-glow-b");
      const scrollHint = section.querySelector<HTMLElement>(".hiw-intro-scroll");
      const progress = section.querySelector<HTMLElement>(".hiw-intro-progress");
      const depthLineA = section.querySelector<HTMLElement>(".hiw-depth-line-a");
      const depthLineB = section.querySelector<HTMLElement>(".hiw-depth-line-b");

      const paths = Array.from(
        section.querySelectorAll<SVGPathElement>(".hiw-intro-path, .hiw-flow-route"),
      );
      const electricLines = Array.from(
        section.querySelectorAll<SVGPathElement>(".hiw-electric-line, .hiw-file-electric"),
      );

      paths.forEach((path) => {
        const length = path.getTotalLength();

        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });
      });

      if (progress) {
        gsap.set(progress, {
          scaleY: 0,
          transformOrigin: "top center",
        });
      }

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: () => `top top+=${getHeaderOffset()}`,
          end: "bottom top",
          scrub: 0.78,
          invalidateOnRefresh: true,
        },
      });

      if (paths.length) {
        tl.to(
          paths,
          {
            strokeDashoffset: 0,
            duration: 0.7,
            stagger: 0.055,
            ease: "power2.out",
          },
          0,
        );
      }

      if (copy) {
        tl.to(
          copy,
          {
            x: -28,
            y: -112,
            scale: 0.965,
            autoAlpha: 0.16,
            duration: 1,
          },
          0,
        );
      }

      if (stage) {
        tl.to(
          stage,
          {
            x: 92,
            y: -72,
            scale: 1.16,
            rotateZ: 4,
            duration: 1,
          },
          0,
        );
      }

      if (stageCore) {
        tl.to(
          stageCore,
          {
            x: 18,
            y: -24,
            scale: 1.08,
            duration: 1,
          },
          0,
        );
      }

      if (threeWrap) {
        tl.to(
          threeWrap,
          {
            x: 36,
            y: 74,
            scale: 1.1,
            opacity: 0.52,
            duration: 1,
          },
          0,
        );
      }

      if (wire) {
        tl.to(
          wire,
          {
            x: 112,
            y: -58,
            rotate: 7,
            scale: 1.09,
            opacity: 0.74,
            duration: 1,
          },
          0,
        );
      }

      if (fileFlow) {
        tl.to(
          fileFlow,
          {
            x: 44,
            y: -46,
            scale: 1.045,
            rotate: 1.4,
            opacity: 0.78,
            duration: 1,
          },
          0,
        );
      }

      if (grid) {
        tl.to(
          grid,
          {
            x: 78,
            y: 44,
            rotate: 0.65,
            scale: 1.025,
            duration: 1,
          },
          0,
        );
      }

      if (orbitA) {
        tl.to(orbitA, { rotate: 72, scale: 1.12, duration: 1 }, 0);
      }

      if (orbitB) {
        tl.to(orbitB, { rotate: -96, scale: 0.94, duration: 1 }, 0);
      }

      if (orbitC) {
        tl.to(orbitC, { rotate: 128, scale: 1.06, duration: 1 }, 0);
      }

      if (stageNodes.length) {
        stageNodes.forEach((node, index) => {
          tl.to(
            node,
            {
              x: index % 2 === 0 ? 32 + index * 3 : -24 - index * 2,
              y: index % 2 === 0 ? -24 - index * 4 : 28 + index * 3,
              scale: 1.15 + index * 0.025,
              duration: 1,
            },
            0,
          );
        });
      }

      if (glowA) {
        tl.to(
          glowA,
          {
            x: 118,
            y: -78,
            scale: 1.2,
            opacity: 0.8,
            duration: 1,
          },
          0,
        );
      }

      if (glowB) {
        tl.to(
          glowB,
          {
            x: -92,
            y: 82,
            scale: 1.16,
            opacity: 0.72,
            duration: 1,
          },
          0,
        );
      }

      if (depthLineA) {
        tl.to(depthLineA, { xPercent: 58, opacity: 0.5, duration: 1 }, 0);
      }

      if (depthLineB) {
        tl.to(depthLineB, { xPercent: -46, opacity: 0.42, duration: 1 }, 0);
      }

      if (beam) {
        tl.fromTo(
          beam,
          { xPercent: -165, autoAlpha: 0 },
          {
            xPercent: 195,
            autoAlpha: 0.78,
            duration: 0.92,
          },
          0.04,
        );
      }

      if (progress) {
        tl.to(progress, { scaleY: 1, duration: 1 }, 0);
      }

      if (scrollHint) {
        tl.to(
          scrollHint,
          {
            autoAlpha: 0,
            y: 16,
            duration: 0.24,
          },
          0,
        );
      }

      const ambient = gsap.timeline({ repeat: -1 });

      if (electricLines.length) {
        ambient.to(
          electricLines,
          {
            strokeDashoffset: -140,
            duration: 4.6,
            ease: "none",
          },
          0,
        );
      }

      ambientRef.current = ambient;
      ambient.paused(!active);
    }, section);

    return () => {
      ambientRef.current?.kill();
      ambientRef.current = null;
      ctx.revert();
    };
  }, [active, reducedMotion]);

  useEffect(() => {
    ambientRef.current?.paused(!active);
  }, [active]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[720px] items-center overflow-hidden bg-[#020817] px-6 pb-24 pt-28 text-white sm:min-h-[780px] sm:pt-32 lg:min-h-[820px] lg:py-28"
    >
      <div className="absolute inset-0 bg-[#020817]" />

      {mountThree ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="hiw-hero-three-wrap absolute inset-0 origin-center will-change-transform"
        >
          <HeroThreeBackground
            active={active}
            reducedMotion={reducedMotion}
          />
        </motion.div>
      ) : null}

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_38%,rgba(34,211,238,.17),transparent_23%),radial-gradient(circle_at_88%_18%,rgba(96,165,250,.15),transparent_22%),radial-gradient(circle_at_13%_83%,rgba(45,212,191,.11),transparent_29%)]"
        aria-hidden="true"
      />

      <HeroFileFlow
        active={active}
        reducedMotion={reducedMotion}
      />

      <div
        className="hiw-intro-glow-a pointer-events-none absolute -right-20 top-10 h-[500px] w-[500px] rounded-full bg-cyan-400/[0.11] blur-[135px] will-change-transform"
        aria-hidden="true"
      />

      <div
        className="hiw-intro-glow-b pointer-events-none absolute -left-36 bottom-[-150px] h-[430px] w-[430px] rounded-full bg-teal-400/[0.09] blur-[125px] will-change-transform"
        aria-hidden="true"
      />

      <div
        className="hiw-intro-grid pointer-events-none absolute -inset-24 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.19)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.19)_1px,transparent_1px)] [background-size:88px_88px] will-change-transform"
        aria-hidden="true"
      />

      <div
        className="hiw-depth-line-a pointer-events-none absolute left-[-10%] top-[32%] h-px w-[72%] bg-gradient-to-r from-transparent via-teal-300/25 to-transparent"
        aria-hidden="true"
      />

      {/* ------------------------------------------------------------ */}
      {/* RIGHT-SIDE DEPTH STAGE                                      */}
      {/* ------------------------------------------------------------ */}

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.88, x: 54 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{
          duration: 1.05,
          delay: 0.18,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="hiw-hero-stage pointer-events-none absolute right-[1.5%] top-1/2 mt-[-270px] hidden h-[540px] w-[540px] origin-center will-change-transform lg:block xl:right-[4%] xl:h-[590px] xl:w-[590px] xl:mt-[-295px]"
        style={{ perspective: "1200px" }}
        aria-hidden="true"
      >
        <motion.div
          animate={
            active && !reducedMotion
              ? { rotate: 360 }
              : undefined
          }
          transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
          className="hiw-stage-orbit-a absolute inset-[3%] rounded-full border border-dashed border-teal-300/[0.23]"
        />

        <motion.div
          animate={
            active && !reducedMotion
              ? { rotate: -360 }
              : undefined
          }
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="hiw-stage-orbit-b absolute inset-[15%] rounded-full border border-dashed border-cyan-300/[0.2]"
        />

        <motion.div
          animate={
            active && !reducedMotion
              ? { rotate: 360 }
              : undefined
          }
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="hiw-stage-orbit-c absolute inset-[28%] rounded-full border border-dashed border-blue-300/[0.22]"
        />

        <div className="absolute inset-[9%] rotate-[63deg] rounded-[40px] border border-white/[0.045] [background-image:linear-gradient(rgba(103,232,249,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,.08)_1px,transparent_1px)] [background-size:42px_42px] [transform:rotateX(63deg)_rotateZ(24deg)]" />

        <div className="hiw-stage-core-wrap absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 will-change-transform">
          <motion.div
            animate={
              active && !reducedMotion
                ? {
                    scale: [0.94, 1.06, 0.94],
                    opacity: [0.72, 1, 0.72],
                  }
                : undefined
            }
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full border border-cyan-300/30 bg-cyan-300/[0.035] shadow-[0_0_70px_rgba(34,211,238,.12)]"
          />

          <div className="absolute inset-[22%] rounded-full border border-white/15 bg-[#061322]/80 shadow-[0_0_60px_rgba(45,212,191,.16)] backdrop-blur-sm" />
          <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_22px_rgba(103,232,249,.95),0_0_55px_rgba(34,211,238,.55)]" />
        </div>

        {[
          ["12%", "30%", "bg-teal-300", "shadow-[0_0_18px_rgba(94,234,212,.8)]"],
          ["76%", "18%", "bg-cyan-300", "shadow-[0_0_18px_rgba(103,232,249,.78)]"],
          ["82%", "72%", "bg-blue-300", "shadow-[0_0_18px_rgba(147,197,253,.76)]"],
          ["20%", "80%", "bg-indigo-300", "shadow-[0_0_18px_rgba(165,180,252,.7)]"],
        ].map(([left, top, bg, shadow], index) => (
          <motion.span
            key={`${left}-${top}`}
            animate={
              active && !reducedMotion
                ? {
                    scale: [0.85, 1.5, 0.85],
                    opacity: [0.6, 1, 0.6],
                  }
                : undefined
            }
            transition={{
              duration: 2.6 + index * 0.35,
              repeat: Infinity,
              delay: index * 0.16,
              ease: "easeInOut",
            }}
            className={`hiw-stage-node absolute h-3 w-3 rounded-full ${bg} ${shadow}`}
            style={{ left, top }}
          />
        ))}
      </motion.div>

      <div
        className="hiw-intro-beam pointer-events-none absolute bottom-0 top-0 w-44 bg-gradient-to-r from-transparent via-cyan-300/[0.12] to-transparent blur-sm"
        aria-hidden="true"
      />

      <div className="relative z-20 mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[minmax(0,.88fr)_minmax(430px,1.12fr)] lg:gap-10 lg:px-8 xl:px-14 2xl:px-16">
        <div className="hiw-intro-copy-wrap max-w-[690px] will-change-transform lg:ml-2 xl:ml-4">
          <div className="hiw-intro-copy">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.68,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex items-center gap-3"
            >
              <span className="relative flex h-2.5 w-2.5">
                <motion.span
                  animate={
                    active && !reducedMotion
                      ? {
                          scale: [1, 2.2, 1],
                          opacity: [0.58, 0, 0.58],
                        }
                      : undefined
                  }
                  transition={{
                    duration: 2.15,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="absolute inset-0 rounded-full bg-teal-300"
                />

                <span className="relative h-2.5 w-2.5 rounded-full bg-teal-300 shadow-[0_0_16px_rgba(94,234,212,.9)]" />
              </span>

              <p className="text-[11px] font-semibold tracking-[0.22em] text-teal-300 uppercase sm:text-xs">
                {eyebrow}
              </p>
            </motion.div>

            <motion.h1
              initial={
                reducedMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 42,
                      rotateX: 10,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0,
              }}
              transition={{
                duration: 0.9,
                delay: 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-5 max-w-[850px] text-[clamp(2.65rem,5.4vw,4rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white"
              style={{ transformPerspective: 900 }}
            >
              {headline}
            </motion.h1>

            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{
                duration: 0.78,
                delay: 0.33,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-7 h-px w-32 origin-left bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400"
            />

            <motion.p
              initial={
                reducedMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 22,
                    }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.72,
                delay: 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-6 max-w-[620px] text-base leading-relaxed text-white/64 sm:text-lg lg:text-[1.08rem]"
            >
              {body}
            </motion.p>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.54 }}
              className="mt-8 flex flex-wrap gap-2"
              aria-hidden="true"
            >
              {["01", "02", "03"].map((item, index) => (
                <span
                  key={item}
                  className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 font-mono text-[8px] tracking-[0.14em] text-white/34 backdrop-blur-sm"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      index === 0
                        ? "bg-teal-300"
                        : index === 1
                          ? "bg-cyan-300"
                          : "bg-blue-300"
                    }`}
                  />
                  SIGNAL {item}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="hidden min-h-[500px] lg:block" aria-hidden="true" />
      </div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.74 }}
        className="hiw-intro-scroll pointer-events-none absolute bottom-7 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-3 text-[8px] font-semibold tracking-[0.18em] text-white/28 uppercase md:flex"
        aria-hidden="true"
      >
        <span className="h-px w-8 bg-white/18" />
        Scroll to explore
        <span className="h-px w-8 bg-white/18" />
      </motion.div>

      <div
        className="pointer-events-none absolute right-5 top-1/2 z-30 hidden h-28 w-px -translate-y-1/2 overflow-hidden bg-white/[0.07] lg:block"
        aria-hidden="true"
      >
        <div className="hiw-intro-progress h-full w-full origin-top scale-y-0 bg-gradient-to-b from-teal-300 via-cyan-300 to-blue-400" />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#020817] via-[#020817]/92 to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}

/* ========================================================================== */
/* WORKFLOW — LIGHTWEIGHT THREE.JS SIGNAL CONSTELLATION                      */
/* ========================================================================== */

function WorkflowSignalField({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const { points, edges } = useMemo(() => {
    const count = 34;
    const pointData = new Float32Array(count * 3);
    const edgeData: number[] = [];
    let seed = 72119;

    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let index = 0; index < count; index += 1) {
      pointData[index * 3] = (random() - 0.5) * 13.5 + 1.8;
      pointData[index * 3 + 1] = (random() - 0.5) * 7.4;
      pointData[index * 3 + 2] = (random() - 0.5) * 5.2 - 1.4;
    }

    for (let index = 0; index < 22; index += 1) {
      const a = Math.floor(random() * count);
      let b = Math.floor(random() * count);

      if (a === b) b = (b + 1) % count;

      edgeData.push(
        pointData[a * 3],
        pointData[a * 3 + 1],
        pointData[a * 3 + 2],
        pointData[b * 3],
        pointData[b * 3 + 1],
        pointData[b * 3 + 2],
      );
    }

    return {
      points: pointData,
      edges: new Float32Array(edgeData),
    };
  }, []);

  useFrame((state, delta) => {
    if (!active || reducedMotion) return;

    if (rootRef.current) {
      rootRef.current.rotation.z += delta * 0.007;
      rootRef.current.rotation.y = THREE.MathUtils.lerp(
        rootRef.current.rotation.y,
        state.pointer.x * 0.08,
        0.025,
      );
      rootRef.current.rotation.x = THREE.MathUtils.lerp(
        rootRef.current.rotation.x,
        -state.pointer.y * 0.035,
        0.025,
      );
    }

    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.009;
      pointsRef.current.rotation.x += delta * 0.002;
    }
  });

  return (
    <group ref={rootRef} position={[1.35, 0, 0]}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[edges, 3]}
          />
        </bufferGeometry>

        <lineBasicMaterial
          color="#0891b2"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </lineSegments>

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[points, 3]}
          />
        </bufferGeometry>

        <pointsMaterial
          size={0.045}
          color="#2563eb"
          transparent
          opacity={0.38}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      <mesh rotation={[Math.PI / 2.35, 0.18, 0.32]} position={[2.4, 0.2, -1.4]}>
        <torusGeometry args={[2.45, 0.012, 8, 96]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.12} />
      </mesh>

      <mesh rotation={[Math.PI / 2.05, -0.5, -0.18]} position={[2.4, 0.2, -1.4]}>
        <torusGeometry args={[1.75, 0.012, 8, 90]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.11} />
      </mesh>

      <mesh rotation={[0.42, 0.62, 0.12]} position={[2.4, 0.2, -2]}>
        <icosahedronGeometry args={[1.08, 1]} />
        <meshBasicMaterial
          color="#6366f1"
          wireframe
          transparent
          opacity={0.055}
        />
      </mesh>

      {[
        [-3.8, -1.55, -0.8, "#14b8a6"],
        [-1.1, 1.75, -1.35, "#06b6d4"],
        [2.25, -1.3, -0.65, "#3b82f6"],
        [4.9, 1.45, -1.5, "#6366f1"],
      ].map(([x, y, z, color], index) => (
        <mesh
          key={index}
          position={[x as number, y as number, z as number]}
        >
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color={color as string} />
        </mesh>
      ))}
    </group>
  );
}

/* ========================================================================== */
/* WORKFLOW                                                                   */
/* ========================================================================== */

function WorkflowSection({
  steps,
}: {
  steps: HowStep[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const [active, setActive] = useState(0);

  const sectionActive = useNearViewport(sectionRef, "260px");
  const enhancedVisuals = useEnhancedVisuals();
  const mountSignalField = useDeferredMount(
    sectionActive && enhancedVisuals && !reducedMotion,
    360,
  );

  const current = steps[active] ?? steps[0];

  useEffect(() => {
    if (active > steps.length - 1) {
      setActive(0);
    }
  }, [active, steps.length]);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || reducedMotion || typeof window === "undefined") {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const shell = section.querySelector<HTMLElement>(".wf2-shell");
      const navItems = Array.from(
        section.querySelectorAll<HTMLElement>(".wf2-nav-item"),
      );
      const panel = section.querySelector<HTMLElement>(".wf2-panel");
      const mockups = Array.from(
        section.querySelectorAll<HTMLElement>(".wf2-mockup"),
      );
      const route = section.querySelector<SVGPathElement>(".wf2-route");
      const routeGlow = section.querySelector<SVGPathElement>(".wf2-route-glow");
      const grid = section.querySelector<HTMLElement>(".wf2-grid");
      const scan = section.querySelector<HTMLElement>(".wf2-scan");
      const orbitA = section.querySelector<HTMLElement>(".wf2-orbit-a");
      const orbitB = section.querySelector<HTMLElement>(".wf2-orbit-b");
      const orbitC = section.querySelector<HTMLElement>(".wf2-orbit-c");
      const glowA = section.querySelector<HTMLElement>(".wf2-glow-a");
      const glowB = section.querySelector<HTMLElement>(".wf2-glow-b");
      const nodes = Array.from(
        section.querySelectorAll<HTMLElement>(".wf2-node"),
      );

      gsap.set(shell, {
        autoAlpha: 0,
        y: 34,
      });

      gsap.set(navItems, {
        autoAlpha: 0,
        x: -16,
      });

      gsap.set(panel, {
        autoAlpha: 0,
        y: 24,
        scale: 0.992,
      });

      gsap.set(mockups, {
        autoAlpha: 0,
        y: 22,
      });

      gsap.set(nodes, {
        autoAlpha: 0,
        scale: 0.55,
      });

      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          once: true,
        },
      });

      intro
        .to(shell, {
          autoAlpha: 1,
          y: 0,
          duration: 0.72,
          ease: "power4.out",
        })
        .to(
          navItems,
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.42,
            stagger: 0.055,
          },
          "-=0.48",
        )
        .to(
          panel,
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.62,
            ease: "power4.out",
          },
          "-=0.42",
        )
        .to(
          mockups,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.46,
            stagger: 0.06,
          },
          "-=0.34",
        )
        .to(
          nodes,
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.34,
            stagger: 0.045,
            ease: "back.out(1.8)",
          },
          "-=0.42",
        );

      if (route && routeGlow) {
        const length = route.getTotalLength();

        gsap.set([route, routeGlow], {
          strokeDasharray: length,
          strokeDashoffset: length,
        });

        gsap.to(routeGlow, {
          strokeDashoffset: length * 0.08,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 90%",
            end: "bottom 24%",
            scrub: 0.72,
            invalidateOnRefresh: true,
          },
        });

        gsap.to(route, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 90%",
            end: "bottom 24%",
            scrub: 0.72,
            invalidateOnRefresh: true,
          },
        });
      }

      if (grid) {
        gsap.fromTo(
          grid,
          { x: -18, y: -12 },
          {
            x: 44,
            y: 30,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.05,
            },
          },
        );
      }

      if (scan) {
        gsap.fromTo(
          scan,
          {
            xPercent: -150,
            autoAlpha: 0,
          },
          {
            xPercent: 165,
            autoAlpha: 0.75,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 92%",
              end: "bottom 18%",
              scrub: 0.78,
            },
          },
        );
      }

      if (orbitA) {
        gsap.fromTo(
          orbitA,
          { rotation: -18, scale: 0.92 },
          {
            rotation: 26,
            scale: 1.04,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.05,
            },
          },
        );
      }

      if (orbitB) {
        gsap.fromTo(
          orbitB,
          { rotation: 20, scale: 0.95 },
          {
            rotation: -32,
            scale: 1.08,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.1,
            },
          },
        );
      }

      if (orbitC) {
        gsap.fromTo(
          orbitC,
          { rotation: -12 },
          {
            rotation: 38,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.15,
            },
          },
        );
      }

      if (glowA) {
        gsap.fromTo(
          glowA,
          { x: -32, y: 30, scale: 0.92 },
          {
            x: 42,
            y: -36,
            scale: 1.08,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.08,
            },
          },
        );
      }

      if (glowB) {
        gsap.fromTo(
          glowB,
          { x: 34, y: -28, scale: 0.94 },
          {
            x: -40,
            y: 34,
            scale: 1.1,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.16,
            },
          },
        );
      }
    }, section);

    return () => ctx.revert();
  }, [reducedMotion, steps.length]);

  useEffect(() => {
    const section = sectionRef.current;

    if (
      !section ||
      reducedMotion ||
      !sectionActive ||
      typeof window === "undefined"
    ) {
      return;
    }

    const ctx = gsap.context(() => {
      const lanes = gsap.utils.toArray<SVGPathElement>(
        ".wf2-electric-lane",
      );

      lanes.forEach((lane, index) => {
        gsap.fromTo(
          lane,
          { strokeDashoffset: 0 },
          {
            strokeDashoffset: -(190 + index * 42),
            duration: 4.2 + index * 0.8,
            repeat: -1,
            ease: "none",
          },
        );
      });

      gsap.to(".wf2-orbit-signal", {
        rotation: 360,
        duration: 30,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });

      gsap.to(".wf2-orbit-signal-reverse", {
        rotation: -360,
        duration: 24,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion, sectionActive]);

  if (!current) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[#f7fafc] px-6 py-20 text-slate-950 sm:py-24 lg:py-28"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Distinct blueprint / signal-map background                         */}
      {/* ------------------------------------------------------------------ */}

      <div className="absolute inset-0 bg-[#f7fafc]" />

      {mountSignalField ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: sectionActive ? 0.72 : 0.34 }}
          transition={{ duration: 0.65 }}
          className="pointer-events-none absolute inset-0 hidden lg:block"
          aria-hidden="true"
        >
          <Canvas
            frameloop="demand"
            camera={{ position: [0, 0, 8], fov: 50 }}
            dpr={1}
            gl={{
              alpha: true,
              antialias: false,
              powerPreference: "high-performance",
            }}
          >
            <WorkflowSignalField
              active={sectionActive}
              reducedMotion={reducedMotion}
            />
            <DemandFramePump
              active={sectionActive && !reducedMotion}
              fps={20}
            />
          </Canvas>
        </motion.div>
      ) : null}

      <div
        className="wf2-grid pointer-events-none absolute -inset-24 opacity-[0.32] [background-image:linear-gradient(rgba(15,23,42,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.055)_1px,transparent_1px)] [background-size:72px_72px]"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_24%,rgba(45,212,191,.10),transparent_25%),radial-gradient(circle_at_84%_70%,rgba(96,165,250,.10),transparent_28%),linear-gradient(180deg,rgba(255,255,255,.55),rgba(248,250,252,.86))]"
        aria-hidden="true"
      />

      <div
        className="wf2-glow-a pointer-events-none absolute -left-40 top-12 h-[420px] w-[420px] rounded-full bg-teal-300/[0.20] blur-[125px]"
        aria-hidden="true"
      />

      <div
        className="wf2-glow-b pointer-events-none absolute -right-36 bottom-[-80px] h-[460px] w-[460px] rounded-full bg-blue-400/[0.18] blur-[135px]"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {[18, 42, 68].map((top, index) => (
          <motion.div
            key={top}
            animate={
              sectionActive && !reducedMotion
                ? {
                    x: ["-28%", "138%"],
                    opacity: [0, 0.42, 0],
                  }
                : { opacity: 0 }
            }
            transition={{
              duration: 6.6 + index * 1.35,
              delay: index * 0.9,
              repeat: Infinity,
              ease: "linear",
            }}
            className={`absolute h-px w-[28%] bg-gradient-to-r from-transparent ${
              index === 0
                ? "via-teal-400/85"
                : index === 1
                  ? "via-cyan-400/80"
                  : "via-blue-500/75"
            } to-transparent shadow-[0_0_18px_rgba(34,211,238,.16)]`}
            style={{ top: `${top}%` }}
          />
        ))}
      </div>

      <div
        className="pointer-events-none absolute right-[4%] top-1/2 hidden h-[620px] w-[620px] -translate-y-1/2 lg:block"
        aria-hidden="true"
      >
        <div className="wf2-orbit-signal absolute inset-[34px] rounded-full border border-dashed border-teal-500/[0.28]" />
        <div className="wf2-orbit-signal-reverse absolute inset-[116px] rounded-full border border-dashed border-blue-500/[0.24]" />
        <div className="wf2-orbit-a absolute inset-0 rounded-full border border-cyan-500/[0.15]" />
        <div className="wf2-orbit-b absolute inset-[74px] rounded-full border border-blue-500/[0.15]" />
        <div className="wf2-orbit-c absolute inset-[154px] rounded-full border border-indigo-500/[0.14]" />

        <div className="absolute left-1/2 top-1/2 h-px w-[560px] -translate-x-1/2 -translate-y-1/2 rotate-[18deg] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-px w-[520px] -translate-x-1/2 -translate-y-1/2 -rotate-[32deg] bg-gradient-to-r from-transparent via-blue-500/18 to-transparent" />
      </div>

      <svg
        viewBox="0 0 1200 760"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="wf2-route-gradient"
            x1="0%"
            y1="20%"
            x2="100%"
            y2="80%"
          >
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.08" />
            <stop offset="38%" stopColor="#06b6d4" stopOpacity="0.64" />
            <stop offset="72%" stopColor="#3b82f6" stopOpacity="0.54" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.10" />
          </linearGradient>
        </defs>

        <path
          className="wf2-route-glow"
          d="M 30 610 C 235 575 220 315 435 322 C 670 330 615 115 855 145 C 1030 168 1058 314 1175 300"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.055"
        />

        <path
          className="wf2-route"
          d="M 30 610 C 235 575 220 315 435 322 C 670 330 615 115 855 145 C 1030 168 1058 314 1175 300"
          fill="none"
          stroke="url(#wf2-route-gradient)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />

        <path
          className="wf2-electric-lane"
          d="M 52 654 C 250 610 250 410 454 394 C 690 375 720 228 930 234 C 1040 238 1112 278 1188 252"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="1.55"
          strokeDasharray="5 18"
          strokeLinecap="round"
          opacity="0.58"
        />

        <path
          className="wf2-electric-lane"
          d="M 6 535 C 210 505 300 244 500 262 C 694 278 742 88 955 112 C 1070 125 1120 196 1192 182"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1.45"
          strokeDasharray="3 20"
          strokeLinecap="round"
          opacity="0.52"
        />

        <path
          className="wf2-electric-lane"
          d="M 122 720 C 302 650 340 512 562 490 C 770 468 850 348 1015 364 C 1090 372 1148 410 1205 394"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.4"
          strokeDasharray="4 22"
          strokeLinecap="round"
          opacity="0.46"
        />
      </svg>

      {[
        ["12%", "71%", "bg-teal-400", "border-teal-400/45"],
        ["36%", "43%", "bg-cyan-400", "border-cyan-400/45"],
        ["63%", "23%", "bg-blue-400", "border-blue-400/45"],
        ["82%", "55%", "bg-indigo-400", "border-indigo-400/45"],
      ].map(([left, top, color, ring], index) => (
        <span
          key={`${left}-${top}`}
          className="wf2-node pointer-events-none absolute hidden h-2 w-2 lg:block"
          style={{ left, top }}
          aria-hidden="true"
        >
          <span
            className={`absolute inset-0 rounded-full ${color} shadow-[0_0_18px_rgba(34,211,238,.34)]`}
          />
          <motion.span
            animate={
              sectionActive && !reducedMotion
                ? {
                    scale: [1, 3.2, 1],
                    opacity: [0.48, 0, 0.48],
                  }
                : { opacity: 0 }
            }
            transition={{
              duration: 2.6 + index * 0.28,
              delay: index * 0.34,
              repeat: Infinity,
              ease: "easeOut",
            }}
            className={`absolute -inset-2 rounded-full border ${ring}`}
          />
        </span>
      ))}

      <div
        className="wf2-scan pointer-events-none absolute bottom-0 top-0 w-36 bg-gradient-to-r from-transparent via-cyan-300/[0.18] to-transparent blur-lg"
        aria-hidden="true"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Interactive workflow shell                                         */}
      {/* ------------------------------------------------------------------ */}

      <div className="wf2-shell relative z-10 mx-auto max-w-6xl">
        <div className="mb-8 flex items-end justify-between gap-6 sm:mb-10">
          <div className="flex items-center gap-3">
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full border border-teal-200 bg-white/80 px-2 font-mono text-[9px] font-semibold tracking-[0.12em] text-teal-700 shadow-sm">
              {String(steps.length).padStart(2, "0")}
            </span>
            <span className="h-px w-14 bg-gradient-to-r from-teal-500/60 to-transparent" />
          </div>

          <div className="hidden items-center gap-2 text-[8px] font-semibold tracking-[0.16em] text-slate-400 uppercase sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.45)]" />
            Interactive workflow
          </div>
        </div>

        {/* Mobile/tablet: all controls stay immediately accessible. */}
        <div className="sticky top-20 z-30 -mx-6 mb-5 border-y border-slate-200/80 bg-[#f7fafc]/92 px-6 py-3 backdrop-blur-md lg:hidden">
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ol className="flex min-w-max gap-2">
              {steps.map((step, index) => {
                const selected = active === index;

                return (
                  <li key={`mobile-${step.title}`}>
                    <motion.button
                      type="button"
                      onClick={() => setActive(index)}
                      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                      className={`rounded-full border px-3.5 py-2 text-left transition-[background-color,border-color,color,box-shadow] duration-300 ${
                        selected
                          ? "border-slate-900 bg-slate-950 text-white shadow-[0_8px_24px_rgba(15,23,42,.16)]"
                          : "border-slate-200 bg-white/85 text-slate-500 hover:border-cyan-200 hover:text-slate-900"
                      }`}
                      aria-current={selected ? "step" : undefined}
                    >
                      <span className="font-mono text-[9px] opacity-60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="ml-2 text-xs font-semibold">
                        {step.title}
                      </span>
                    </motion.button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[20rem_minmax(0,1fr)] xl:gap-10">
          {/* -------------------------------------------------------------- */}
          {/* LEFT — persistent controls                                     */}
          {/* -------------------------------------------------------------- */}

          <aside className="relative hidden lg:block">
            <div className="sticky top-28 rounded-[26px] border border-slate-200/80 bg-white/76 p-3 shadow-[0_22px_70px_rgba(15,23,42,.07)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between px-3 pb-3 pt-2">
                <span className="text-[9px] font-semibold tracking-[0.17em] text-slate-400 uppercase">
                  Process map
                </span>

                <span className="font-mono text-[9px] text-teal-600">
                  {String(active + 1).padStart(2, "0")}
                  <span className="mx-1 text-slate-300">/</span>
                  {String(steps.length).padStart(2, "0")}
                </span>
              </div>

              <ol className="space-y-1.5">
                {steps.map((step, index) => {
                  const selected = active === index;

                  return (
                    <li key={step.title} className="wf2-nav-item">
                      <motion.button
                        type="button"
                        onClick={() => setActive(index)}
                        whileHover={
                          reducedMotion || selected
                            ? undefined
                            : { x: 3 }
                        }
                        whileTap={
                          reducedMotion ? undefined : { scale: 0.985 }
                        }
                        transition={{
                          duration: 0.22,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-[background-color,border-color,color,box-shadow] duration-300 ${
                          selected
                            ? "border-cyan-200/90 bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,.14)]"
                            : "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white/80 hover:text-slate-900"
                        }`}
                        aria-current={selected ? "step" : undefined}
                      >
                        <span
                          className={`absolute bottom-0 left-0 top-0 w-[2px] transition-opacity duration-300 ${
                            selected
                              ? "bg-gradient-to-b from-teal-400 via-cyan-400 to-blue-500 opacity-100"
                              : "opacity-0"
                          }`}
                          aria-hidden="true"
                        />

                        <div className="relative flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-7 min-w-7 items-center justify-center rounded-lg border font-mono text-[9px] transition-colors duration-300 ${
                              selected
                                ? "border-white/10 bg-white/[0.07] text-teal-300"
                                : "border-slate-200 bg-white text-slate-400"
                            }`}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <div className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold leading-snug">
                              {step.title}
                            </span>
                            <span
                              className={`mt-1 block truncate text-[9px] font-medium tracking-[0.08em] uppercase ${
                                selected ? "text-white/35" : "text-slate-400"
                              }`}
                            >
                              {step.status}
                            </span>
                          </div>

                          <span
                            className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full transition-[background-color,box-shadow,transform] duration-300 ${
                              selected
                                ? "scale-125 bg-teal-300 shadow-[0_0_12px_rgba(94,234,212,.7)]"
                                : "bg-slate-200"
                            }`}
                            aria-hidden="true"
                          />
                        </div>
                      </motion.button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>

          {/* -------------------------------------------------------------- */}
          {/* RIGHT — one stable viewport; content changes in-place          */}
          {/* -------------------------------------------------------------- */}

          <div className="min-w-0">
            <div className="wf2-panel relative overflow-hidden rounded-[30px] border border-slate-200/90 bg-white/84 shadow-[0_30px_100px_rgba(15,23,42,.10)] backdrop-blur-xl">
              <div
                className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-teal-300/[0.16] via-cyan-300/[0.18] to-blue-400/[0.14] blur-[80px]"
                aria-hidden="true"
              />

              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"
                aria-hidden="true"
              />

              <motion.div
                key={`wf2-panel-energy-${active}`}
                initial={
                  reducedMotion
                    ? false
                    : { x: "-145%", opacity: 0 }
                }
                animate={
                  reducedMotion
                    ? { opacity: 0 }
                    : {
                        x: "255%",
                        opacity: [0, 0.42, 0],
                      }
                }
                transition={{
                  duration: 1.15,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute -top-[30%] bottom-[-30%] z-10 w-16 rotate-[16deg] bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent blur-xl"
                aria-hidden="true"
              />

              <div className="relative z-20 border-b border-slate-100 px-6 py-5 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                      <motion.span
                        key={`status-pulse-${active}`}
                        initial={reducedMotion ? false : { scale: 1, opacity: 0.45 }}
                        animate={
                          reducedMotion
                            ? { opacity: 1 }
                            : { scale: [1, 2.1, 1], opacity: [0.45, 0, 0.45] }
                        }
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full bg-teal-400"
                      />
                      <span className="relative h-2.5 w-2.5 rounded-full bg-teal-500" />
                    </span>

                    <span className="text-[9px] font-semibold tracking-[0.17em] text-teal-700 uppercase">
                      {current.status}
                    </span>
                  </div>

                  <span className="font-mono text-[10px] tracking-[0.13em] text-slate-400">
                    STEP {String(active + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Grid overlap keeps panel height stable across selections. */}
              <div className="relative z-20 grid px-6 py-7 sm:px-8 sm:py-8">
                {steps.map((step, index) => {
                  const selected = active === index;

                  return (
                    <motion.div
                      key={`panel-${step.title}`}
                      initial={false}
                      animate={
                        selected
                          ? {
                              opacity: 1,
                              y: 0,
                              scale: 1,
                              filter: "blur(0px)",
                            }
                          : {
                              opacity: 0,
                              y: 12,
                              scale: 0.992,
                              filter: "blur(2px)",
                            }
                      }
                      transition={{
                        duration: reducedMotion ? 0 : 0.38,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className={`col-start-1 row-start-1 ${
                        selected ? "pointer-events-auto" : "pointer-events-none"
                      }`}
                      aria-hidden={!selected}
                    >
                      <div className="flex items-start gap-4 sm:gap-5">
                        <span className="hidden h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 font-mono text-[10px] text-slate-400 sm:flex">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div className="min-w-0 flex-1">
                          <h2 className="max-w-3xl text-2xl font-semibold leading-tight tracking-[-0.035em] text-slate-950 sm:text-3xl lg:text-[2.15rem]">
                            {step.title}
                          </h2>

                          <div className="mt-5 h-px w-24 bg-gradient-to-r from-teal-500 via-cyan-500 to-transparent" />

                          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                            {step.text}
                          </p>

                          <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200/90 bg-[#07111f] shadow-[0_18px_45px_rgba(15,23,42,.12)]">
                            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                              <div className="flex items-center gap-2" aria-hidden="true">
                                <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/60" />
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-300/45" />
                              </div>

                              <span className="text-[8px] font-semibold tracking-[0.15em] text-white/28 uppercase">
                                Audit trace
                              </span>
                            </div>

                            <p className="px-4 py-4 font-mono text-xs leading-relaxed text-teal-300/88 sm:px-5">
                              {step.audit}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="relative z-20 flex items-center justify-between border-t border-slate-100 px-6 py-4 sm:px-8">
                <div className="flex items-center gap-2">
                  {steps.map((step, index) => (
                    <button
                      key={`dot-${step.title}`}
                      type="button"
                      onClick={() => setActive(index)}
                      className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                        active === index
                          ? "w-8 bg-gradient-to-r from-teal-500 to-cyan-500"
                          : "w-2 bg-slate-200 hover:bg-slate-300"
                      }`}
                      aria-label={`Show step ${index + 1}: ${step.title}`}
                    />
                  ))}
                </div>

                <span className="text-[8px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                  Select any step
                </span>
              </div>
            </div>

            {/* Mockups remain directly below the active workflow panel. */}
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[DashboardMockup, ApprovalMockup, StatusMockup].map(
                (Mockup, index) => (
                  <motion.div
                    key={index}
                    className="wf2-mockup overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,.07)]"
                    whileHover={
                      reducedMotion
                        ? undefined
                        : {
                            y: -5,
                            scale: 1.006,
                          }
                    }
                    transition={{
                      duration: 0.28,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <Mockup />
                  </motion.div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f7fafc] to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}

/* ========================================================================== */
/* EXCEPTIONS — PINNED DECISION STORY                                         */
/* ========================================================================== */

function ExceptionDecisionField({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, connections } = useMemo(() => {
    const count = 28;
    const points = new Float32Array(count * 3);
    const edges: number[] = [];
    let seed = 71321;

    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let index = 0; index < count; index += 1) {
      points[index * 3] = (random() - 0.5) * 12.5;
      points[index * 3 + 1] = (random() - 0.5) * 7.2;
      points[index * 3 + 2] = (random() - 0.5) * 6.5 - 1.5;
    }

    for (let index = 0; index < 16; index += 1) {
      const a = Math.floor(random() * count);
      let b = Math.floor(random() * count);
      if (a === b) b = (b + 1) % count;

      edges.push(
        points[a * 3],
        points[a * 3 + 1],
        points[a * 3 + 2],
        points[b * 3],
        points[b * 3 + 1],
        points[b * 3 + 2],
      );
    }

    return {
      positions: points,
      connections: new Float32Array(edges),
    };
  }, []);

  useFrame((state, delta) => {
    if (!active || reducedMotion) return;

    if (rootRef.current) {
      rootRef.current.rotation.y = THREE.MathUtils.lerp(
        rootRef.current.rotation.y,
        state.pointer.x * 0.07,
        0.025,
      );
      rootRef.current.rotation.x = THREE.MathUtils.lerp(
        rootRef.current.rotation.x,
        -state.pointer.y * 0.035,
        0.025,
      );
      rootRef.current.rotation.z += delta * 0.008;
    }

    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.014;
    }
  });

  return (
    <group ref={rootRef} position={[1.4, 0, -1.4]}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[connections, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          color="#67e8f9"
          transparent
          opacity={0.58}
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      <mesh rotation={[Math.PI / 2.1, 0.1, 0.28]}>
        <torusGeometry args={[2.45, 0.012, 8, 100]} />
        <meshBasicMaterial color="#2dd4bf" transparent opacity={0.16} />
      </mesh>

      <mesh rotation={[Math.PI / 2.5, -0.38, -0.18]}>
        <torusGeometry args={[1.62, 0.011, 8, 90]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.15} />
      </mesh>

      <mesh rotation={[0.45, 0.8, 0.1]}>
        <icosahedronGeometry args={[0.78, 1]} />
        <meshBasicMaterial
          color="#818cf8"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>
    </group>
  );
}

function ExceptionsSection({
  headline,
  body,
  items,
}: {
  headline: string;
  body: string;
  items: ExceptionItem[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const sectionActive = useNearViewport(sectionRef, "320px");
  const enhancedVisuals = useEnhancedVisuals();
  const mountThree = useDeferredMount(
    sectionActive && enhancedVisuals && !reducedMotion,
    360,
  );

  useEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;

    if (
      !section ||
      !scene ||
      reducedMotion ||
      typeof window === "undefined" ||
      items.length === 0
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const findHeader = () => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-site-header], header[role="banner"], header, .site-header, .app-header, .sticky.top-0',
        ),
      );

      return candidates.find((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          (style.position === "sticky" || style.position === "fixed") &&
          rect.height > 24 &&
          rect.top <= 2
        );
      });
    };

    const getHeaderOffset = () => Math.round(findHeader()?.getBoundingClientRect().height ?? 0);
    const syncHeaderOffset = () => {
      section.style.setProperty("--hiw-header-offset", `${getHeaderOffset()}px`);
    };

    syncHeaderOffset();
    window.addEventListener("resize", syncHeaderOffset, { passive: true });

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const ctx = gsap.context(() => {
        const eyebrow = scene.querySelector<HTMLElement>(".exs-eyebrow");
        const title = scene.querySelector<HTMLElement>(".exs-title");
        const bodyEl = scene.querySelector<HTMLElement>(".exs-body");
        const titleRule = scene.querySelector<HTMLElement>(".exs-title-rule");
        const intro = scene.querySelector<HTMLElement>(".exs-intro");
        const cardStage = scene.querySelector<HTMLElement>(".exs-card-stage");
        const cards = Array.from(scene.querySelectorAll<HTMLElement>(".exs-story-card"));
        const navItems = Array.from(scene.querySelectorAll<HTMLElement>(".exs-nav-item"));
        const progressFill = scene.querySelector<HTMLElement>(".exs-progress-fill");
        const route = scene.querySelector<SVGPathElement>(".exs-route");
        const routeGlow = scene.querySelector<SVGPathElement>(".exs-route-glow");
        const scanner = scene.querySelector<HTMLElement>(".exs-scanner");
        const world = scene.querySelector<HTMLElement>(".exs-world");
        const glowA = scene.querySelector<HTMLElement>(".exs-glow-a");
        const glowB = scene.querySelector<HTMLElement>(".exs-glow-b");
        const orbitA = scene.querySelector<HTMLElement>(".exs-orbit-a");
        const orbitB = scene.querySelector<HTMLElement>(".exs-orbit-b");
        const floatingNodes = Array.from(
          scene.querySelectorAll<HTMLElement>(".exs-float-node"),
        );

        gsap.set([eyebrow, title, bodyEl], { autoAlpha: 0, y: 34 });
        gsap.set(titleRule, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(cardStage, { autoAlpha: 0 });
        gsap.set(floatingNodes, { autoAlpha: 0, scale: 0.45 });

        cards.forEach((card, index) => {
          const direction = index % 2 === 0 ? 1 : -1;

          gsap.set(card, {
            autoAlpha: 0,
            x: 120 * direction,
            y: 110,
            z: -120,
            scale: 0.86,
            rotateX: 10,
            rotateY: -11 * direction,
            transformPerspective: 1400,
            transformOrigin: "center center",
          });

          gsap.set(card.querySelector(".exs-card-index"), {
            autoAlpha: 0,
            x: -16,
          });
          gsap.set(card.querySelector(".exs-card-title"), {
            autoAlpha: 0,
            y: 28,
          });
          gsap.set(card.querySelector(".exs-card-rule"), {
            scaleX: 0,
            transformOrigin: "left center",
          });
          gsap.set(card.querySelector(".exs-card-outcome"), {
            autoAlpha: 0,
            y: 20,
          });
          gsap.set(card.querySelector(".exs-card-detail"), {
            autoAlpha: 0,
            y: 20,
          });
          gsap.set(card.querySelector(".exs-card-scan"), {
            xPercent: -160,
            autoAlpha: 0,
          });
        });

        gsap.set(navItems, { autoAlpha: 0, x: -12 });

        let routeLength = 0;
        if (route) {
          routeLength = route.getTotalLength();
          gsap.set(route, {
            strokeDasharray: routeLength,
            strokeDashoffset: routeLength,
          });
        }
        if (routeGlow && routeLength) {
          gsap.set(routeGlow, {
            strokeDasharray: routeLength,
            strokeDashoffset: routeLength,
          });
        }

        const getEndDistance = () =>
          window.innerHeight * Math.max(4.2, 2.2 + items.length * 1.28);

        const tl = gsap.timeline({
          defaults: { ease: "power3.inOut" },
          scrollTrigger: {
            trigger: section,
            start: () => `top top+=${getHeaderOffset()}`,
            end: () => `+=${getEndDistance()}`,
            scrub: 0.8,
            pin: scene,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        tl.to(eyebrow, {
          autoAlpha: 1,
          y: 0,
          duration: 0.28,
          ease: "power2.out",
        })
          .to(
            title,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.72,
              ease: "power4.out",
            },
            "-=0.12",
          )
          .to(
            titleRule,
            {
              scaleX: 1,
              duration: 0.5,
              ease: "power2.out",
            },
            "-=0.42",
          )
          .to(
            bodyEl,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.48,
              ease: "power3.out",
            },
            "-=0.34",
          )
          .to(
            floatingNodes,
            {
              autoAlpha: 0.72,
              scale: 1,
              duration: 0.48,
              stagger: 0.06,
              ease: "back.out(1.8)",
            },
            "-=0.35",
          )
          .to({}, { duration: 0.36 })
          .to(intro, {
            x: -22,
            y: -170,
            scale: 0.72,
            opacity: 0.68,
            duration: 0.72,
            ease: "power3.inOut",
          })
          .to(
            cardStage,
            {
              autoAlpha: 1,
              duration: 0.24,
            },
            "-=0.34",
          )
          .to(
            navItems,
            {
              autoAlpha: 1,
              x: 0,
              duration: 0.4,
              stagger: 0.05,
            },
            "-=0.25",
          );

        cards.forEach((card, index) => {
          const cardIndex = card.querySelector<HTMLElement>(".exs-card-index");
          const cardTitle = card.querySelector<HTMLElement>(".exs-card-title");
          const cardRule = card.querySelector<HTMLElement>(".exs-card-rule");
          const outcome = card.querySelector<HTMLElement>(".exs-card-outcome");
          const detail = card.querySelector<HTMLElement>(".exs-card-detail");
          const scan = card.querySelector<HTMLElement>(".exs-card-scan");
          const nav = navItems[index];
          const direction = index % 2 === 0 ? 1 : -1;

          tl.addLabel(`exception-${index}`);

          if (navItems.length) {
            tl.to(
              navItems,
              {
                opacity: 0.28,
                scale: 0.96,
                duration: 0.2,
              },
              `exception-${index}`,
            );
          }

          if (nav) {
            tl.to(
              nav,
              {
                opacity: 1,
                scale: 1.04,
                duration: 0.24,
              },
              `exception-${index}`,
            );
            tl.to(
              nav.querySelector(".exs-nav-dot"),
              {
                scale: 1.55,
                boxShadow: "0 0 24px rgba(103,232,249,.72)",
                duration: 0.24,
              },
              `exception-${index}`,
            );
          }

          tl.to(
            card,
            {
              autoAlpha: 1,
              x: 0,
              y: 0,
              z: 0,
              scale: 1,
              rotateX: 0,
              rotateY: 0,
              duration: 0.76,
              ease: "power4.out",
            },
            `exception-${index}+=0.08`,
          )
            .to(
              cardIndex,
              {
                autoAlpha: 1,
                x: 0,
                duration: 0.3,
              },
              `exception-${index}+=0.25`,
            )
            .to(
              cardTitle,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.5,
                ease: "power3.out",
              },
              `exception-${index}+=0.28`,
            )
            .to(
              cardRule,
              {
                scaleX: 1,
                duration: 0.42,
                ease: "power2.out",
              },
              `exception-${index}+=0.4`,
            )
            .to(
              outcome,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.42,
                ease: "power3.out",
              },
              `exception-${index}+=0.46`,
            )
            .to(
              detail,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.46,
                ease: "power3.out",
              },
              `exception-${index}+=0.54`,
            );

          if (scan) {
            tl.fromTo(
              scan,
              { xPercent: -160, autoAlpha: 0 },
              {
                xPercent: 240,
                autoAlpha: 0.72,
                duration: 0.82,
                ease: "power1.inOut",
              },
              `exception-${index}+=0.34`,
            );
          }

          tl.to({}, { duration: 0.56 });

          if (index < cards.length - 1) {
            tl.to(card, {
              autoAlpha: 0,
              x: -95 * direction,
              y: -76,
              z: -80,
              scale: 0.91,
              rotateX: -6,
              rotateY: 7 * direction,
              duration: 0.58,
              ease: "power3.inOut",
            });

            if (nav) {
              tl.to(
                nav.querySelector(".exs-nav-dot"),
                {
                  scale: 1,
                  boxShadow: "0 0 0 rgba(0,0,0,0)",
                  duration: 0.2,
                },
                "<",
              );
            }
          }
        });

        tl.to({}, { duration: 0.55 });

        if (world) {
          gsap.fromTo(
            world,
            { yPercent: -7, scale: 0.94 },
            {
              yPercent: 8,
              scale: 1.1,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: () => `top top+=${getHeaderOffset()}`,
                end: () => `+=${getEndDistance()}`,
                scrub: 0.9,
                invalidateOnRefresh: true,
              },
            },
          );
        }

        if (route && routeLength) {
          gsap.to(route, {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: () => `top top+=${getHeaderOffset()}`,
              end: () => `+=${getEndDistance()}`,
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
        }

        if (routeGlow && routeLength) {
          gsap.to(routeGlow, {
            strokeDashoffset: routeLength * 0.03,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: () => `top top+=${getHeaderOffset()}`,
              end: () => `+=${getEndDistance()}`,
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
        }

        if (progressFill) {
          gsap.to(progressFill, {
            scaleX: 1,
            transformOrigin: "left center",
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: () => `top top+=${getHeaderOffset()}`,
              end: () => `+=${getEndDistance()}`,
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
        }

        if (scanner) {
          gsap.fromTo(
            scanner,
            { yPercent: -160, autoAlpha: 0.05 },
            {
              yPercent: 720,
              autoAlpha: 0.55,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: () => `top top+=${getHeaderOffset()}`,
                end: () => `+=${getEndDistance()}`,
                scrub: 0.72,
                invalidateOnRefresh: true,
              },
            },
          );
        }

        if (glowA) {
          gsap.fromTo(
            glowA,
            { x: -120, y: 90, scale: 0.78 },
            {
              x: 130,
              y: -110,
              scale: 1.22,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: () => `top top+=${getHeaderOffset()}`,
                end: () => `+=${getEndDistance()}`,
                scrub: 0.78,
              },
            },
          );
        }

        if (glowB) {
          gsap.fromTo(
            glowB,
            { x: 130, y: -80, scale: 0.82 },
            {
              x: -135,
              y: 115,
              scale: 1.18,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: () => `top top+=${getHeaderOffset()}`,
                end: () => `+=${getEndDistance()}`,
                scrub: 0.86,
              },
            },
          );
        }

        if (orbitA) {
          gsap.fromTo(
            orbitA,
            { rotation: -25, scale: 0.84 },
            {
              rotation: 68,
              scale: 1.14,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: () => `top top+=${getHeaderOffset()}`,
                end: () => `+=${getEndDistance()}`,
                scrub: 0.9,
              },
            },
          );
        }

        if (orbitB) {
          gsap.fromTo(
            orbitB,
            { rotation: 28, scale: 0.86 },
            {
              rotation: -74,
              scale: 1.2,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: () => `top top+=${getHeaderOffset()}`,
                end: () => `+=${getEndDistance()}`,
                scrub: 1,
              },
            },
          );
        }
      }, scene);

      return () => ctx.revert();
    });

    mm.add("(max-width: 1023px)", () => {
      const ctx = gsap.context(() => {
        const mobileCards = Array.from(
          scene.querySelectorAll<HTMLElement>(".exs-mobile-card"),
        );

        mobileCards.forEach((card, index) => {
          gsap.fromTo(
            card,
            {
              autoAlpha: 0,
              y: 56,
              x: index % 2 === 0 ? -22 : 22,
              scale: 0.97,
            },
            {
              autoAlpha: 1,
              y: 0,
              x: 0,
              scale: 1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: card,
                start: "top 88%",
                end: "top 58%",
                scrub: 0.5,
              },
            },
          );
        });
      }, scene);

      return () => ctx.revert();
    });

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      window.removeEventListener("resize", syncHeaderOffset);
      mm.revert();
      section.style.removeProperty("--hiw-header-offset");
    };
  }, [items.length, reducedMotion]);

  const accents = [
    {
      dot: "bg-teal-300 shadow-[0_0_20px_rgba(94,234,212,.62)]",
      line: "from-teal-300 via-cyan-300 to-transparent",
      glow: "bg-teal-400/[0.14]",
      text: "text-teal-200",
    },
    {
      dot: "bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,.62)]",
      line: "from-cyan-300 via-blue-400 to-transparent",
      glow: "bg-cyan-400/[0.13]",
      text: "text-cyan-200",
    },
    {
      dot: "bg-blue-300 shadow-[0_0_20px_rgba(147,197,253,.60)]",
      line: "from-blue-300 via-indigo-400 to-transparent",
      glow: "bg-blue-400/[0.13]",
      text: "text-blue-200",
    },
    {
      dot: "bg-indigo-300 shadow-[0_0_20px_rgba(165,180,252,.58)]",
      line: "from-indigo-300 via-violet-400 to-transparent",
      glow: "bg-indigo-400/[0.13]",
      text: "text-indigo-200",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative isolate bg-[#030914] text-white"
    >
      <div
        ref={sceneRef}
        className="relative overflow-hidden bg-[#030914] lg:h-[calc(100svh-var(--hiw-header-offset,0px))] lg:min-h-[680px]"
      >
        <div className="absolute inset-0 bg-[#030914]" />

        <div className="exs-world pointer-events-none absolute -inset-20" aria-hidden="true">
          {mountThree ? (
            <div className="absolute inset-0 opacity-80">
              <Canvas
                frameloop="demand"
                camera={{ position: [0, 0, 8], fov: 50 }}
                dpr={1}
                gl={{
                  alpha: true,
                  antialias: false,
                  powerPreference: "high-performance",
                }}
              >
                <ExceptionDecisionField
                  active={sectionActive}
                  reducedMotion={reducedMotion}
                />
                <DemandFramePump
                  active={sectionActive && !reducedMotion}
                  fps={18}
                />
              </Canvas>
            </div>
          ) : null}

          <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.17)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.17)_1px,transparent_1px)] [background-size:92px_92px]" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(45,212,191,.10),transparent_24%),radial-gradient(circle_at_82%_68%,rgba(59,130,246,.12),transparent_30%)]" />

          <div className="exs-glow-a absolute -left-44 top-8 h-[480px] w-[480px] rounded-full bg-teal-400/[0.12] blur-[145px]" />
          <div className="exs-glow-b absolute -right-44 bottom-[-100px] h-[540px] w-[540px] rounded-full bg-blue-500/[0.13] blur-[160px]" />

          <div className="absolute right-[4%] top-[50%] hidden h-[620px] w-[620px] -translate-y-1/2 lg:block">
            <div className="exs-orbit-a absolute inset-0 rounded-full border border-cyan-300/[0.10]" />
            <div className="exs-orbit-b absolute inset-[92px] rounded-full border border-dashed border-blue-300/[0.12]" />
            <div className="absolute inset-[185px] rounded-full border border-indigo-300/[0.08]" />
          </div>

          <svg
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 hidden h-full w-full lg:block"
          >
            <defs>
              <linearGradient id="exs-route-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.06" />
                <stop offset="42%" stopColor="#22d3ee" stopOpacity="0.82" />
                <stop offset="74%" stopColor="#60a5fa" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.22" />
              </linearGradient>
            </defs>

            <path
              d="M 70 580 C 250 560 315 425 445 380 C 575 335 635 410 728 332 C 830 248 892 125 1125 174"
              fill="none"
              stroke="rgba(255,255,255,.04)"
              strokeWidth="1"
            />

            <path
              className="exs-route-glow"
              d="M 70 580 C 250 560 315 425 445 380 C 575 335 635 410 728 332 C 830 248 892 125 1125 174"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="7"
              strokeLinecap="round"
              opacity="0.11"
            />

            <path
              className="exs-route"
              d="M 70 580 C 250 560 315 425 445 380 C 575 335 635 410 728 332 C 830 248 892 125 1125 174"
              fill="none"
              stroke="url(#exs-route-gradient)"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>

          {[
            ["14%", "73%"],
            ["33%", "55%"],
            ["58%", "47%"],
            ["75%", "31%"],
            ["91%", "24%"],
          ].map(([left, top], index) => (
            <span
              key={`${left}-${top}`}
              className={`exs-float-node absolute hidden h-2 w-2 rounded-full lg:block ${
                index % 2 === 0
                  ? "bg-teal-300 shadow-[0_0_16px_rgba(94,234,212,.72)]"
                  : "bg-blue-300 shadow-[0_0_16px_rgba(147,197,253,.68)]"
              }`}
              style={{ left, top }}
            />
          ))}

          <div className="exs-scanner absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-cyan-300/[0.09] to-transparent" />
        </div>

        {/* Desktop pinned story */}
        <div className="relative z-10 hidden h-full lg:block">
          <div className="exs-intro absolute left-[7%] top-1/2 w-[min(38vw,540px)] -translate-y-1/2 origin-left">
            <p className="exs-eyebrow text-[10px] font-semibold tracking-[0.2em] text-teal-300/78 uppercase">
              Exception handling
            </p>

            <h2 className="exs-title mt-4 text-[clamp(3rem,4.8vw,5.4rem)] font-medium leading-[0.96] tracking-[-0.052em] text-white">
              {headline}
            </h2>

            <div className="exs-title-rule mt-6 h-px w-28 bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400" />

            <p className="exs-body mt-6 max-w-xl text-base leading-relaxed text-white/52">
              {body}
            </p>
          </div>

          <div className="absolute bottom-[9%] left-[7%] z-20 flex flex-col gap-3">
            {items.map((item, index) => (
              <div key={`nav-${item.when}`} className="exs-nav-item flex origin-left items-center gap-3">
                <span className="exs-nav-dot h-2 w-2 rounded-full bg-white/20" />
                <span className="font-mono text-[9px] tracking-[0.15em] text-white/34">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="hidden max-w-[175px] truncate text-[10px] text-white/34 xl:block">
                  {item.when}
                </span>
              </div>
            ))}
          </div>

          <div
            className="exs-card-stage absolute left-[43%] top-1/2 h-[470px] w-[min(50vw,690px)] -translate-y-1/2"
            style={{ perspective: "1500px" }}
          >
            {items.map((item, index) => {
              const accent = accents[index % accents.length];

              return (
                <article
                  key={`story-${item.when}`}
                  className="exs-story-card absolute inset-0 will-change-transform"
                >
                  <motion.div
                    whileHover={
                      reducedMotion
                        ? undefined
                        : { y: -6, scale: 1.008 }
                    }
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="group relative h-full overflow-hidden rounded-[30px] border border-white/[0.11] bg-[#08121f]/88 p-8 shadow-[0_42px_135px_rgba(0,0,0,.42)] backdrop-blur-md xl:p-10"
                  >
                    <div className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full ${accent.glow} blur-[78px]`} />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />
                    <div className="exs-card-scan pointer-events-none absolute -top-[45%] bottom-[-45%] z-10 w-16 rotate-[18deg] bg-white/[0.10] blur-xl" />

                    <div className="relative z-20 flex h-full flex-col">
                      <div className="flex items-center justify-between gap-5">
                        <div className="exs-card-index flex items-center gap-3 font-mono text-[10px] tracking-[0.16em] text-white/34">
                          <span className={accent.text}>{String(index + 1).padStart(2, "0")}</span>
                          <span>/</span>
                          <span>{String(items.length).padStart(2, "0")}</span>
                        </div>

                        <span className={`h-3 w-3 rounded-full ${accent.dot}`} />
                      </div>

                      <h3 className="exs-card-title mt-8 max-w-[560px] text-[clamp(2.2rem,3.3vw,3.65rem)] font-medium leading-[1] tracking-[-0.045em] text-white">
                        {item.when}
                      </h3>

                      <div className={`exs-card-rule mt-7 h-px w-32 bg-gradient-to-r ${accent.line}`} />

                      <div className="mt-auto grid gap-4 pt-8">
                        <div className="exs-card-outcome rounded-2xl border border-white/[0.08] bg-white/[0.045] px-5 py-4">
                          <p className="text-[9px] font-semibold tracking-[0.16em] text-white/28 uppercase">Outcome</p>
                          <p className={`mt-2 text-base font-semibold leading-relaxed ${accent.text}`}>
                            {item.outcome}
                          </p>
                        </div>

                        <div className="exs-card-detail rounded-2xl border border-white/[0.07] bg-black/10 px-5 py-4">
                          <p className="text-[9px] font-semibold tracking-[0.16em] text-white/28 uppercase">Decision detail</p>
                          <p className="mt-2 text-sm leading-relaxed text-white/52">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </article>
              );
            })}
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-40 h-[2px] bg-white/[0.04]">
            <div className="exs-progress-fill h-full origin-left scale-x-0 bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400" />
          </div>
        </div>

        {/* Mobile/tablet — sequential scroll reveal */}
        <div className="relative z-10 px-6 py-24 lg:hidden">
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[10px] font-semibold tracking-[0.2em] text-teal-300/78 uppercase">
                Exception handling
              </p>
              <h2 className="mt-4 text-4xl font-medium leading-[1] tracking-[-0.045em] text-white sm:text-5xl">
                {headline}
              </h2>
              <div className="mt-6 h-px w-24 bg-gradient-to-r from-teal-300 via-cyan-300 to-transparent" />
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/54">
                {body}
              </p>
            </motion.div>

            <div className="mt-12 space-y-5">
              {items.map((item, index) => {
                const accent = accents[index % accents.length];

                return (
                  <article
                    key={`mobile-${item.when}`}
                    className="exs-mobile-card relative overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.045] p-5 backdrop-blur-sm sm:p-6"
                  >
                    <div className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full ${accent.glow} blur-3xl`} />
                    <div className="relative">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono text-[9px] tracking-[0.15em] text-white/32">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
                      </div>
                      <h3 className="mt-4 text-xl font-semibold text-white">{item.when}</h3>
                      <div className={`mt-4 h-px w-20 bg-gradient-to-r ${accent.line}`} />
                      <p className={`mt-4 text-sm font-semibold leading-relaxed ${accent.text}`}>
                        {item.outcome}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-white/48">{item.detail}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#030914] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#020817] to-transparent" />
      </div>
    </section>
  );
}

/* ========================================================================== */
/* FINAL CTA — HOME-STYLE PINNED PARALLAX FINALE                             */
/* ========================================================================== */

function FinalCtaMotionSection({
  headline,
  body,
  actionLabel,
}: {
  headline: string;
  body: string;
  actionLabel: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const reducedMotion = Boolean(useReducedMotion());

  const words = useMemo(
    () => headline.trim().split(/\s+/).filter(Boolean),
    [headline],
  );

  useEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;

    if (!section || !scene || reducedMotion || typeof window === "undefined") {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const findHeader = () => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-site-header], header[role="banner"], header, .site-header, .app-header, .sticky.top-0',
        ),
      );

      return candidates.find((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          (style.position === "sticky" || style.position === "fixed") &&
          rect.height > 24 &&
          rect.top <= 2
        );
      });
    };

    const getHeaderOffset = () => Math.round(findHeader()?.getBoundingClientRect().height ?? 0);
    const syncHeaderOffset = () => {
      section.style.setProperty("--hiw-header-offset", `${getHeaderOffset()}px`);
    };

    syncHeaderOffset();
    window.addEventListener("resize", syncHeaderOffset, { passive: true });

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const ctx = gsap.context(() => {
        const rings = Array.from(scene.querySelectorAll<HTMLElement>(".hcta-ring"));
        const ringShells = Array.from(
          scene.querySelectorAll<HTMLElement>(".hcta-ring-shell"),
        );
        const chars = Array.from(scene.querySelectorAll<HTMLElement>(".hcta-char"));
        const glow = scene.querySelector<HTMLElement>(".hcta-core-glow");
        const glowA = scene.querySelector<HTMLElement>(".hcta-glow-a");
        const glowB = scene.querySelector<HTMLElement>(".hcta-glow-b");
        const bodyEl = scene.querySelector<HTMLElement>(".hcta-body");
        const button = scene.querySelector<HTMLElement>(".hcta-button");
        const eyebrow = scene.querySelector<HTMLElement>(".hcta-eyebrow");
        const rule = scene.querySelector<HTMLElement>(".hcta-rule");
        const noise = scene.querySelector<HTMLElement>(".hcta-noise");
        const world = scene.querySelector<HTMLElement>(".hcta-world");
        const content = scene.querySelector<HTMLElement>(".hcta-content");
        const beam = scene.querySelector<HTMLElement>(".hcta-beam");
        const pulse = scene.querySelector<HTMLElement>(".hcta-pulse");

        gsap.set(rings, {
          scale: 0.28,
          autoAlpha: 0,
          transformOrigin: "50% 50%",
          force3D: true,
        });

        gsap.set(chars, {
          autoAlpha: 0,
          x: -8,
          force3D: true,
        });

        gsap.set([bodyEl, button, eyebrow], {
          autoAlpha: 0,
          y: 18,
        });

        gsap.set(rule, {
          scaleX: 0,
          transformOrigin: "center center",
        });

        gsap.set(glow, {
          scale: 0.34,
          autoAlpha: 0,
        });

        const distance = () => window.innerHeight * 2.85;

        const tl = gsap.timeline({
          defaults: { ease: "power3.inOut" },
          scrollTrigger: {
            trigger: section,
            start: () => `top top+=${getHeaderOffset()}`,
            end: () => `+=${distance()}`,
            scrub: 0.74,
            pin: scene,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        tl.addLabel("wake");

        tl.fromTo(
          noise,
          { opacity: 0.012 },
          { opacity: 0.045, duration: 0.6, ease: "power2.out" },
          "wake",
        );

        tl.to(
          glow,
          {
            scale: 1,
            autoAlpha: 0.76,
            duration: 0.82,
            ease: "power2.out",
          },
          "wake+=0.04",
        );

        tl.to(
          rings,
          {
            scale: 1,
            autoAlpha: 1,
            duration: 1.05,
            stagger: 0.065,
            ease: "power2.out",
          },
          "wake+=0.05",
        );

        tl.to(
          eyebrow,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.42,
            ease: "power2.out",
          },
          "wake+=0.2",
        );

        tl.to(
          chars,
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.38,
            stagger: 0.018,
            ease: "power3.out",
          },
          "wake+=0.28",
        );

        tl.to(
          rule,
          {
            scaleX: 1,
            duration: 0.62,
            ease: "power2.out",
          },
          "wake+=0.68",
        );

        tl.to(
          bodyEl,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.52,
            ease: "power3.out",
          },
          "wake+=0.76",
        );

        tl.fromTo(
          button,
          { autoAlpha: 0, y: 18, scale: 0.92 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.46,
            ease: "back.out(1.8)",
          },
          "wake+=0.9",
        );

        /* Camera-like parallax while the scene is pinned. */
        tl.to(
          world,
          {
            scale: 1.08,
            yPercent: 4,
            duration: 1.25,
            ease: "sine.inOut",
          },
          "wake+=0.55",
        );

        ringShells.forEach((shell, index) => {
          const direction = index % 2 === 0 ? 1 : -1;
          tl.to(
            shell,
            {
              y: -(12 + index * 13),
              rotation: direction * (14 + index * 8),
              duration: 1.2,
              ease: "sine.inOut",
            },
            "wake+=0.62",
          );
        });

        tl.to(
          glowA,
          {
            x: 105,
            y: -82,
            scale: 1.16,
            duration: 1.25,
            ease: "sine.inOut",
          },
          "wake+=0.55",
        );

        tl.to(
          glowB,
          {
            x: -112,
            y: 88,
            scale: 1.14,
            duration: 1.25,
            ease: "sine.inOut",
          },
          "wake+=0.55",
        );

        tl.fromTo(
          beam,
          { xPercent: -165, autoAlpha: 0 },
          {
            xPercent: 175,
            autoAlpha: 0.68,
            duration: 1.15,
            ease: "power1.inOut",
          },
          "wake+=0.78",
        );

        tl.fromTo(
          pulse,
          { yPercent: -190, autoAlpha: 0.05 },
          {
            yPercent: 740,
            autoAlpha: 0.58,
            duration: 1.2,
            ease: "none",
          },
          "wake+=0.62",
        );

        tl.to({}, { duration: 0.9 });

        tl.to(
          content,
          {
            y: -24,
            scale: 0.992,
            duration: 0.7,
            ease: "power2.inOut",
          },
        );

        tl.to(
          ringShells,
          {
            scale: (index) => 1.02 + index * 0.012,
            duration: 0.7,
            stagger: 0.035,
            ease: "sine.inOut",
          },
          "<",
        );

        tl.to({}, { duration: 0.45 });

        /* Homepage-style reverse wipe at the very end. */
        tl.to(button, {
          autoAlpha: 0,
          y: -12,
          scale: 0.96,
          duration: 0.32,
          ease: "power2.in",
        });

        tl.to(
          bodyEl,
          {
            autoAlpha: 0,
            y: -10,
            duration: 0.3,
            ease: "power2.in",
          },
          "-=0.2",
        );

        tl.to(
          rule,
          {
            scaleX: 0,
            transformOrigin: "right center",
            duration: 0.36,
            ease: "power2.in",
          },
          "-=0.18",
        );

        tl.to(
          chars,
          {
            autoAlpha: 0,
            x: -6,
            duration: 0.25,
            stagger: { each: 0.012, from: "end" },
            ease: "power2.in",
          },
          "-=0.08",
        );

        tl.to(
          eyebrow,
          {
            autoAlpha: 0,
            y: -8,
            duration: 0.25,
          },
          "-=0.22",
        );

        tl.to(
          rings,
          {
            scale: 0.56,
            autoAlpha: 0,
            duration: 0.72,
            stagger: { each: 0.035, from: "end" },
            ease: "power3.in",
          },
          "-=0.28",
        );

        tl.to(
          glow,
          {
            scale: 0.5,
            autoAlpha: 0,
            duration: 0.62,
            ease: "power2.in",
          },
          "<",
        );
      }, scene);

      return () => ctx.revert();
    });

    mm.add("(max-width: 767px)", () => {
      const ctx = gsap.context(() => {
        const world = scene.querySelector<HTMLElement>(".hcta-world");
        const content = scene.querySelector<HTMLElement>(".hcta-content");
        const ringShells = Array.from(
          scene.querySelectorAll<HTMLElement>(".hcta-ring-shell"),
        );

        gsap.fromTo(
          content,
          { y: 46 },
          {
            y: -28,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.65,
            },
          },
        );

        gsap.fromTo(
          world,
          { yPercent: -5, scale: 0.94 },
          {
            yPercent: 6,
            scale: 1.06,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.72,
            },
          },
        );

        ringShells.forEach((shell, index) => {
          gsap.fromTo(
            shell,
            { rotation: index % 2 === 0 ? -10 : 10 },
            {
              rotation: index % 2 === 0 ? 18 : -18,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.74 + index * 0.05,
              },
            },
          );
        });
      }, scene);

      return () => ctx.revert();
    });

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      window.removeEventListener("resize", syncHeaderOffset);
      mm.revert();
      section.style.removeProperty("--hiw-header-offset");
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <section className="relative overflow-hidden bg-[#020817] px-6 py-24 text-white sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            {headline}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
            {body}
          </p>
          <LocaleLink
            to="/book"
            className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white"
          >
            {actionLabel}
          </LocaleLink>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#020817] text-white"
    >
      <div
        ref={sceneRef}
        className="relative flex min-h-[760px] w-full items-center justify-center overflow-hidden px-6 md:h-[calc(100svh-var(--hiw-header-offset,0px))] md:min-h-[680px]"
      >
        <div className="absolute inset-0 bg-[#020817]" />

        <div className="hcta-world pointer-events-none absolute -inset-20" aria-hidden="true">
          <div className="absolute inset-0 bg-[#020817]" />

          <div className="hcta-noise absolute inset-0 opacity-[0.025] [background-image:radial-gradient(rgba(255,255,255,.35)_0.55px,transparent_0.55px)] [background-size:5px_5px]" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(45,212,191,.10),transparent_19%),radial-gradient(circle_at_50%_54%,rgba(59,130,246,.08),transparent_37%)]" />

          <div className="hcta-glow-a absolute -left-40 top-[12%] h-[480px] w-[480px] rounded-full bg-teal-400/[0.11] blur-[145px]" />
          <div className="hcta-glow-b absolute -right-44 bottom-[-80px] h-[540px] w-[540px] rounded-full bg-blue-500/[0.12] blur-[160px]" />

          <div className="hcta-core-glow absolute left-1/2 top-[46%] h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/[0.16] blur-[82px]" />

          {[
            "h-[clamp(240px,29vw,420px)] w-[clamp(240px,29vw,420px)] border-teal-300/[0.18]",
            "h-[clamp(390px,47vw,680px)] w-[clamp(390px,47vw,680px)] border-cyan-300/[0.18]",
            "h-[clamp(560px,67vw,960px)] w-[clamp(560px,67vw,960px)] border-blue-400/[0.15]",
            "h-[clamp(760px,88vw,1260px)] w-[clamp(760px,88vw,1260px)] border-indigo-400/[0.11]",
            "h-[clamp(980px,112vw,1600px)] w-[clamp(980px,112vw,1600px)] border-violet-400/[0.08]",
          ].map((classes, index) => (
            <div
              key={index}
              className="hcta-ring-shell absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2"
            >
              <div className={`hcta-ring rounded-full border ${classes}`} />
            </div>
          ))}

          <div className="hcta-beam absolute bottom-0 top-0 w-56 bg-gradient-to-r from-transparent via-cyan-300/[0.13] to-transparent blur-xl" />
          <div className="hcta-pulse absolute left-[18%] top-0 h-44 w-px bg-gradient-to-b from-transparent via-teal-300/65 to-transparent shadow-[0_0_28px_rgba(45,212,191,.38)]" />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,8,23,.05)_44%,rgba(2,8,23,.80)_100%)]" />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          className="hcta-content relative z-10 mx-auto w-full max-w-5xl text-center"
        >
          <div className="hcta-eyebrow mb-5 flex items-center justify-center gap-3 text-[9px] font-semibold tracking-[0.22em] text-teal-300/72 uppercase sm:text-[10px]">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-teal-300/70" />
            Ready when you are
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-teal-300/70" />
          </div>

          <h2 className="flex flex-wrap items-center justify-center text-[clamp(2.45rem,6vw,5.7rem)] font-medium leading-[0.98] tracking-[-0.055em]">
            {words.map((word, wordIndex) => {
              const accent = wordIndex === words.length - 1;

              return (
                <span
                  key={`${word}-${wordIndex}`}
                  className="mr-[0.2em] inline-flex whitespace-nowrap last:mr-0"
                >
                  {Array.from(word).map((char, charIndex) => (
                    <span
                      key={`${word}-${charIndex}`}
                      className={`hcta-char inline-block ${
                        accent
                          ? "bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent"
                          : "text-white"
                      }`}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              );
            })}
          </h2>

          <div className="hcta-rule mx-auto mt-6 h-px w-24 bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400 sm:w-28" />

          <p className="hcta-body mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/56 sm:text-base lg:text-lg">
            {body}
          </p>

          <div className="hcta-button mt-8 flex justify-center">
            <motion.div
              whileHover={{ y: -4, scale: 1.025 }}
              whileTap={{ scale: 0.98 }}
            >
              <LocaleLink
                to="/book"
                className="group inline-flex min-h-12 items-center overflow-hidden rounded-lg border border-teal-300/[0.18] bg-white/[0.045] pl-5 pr-1.5 text-xs font-semibold tracking-[0.08em] text-white shadow-[0_18px_55px_rgba(0,0,0,.22)] backdrop-blur-md transition hover:border-teal-300/35 hover:bg-white/[0.075]"
              >
                <span>{actionLabel}</span>
                <span className="ml-4 flex h-9 w-9 items-center justify-center rounded-md bg-teal-400 text-[#03101a] transition-transform duration-300 group-hover:translate-x-0.5">
                  ↗
                </span>
              </LocaleLink>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* PAGE                                                                       */
/* ========================================================================== */

export function HowItWorksPage() {
  const { t } = useTranslation("howItWorks");
  const { t: th } = useTranslation("home");
  const { t: tc } = useTranslation("common");

  const steps = t("steps", { returnObjects: true }) as HowStep[];

  const exceptions = t("exceptions.items", {
    returnObjects: true,
  }) as ExceptionItem[];

  return (
    <>
      <Seo page="how" path="/how-it-works" />

      <HowHero
        eyebrow={t("eyebrow")}
        headline={t("headline")}
        body={t("body")}
      />

      <WorkflowSection steps={steps} />

      <ExceptionsSection
        headline={t("exceptions.headline")}
        body={t("exceptions.body")}
        items={exceptions}
      />

      <FinalCtaMotionSection
        headline={th("final.headline")}
        body={th("final.body")}
        actionLabel={tc("cta.book")}
      />
    </>
  );
}
