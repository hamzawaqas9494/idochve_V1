import { RefObject, useEffect, useMemo, useRef, useState } from "react";

import { motion, useReducedMotion } from "framer-motion";

import { Canvas, useFrame, useThree } from "@react-three/fiber";

import * as THREE from "three";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useTranslation } from "react-i18next";

import { Seo } from "@/lib/seo";
import { LocaleLink } from "@/components/LocaleLink";
import { SectionHeading } from "@/components/SectionHeading";
import { VideoModal } from "@/components/VideoModal";

import { DocumentPipeline } from "@/diagrams/DocumentPipeline";
import { ArchitectureExplorer } from "@/diagrams/ArchitectureExplorer";

import {
  IntelligenceMockup,
  SearchMockup,
  AuditMockup,
} from "@/mockups/HomeMockups";

/* ==========================================================================
   TYPES
   ========================================================================== */

type DocumentType = "PDF" | "DOCX" | "TXT" | "XLSX";

type HeroConceptName = "Paper" | "Data" | "Information" | "Intelligence";

type HeroConceptCard = {
  name: HeroConceptName;
  code: string;
  caption: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  rotation: number;
  depth: number;
  direction: 1 | -1;
  visibility: string;
  accent: string;
  accentSoft: string;
};

/* ==========================================================================
   HERO CONCEPT FLOW
   ========================================================================== */

const heroConceptCards: HeroConceptCard[] = [
  {
    name: "Paper",
    code: "01",
    caption: "Source material",
    top: "5%",
    left: "-3%",
    rotation: -8,
    depth: 16,
    direction: 1,
    visibility: "hidden lg:block",
    accent: "#5eead4",
    accentSoft: "rgba(45,212,191,.16)",
  },
  {
    name: "Data",
    code: "02",
    caption: "Structured signals",
    top: "1%",
    right: "-2%",
    rotation: 7,
    depth: 22,
    direction: -1,
    visibility: "hidden lg:block",
    accent: "#22d3ee",
    accentSoft: "rgba(34,211,238,.16)",
  },
  {
    name: "Information",
    code: "03",
    caption: "Connected context",
    bottom: "5%",
    left: "-4%",
    rotation: 6,
    depth: 27,
    direction: -1,
    visibility: "hidden lg:block",
    accent: "#60a5fa",
    accentSoft: "rgba(96,165,250,.16)",
  },
  {
    name: "Intelligence",
    code: "04",
    caption: "Governed insight",
    right: "-3%",
    bottom: "2%",
    rotation: -7,
    depth: 32,
    direction: 1,
    visibility: "hidden lg:block",
    accent: "#a78bfa",
    accentSoft: "rgba(167,139,250,.16)",
  },
];

/* ==========================================================================
   DOCUMENT THEME
   ========================================================================== */

function getDocumentTheme(type: DocumentType) {
  switch (type) {
    case "PDF":
      return {
        accent: "bg-red-400",
        badge: "border-red-400/25 bg-red-500/15 text-red-200",
        shadow: "shadow-[0_20px_70px_rgba(239,68,68,0.12)]",
        glow: "bg-red-400/15",
      };

    case "DOCX":
      return {
        accent: "bg-blue-400",
        badge: "border-blue-400/25 bg-blue-500/15 text-blue-200",
        shadow: "shadow-[0_20px_70px_rgba(59,130,246,0.14)]",
        glow: "bg-blue-400/15",
      };

    case "XLSX":
      return {
        accent: "bg-emerald-400",
        badge: "border-emerald-400/25 bg-emerald-500/15 text-emerald-200",
        shadow: "shadow-[0_20px_70px_rgba(52,211,153,0.12)]",
        glow: "bg-emerald-400/15",
      };

    default:
      return {
        accent: "bg-white/60",
        badge: "border-white/15 bg-white/[0.07] text-white/70",
        shadow: "shadow-[0_20px_70px_rgba(255,255,255,0.05)]",
        glow: "bg-white/10",
      };
  }
}

/* ==========================================================================
   VIEWPORT VISIBILITY
   ========================================================================== */

function useNearViewport<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = "180px",
) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    let inViewport = false;

    const syncActiveState = () => {
      setActive(
        inViewport &&
          (typeof document === "undefined" ||
            document.visibilityState !== "hidden"),
      );
    };

    const handleVisibility = () => {
      syncActiveState();
    };

    if (typeof IntersectionObserver === "undefined") {
      inViewport = true;
      syncActiveState();
      document.addEventListener("visibilitychange", handleVisibility);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry.isIntersecting;
        syncActiveState();
      },
      {
        rootMargin,
        threshold: 0,
      },
    );

    observer.observe(element);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [ref, rootMargin]);

  return active;
}

function useEnhancedVisuals() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(min-width: 1024px)");
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };

    const sync = () => {
      const cores = nav.hardwareConcurrency || 8;
      const memory = nav.deviceMemory || 8;
      const saveData = Boolean(nav.connection?.saveData);

      setEnabled(media.matches && !saveData && cores >= 4 && memory >= 4);
    };

    sync();
    media.addEventListener?.("change", sync);

    return () => {
      media.removeEventListener?.("change", sync);
    };
  }, []);

  return enabled;
}

function usePersistentActivation(active: boolean) {
  const [activated, setActivated] = useState(active);

  useEffect(() => {
    if (active && !activated) {
      setActivated(true);
    }
  }, [active, activated]);

  return active || activated;
}

function useDeferredVisualActivation(enabled: boolean, timeout = 700) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled || ready || typeof window === "undefined") {
      return;
    }

    const browserWindow = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (
          callback: () => void,
          options?: { timeout: number },
        ) => number;
        cancelIdleCallback?: (id: number) => void;
      };

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;

    const activate = () => {
      if (cancelled) return;

      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (!cancelled) {
            setReady(true);
          }
        });
      });
    };

    if (browserWindow.requestIdleCallback) {
      idleId = browserWindow.requestIdleCallback(activate, { timeout });
    } else {
      timeoutId = window.setTimeout(activate, Math.min(timeout, 180));
    }

    return () => {
      cancelled = true;

      if (idleId !== null) {
        browserWindow.cancelIdleCallback?.(idleId);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      if (firstFrame !== null) {
        window.cancelAnimationFrame(firstFrame);
      }

      if (secondFrame !== null) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, [enabled, ready, timeout]);

  return ready;
}

function useThrottledThreeFrames(
  active: boolean,
  reducedMotion: boolean,
  fps = 30,
) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();

    if (!active || reducedMotion || typeof window === "undefined") {
      return;
    }

    const frameInterval = 1000 / fps;
    let raf = 0;
    let last = 0;

    const tick = (now: number) => {
      if (now - last >= frameInterval) {
        last = now;
        invalidate();
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [active, fps, invalidate, reducedMotion]);
}

let scrollTriggerRefreshFrame: number | null = null;

function scheduleScrollTriggerRefresh() {
  if (typeof window === "undefined" || scrollTriggerRefreshFrame !== null) {
    return;
  }

  scrollTriggerRefreshFrame = window.requestAnimationFrame(() => {
    scrollTriggerRefreshFrame = null;
    ScrollTrigger.refresh();
  });
}

/* ==========================================================================
   THREE.JS HERO
   ========================================================================== */

function ThreeParticleField({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const worldRef = useRef<THREE.Group>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 60;
    const data = new Float32Array(count * 3);

    let seed = 1337;

    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < count; i += 1) {
      data[i * 3] = (random() - 0.5) * 18;
      data[i * 3 + 1] = (random() - 0.5) * 9;
      data[i * 3 + 2] = (random() - 0.5) * 8 - 1.5;
    }

    return data;
  }, []);

  const wireConnections = useMemo(() => {
    const anchors = [
      [-5.2, 2.55, -3.2],
      [-1.7, 3.0, -3.9],
      [4.8, 2.55, -3.7],
      [5.1, -2.7, -3.4],
      [1.35, 0.05, -4.1],
    ] as const;

    const links = [
      [0, 1],
      [1, 4],
      [4, 2],
      [2, 3],
      [4, 3],
      [0, 4],
    ] as const;

    const data = new Float32Array(links.length * 6);

    links.forEach(([from, to], index) => {
      const a = anchors[from];
      const b = anchors[to];
      const offset = index * 6;

      data[offset] = a[0];
      data[offset + 1] = a[1];
      data[offset + 2] = a[2];
      data[offset + 3] = b[0];
      data[offset + 4] = b[1];
      data[offset + 5] = b[2];
    });

    return data;
  }, []);

  useThrottledThreeFrames(active, reducedMotion, 36);

  useFrame((state, delta) => {
    if (!active || reducedMotion) return;

    if (worldRef.current) {
      worldRef.current.rotation.y = THREE.MathUtils.lerp(
        worldRef.current.rotation.y,
        state.pointer.x * 0.045,
        0.022,
      );

      worldRef.current.rotation.x = THREE.MathUtils.lerp(
        worldRef.current.rotation.x,
        -state.pointer.y * 0.022,
        0.022,
      );
    }

    if (orbitRef.current) {
      orbitRef.current.rotation.z += delta * 0.009;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.0035;
      particlesRef.current.rotation.x += delta * 0.0015;
    }
  });

  const anchors = [
    [-5.2, 2.55, -3.2, "#5eead4"],
    [-1.7, 3.0, -3.9, "#22d3ee"],
    [4.8, 2.55, -3.7, "#60a5fa"],
    [5.1, -2.7, -3.4, "#a78bfa"],
  ] as const;

  return (
    <group ref={worldRef}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>

        <pointsMaterial
          size={0.031}
          color="#7dd3fc"
          transparent
          opacity={0.32}
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[wireConnections, 3]}
          />
        </bufferGeometry>

        <lineBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.09}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {anchors.map(([x, y, z, color], index) => (
        <group key={`${x}-${y}`} position={[x, y, z]}>
          <mesh rotation={[0.35 + index * 0.1, 0.5, index * 0.22]}>
            <octahedronGeometry args={[0.42 + index * 0.035, 1]} />
            <meshBasicMaterial
              color={color}
              wireframe
              transparent
              opacity={0.12}
              depthWrite={false}
            />
          </mesh>

          <mesh>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      ))}

      <group ref={orbitRef} position={[3.7, -0.1, -2.3]}>
        <mesh rotation={[Math.PI / 2.5, 0.12, 0.25]}>
          <torusGeometry args={[2.75, 0.01, 8, 88]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.11} />
        </mesh>

        <mesh rotation={[Math.PI / 2.05, 0.48, -0.15]}>
          <torusGeometry args={[1.95, 0.01, 8, 80]} />
          <meshBasicMaterial color="#2dd4bf" transparent opacity={0.12} />
        </mesh>
      </group>
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
  const enhancedVisuals = useEnhancedVisuals();
  const deferredActive = useDeferredVisualActivation(
    active && !reducedMotion && enhancedVisuals,
    1150,
  );
  const activated = usePersistentActivation(deferredActive);

  return (
    <div className="absolute inset-0 opacity-80" aria-hidden="true">
      {activated && !reducedMotion ? (
        <Canvas
          frameloop="demand"
          camera={{
            position: [0, 0, 8],
            fov: 52,
          }}
          gl={{
            alpha: true,
            antialias: false,
            powerPreference: "high-performance",
          }}
          dpr={1}
        >
          <ThreeParticleField active={active} reducedMotion={reducedMotion} />
        </Canvas>
      ) : null}
    </div>
  );
}

/* ==========================================================================
   HERO TEXT REVEAL
   ========================================================================== */

function AnimatedHeadline({
  children,
  reducedMotion,
}: {
  children: string;
  reducedMotion: boolean;
}) {
  const words = children.trim().split(/\s+/);

  return (
    <motion.h1
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reducedMotion ? 0 : 0.052,
            delayChildren: reducedMotion ? 0 : 0.12,
          },
        },
      }}
      className="
        mt-5
        max-w-[34rem]
        text-[2.35rem]
        font-semibold
        leading-[1.025]
        tracking-[-0.038em]
        text-white
        sm:text-[2.8rem]
        lg:text-[3.25rem]
        xl:text-[3.5rem]
      "
      style={{ perspective: 800 }}
    >
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="mr-[0.22em] inline-block overflow-hidden align-top"
        >
          <motion.span
            variants={{
              hidden: reducedMotion
                ? { opacity: 1 }
                : {
                    y: "115%",
                    opacity: 0,
                    rotateX: 35,
                  },

              visible: {
                y: "0%",
                opacity: 1,
                rotateX: 0,

                transition: {
                  duration: 0.74,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
            }}
            className="inline-block origin-bottom"
          >
            {word}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  );
}

/* ==========================================================================
   HERO CONCEPT CARD — PAPER → DATA → INFORMATION → INTELLIGENCE
   ========================================================================== */

function HeroConceptGlyph({
  name,
  accent,
}: {
  name: HeroConceptName;
  accent: string;
}) {
  if (name === "Paper") {
    return (
      <div className="relative h-14 w-16" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="absolute left-1/2 top-1/2 h-10 w-8 rounded-md border border-white/[0.14] bg-white/[0.045]"
            style={{
              transform: `translate(-50%, -50%) translate(${index * 5 - 5}px, ${index * -4 + 4}px) rotate(${index * 4 - 4}deg)`,
              boxShadow: index === 2 ? `0 0 24px ${accent}22` : undefined,
            }}
          >
            <span
              className="absolute left-2 right-2 top-3 h-px rounded-full"
              style={{ background: accent, opacity: 0.75 }}
            />
            <span className="absolute left-2 right-3 top-5 h-px rounded-full bg-white/20" />
            <span className="absolute left-2 right-2 top-7 h-px rounded-full bg-white/10" />
          </span>
        ))}
      </div>
    );
  }

  if (name === "Data") {
    return (
      <div
        className="grid h-14 w-16 grid-cols-4 place-items-center"
        aria-hidden="true"
      >
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            key={index}
            className="hero-concept-bit h-1.5 w-1.5 rounded-full"
            style={{
              background: index % 3 === 0 ? accent : "rgba(255,255,255,.24)",
              boxShadow: index % 3 === 0 ? `0 0 12px ${accent}88` : undefined,
            }}
          />
        ))}
      </div>
    );
  }

  if (name === "Information") {
    return (
      <div className="relative h-14 w-16" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="absolute left-1 right-1 flex items-center gap-2"
            style={{ top: 8 + index * 15 }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: index === 1 ? accent : "rgba(255,255,255,.3)",
                boxShadow: index === 1 ? `0 0 14px ${accent}88` : undefined,
              }}
            />
            <span
              className="h-px flex-1"
              style={{
                background: `linear-gradient(90deg, ${accent}99, rgba(255,255,255,.08))`,
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-14 w-16" aria-hidden="true">
      <span
        className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ borderColor: `${accent}55` }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full border"
        style={{ borderColor: `${accent}88` }}
      />
      <span
        className="hero-concept-core absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: accent,
          boxShadow: `0 0 20px ${accent}`,
        }}
      />
      {[
        [-2, 7],
        [48, 3],
        [53, 39],
        [5, 43],
      ].map(([left, top], index) => (
        <span
          key={index}
          className="absolute h-1.5 w-1.5 rounded-full bg-white/60"
          style={{ left, top }}
        />
      ))}
    </div>
  );
}

function FloatingConceptCard({ card }: { card: HeroConceptCard }) {
  return (
    <div
      className="relative"
      style={{
        perspective: "1300px",
      }}
    >
      <div
        className="hero-concept-card relative will-change-transform"
        data-base-rotation={card.rotation}
        data-direction={card.direction}
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="absolute inset-0 rounded-[22px] border border-white/[0.045] bg-white/[0.018]"
          style={{ transform: "translate3d(14px,16px,-34px)" }}
        />

        <div
          className="absolute inset-0 rounded-[22px] border border-white/[0.065] bg-white/[0.025]"
          style={{ transform: "translate3d(7px,8px,-18px)" }}
        />

        <div
          className="relative w-[166px] overflow-hidden rounded-[24px] border border-white/[0.16] bg-[#061323]/[0.94] p-4 shadow-[0_24px_80px_rgba(0,0,0,.30)] backdrop-blur-sm xl:w-[190px] xl:p-5"
          style={{
            transform: "translateZ(24px)",
            boxShadow: `0 28px 90px rgba(0,0,0,.28), 0 0 45px ${card.accentSoft}`,
          }}
        >
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full blur-[54px]"
            style={{ background: card.accentSoft }}
          />

          <div
            className="pointer-events-none absolute inset-px rounded-[23px] border opacity-50"
            style={{ borderColor: `${card.accent}24` }}
          />

          <div className="hero-concept-shine pointer-events-none absolute -left-24 top-[-35%] h-[180%] w-10 rotate-[18deg] bg-white/[0.075] blur-xl" />

          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <span
                className="rounded-full border px-2.5 py-1 font-mono text-[8px] tracking-[0.17em]"
                style={{
                  color: card.accent,
                  borderColor: `${card.accent}33`,
                  background: `${card.accent}0f`,
                }}
              >
                {card.code}
              </span>

              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span className="h-1 w-1 rounded-full bg-white/15" />
                <span
                  className="hero-concept-status h-1.5 w-1.5 rounded-full"
                  style={{
                    background: card.accent,
                    boxShadow: `0 0 12px ${card.accent}`,
                  }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <HeroConceptGlyph name={card.name} accent={card.accent} />

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-medium tracking-[0.12em] text-white/30 uppercase">
                  {card.caption}
                </p>
                <p className="mt-1 text-base font-semibold tracking-[-0.025em] text-white/[0.88]">
                  {card.name}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-white/[0.07] pt-3">
              <div className="flex items-center justify-between font-mono text-[7px] tracking-[0.14em] text-white/[0.22]">
                <span>FLOW</span>
                <span>{card.code} / 04</span>
              </div>

              <div className="mt-2 h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="hero-concept-progress h-full w-full origin-left scale-x-[0.42] rounded-full will-change-transform"
                  style={{
                    background: `linear-gradient(90deg, ${card.accent}, #22d3ee, #60a5fa)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border bg-[#061323]/80 backdrop-blur-xl"
          style={{
            transform: "translateZ(48px)",
            borderColor: `${card.accent}33`,
          }}
        >
          <span
            className="hero-concept-pulse h-1.5 w-1.5 rounded-full"
            style={{
              background: card.accent,
              boxShadow: `0 0 14px ${card.accent}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   HERO BACKGROUND
   ========================================================================== */

function AnimatedHeroEnvironment({ active }: { active: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ambientRef = useRef<gsap.core.Timeline | null>(null);

  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const root = rootRef.current;

    if (!root || reduceMotion) return;

    const ctx = gsap.context(() => {
      const ambient = gsap.timeline();

      ambient.add(
        gsap.to(".hero-grid", {
          x: 48,
          y: 48,
          duration: 20,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          force3D: true,
        }),
        0,
      );

      ambient.add(
        gsap.to(".hero-floor", {
          y: 72,
          duration: 7.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          force3D: true,
        }),
        0,
      );

      ambient.add(
        gsap.fromTo(
          ".hero-scan-horizontal",
          {
            y: -130,
            opacity: 0,
          },
          {
            y: 1050,
            opacity: 0.42,
            duration: 10.5,
            repeat: -1,
            repeatDelay: 1.8,
            ease: "none",
          },
        ),
        0,
      );

      ambient.add(
        gsap.to(".hero-data-beam", {
          xPercent: 11,
          duration: 6.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          force3D: true,
        }),
        0,
      );

      ambient.add(
        gsap.to(".hero-glow-1", {
          x: 76,
          y: 42,
          duration: 13,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        }),
        0,
      );

      ambient.add(
        gsap.to(".hero-glow-2", {
          x: -70,
          y: -52,
          duration: 15,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        }),
        0,
      );

      ambient.add(
        gsap.to(".hero-node-pulse", {
          scale: 2.15,
          opacity: 0,
          duration: 2.2,
          stagger: 0.32,
          repeat: -1,
          ease: "power2.out",
        }),
        0,
      );

      ambientRef.current = ambient;
    }, root);

    return () => {
      ambientRef.current?.kill();
      ambientRef.current = null;
      ctx.revert();
    };
  }, [reduceMotion]);

  useEffect(() => {
    ambientRef.current?.paused(!active);
  }, [active]);

  return (
    <div
      ref={rootRef}
      className="js-hero-background pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[#020817]" />

      <div className="absolute inset-0 opacity-70">
        <HeroThreeBackground active={active} reducedMotion={reduceMotion} />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_44%,rgba(37,99,235,0.22),transparent_29%),radial-gradient(circle_at_20%_78%,rgba(13,148,136,0.14),transparent_29%),radial-gradient(circle_at_50%_8%,rgba(99,102,241,0.11),transparent_25%)]" />

      <div className="hero-glow-1 absolute -left-[190px] top-[20px] h-[540px] w-[540px] rounded-full bg-blue-500/[0.11] blur-[150px]" />
      <div className="hero-glow-2 absolute -right-[190px] bottom-[-170px] h-[650px] w-[650px] rounded-full bg-teal-400/[0.11] blur-[165px]" />

      <div className="hero-grid absolute -inset-16 opacity-[0.048] will-change-transform [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:96px_96px]" />

      <div
        className="absolute bottom-[-340px] left-1/2 hidden h-[650px] w-[1600px] -translate-x-1/2 opacity-[0.075] lg:block"
        style={{ perspective: "1000px" }}
      >
        <div
          className="hero-floor absolute inset-0 will-change-transform [background-image:linear-gradient(rgba(59,130,246,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.46)_1px,transparent_1px)] [background-size:90px_90px]"
          style={{
            transform: "rotateX(68deg)",
            transformOrigin: "center top",
          }}
        />
      </div>

      <div className="hero-data-beam absolute left-[-16%] top-[31%] h-px w-[132%] opacity-[0.24] will-change-transform [background-image:linear-gradient(90deg,transparent,rgba(45,212,191,0.66),transparent)] [background-size:620px_100%]" />
      <div className="hero-data-beam absolute left-[-16%] top-[68%] h-px w-[132%] opacity-[0.16] will-change-transform [background-image:linear-gradient(90deg,transparent,rgba(96,165,250,0.64),transparent)] [background-size:620px_100%]" />

      <div className="hero-scan-horizontal absolute left-0 top-0 h-[2px] w-full opacity-0 bg-gradient-to-r from-transparent via-teal-300/50 to-transparent shadow-[0_0_30px_rgba(45,212,191,0.5)]" />

      {[
        ["13%", "36%"],
        ["34%", "22%"],
        ["58%", "69%"],
        ["77%", "32%"],
        ["90%", "66%"],
      ].map(([left, top], index) => (
        <div key={`${left}-${top}`} className="absolute" style={{ left, top }}>
          <span
            className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              index % 2 === 0
                ? "bg-teal-300 shadow-[0_0_13px_rgba(94,234,212,0.72)]"
                : "bg-blue-300 shadow-[0_0_13px_rgba(147,197,253,0.72)]"
            }`}
          />
          <span
            className={`hero-node-pulse absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
              index % 2 === 0 ? "border-teal-300/45" : "border-blue-300/45"
            }`}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_69%_48%,transparent_0%,rgba(2,8,23,0.08)_46%,rgba(2,8,23,0.64)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#020817] via-[#020817]/72 to-[#020817]/16" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#020817] via-[#020817]/84 to-transparent" />
    </div>
  );
}

/* ==========================================================================\n   HERO RIGHT EXPERIENCE — 3D CONCEPT CARDS + ELECTRIC WIREFRAME\n   ========================================================================== */

function HeroRightExperience({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const ambientRef = useRef<gsap.core.Timeline | null>(null);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const pulseRefs = useRef<Array<SVGCircleElement | null>>([]);
  const pulseHaloRefs = useRef<Array<SVGCircleElement | null>>([]);
  const enhancedVisuals = useEnhancedVisuals();
  const shouldMount = useDeferredVisualActivation(
    active,
    reducedMotion ? 120 : 260,
  );

  useEffect(() => {
    const root = rootRef.current;

    if (
      !root ||
      !shouldMount ||
      reducedMotion ||
      typeof window === "undefined"
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const readyLayer = root.querySelector<HTMLElement>(
        ".hero-stage-ready-layer",
      );
      const shells = Array.from(
        root.querySelectorAll<HTMLElement>(".hero-stage-card-shell"),
      );

      const floats = Array.from(
        root.querySelectorAll<HTMLElement>(".hero-stage-card-float"),
      );

      const bases = Array.from(
        root.querySelectorAll<SVGPathElement>(".hero-stage-wire-base"),
      );

      const currents = Array.from(
        root.querySelectorAll<SVGPathElement>(".hero-stage-wire-current"),
      );

      const glowPaths = Array.from(
        root.querySelectorAll<SVGPathElement>(".hero-stage-wire-glow"),
      );

      const hub = root.querySelector<HTMLElement>(".hero-stage-electric-hub");
      const hubRing = root.querySelector<HTMLElement>(
        ".hero-stage-electric-ring",
      );
      const hubRingSecondary = root.querySelector<HTMLElement>(
        ".hero-stage-electric-ring-secondary",
      );
      const orbits = Array.from(
        root.querySelectorAll<HTMLElement>(".hero-stage-orbit"),
      );
      const world = root.querySelector<HTMLElement>(".hero-stage-world");
      const stageRect = root.getBoundingClientRect();
      const centerX = stageRect.width / 2;
      const centerY = stageRect.height / 2;

      if (readyLayer) {
        gsap.set(readyLayer, {
          autoAlpha: 0,
          visibility: "hidden",
        });
      }

      shells.forEach((shell, index) => {
        const rect = shell.getBoundingClientRect();
        const shellCenterX = rect.left - stageRect.left + rect.width / 2;
        const shellCenterY = rect.top - stageRect.top + rect.height / 2;
        const direction = Number(shell.dataset.direction ?? 1);

        gsap.set(shell, {
          autoAlpha: 0,
          x: centerX - shellCenterX,
          y: centerY - shellCenterY + 18,
          z: -180 - index * 24,
          scale: 0.52,
          rotateX: 16 * direction,
          rotateY: -24 * direction,
          transformPerspective: 1400,
          transformOrigin: "center center",
          force3D: true,
        });
      });

      bases.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
          opacity: 0.08,
        });
      });

      gsap.set([...currents, ...glowPaths], {
        autoAlpha: 0,
      });

      const pulseElements = [
        ...pulseRefs.current,
        ...pulseHaloRefs.current,
      ].filter((pulse): pulse is SVGCircleElement => Boolean(pulse));

      gsap.set(pulseElements, {
        autoAlpha: 0,
        scale: 0.82,
        transformOrigin: "center center",
      });

      if (hub) {
        gsap.set(hub, {
          autoAlpha: 0,
          scale: 0.55,
        });
      }

      if (hubRing) {
        gsap.set(hubRing, {
          autoAlpha: 0,
          scale: 0.45,
        });
      }

      if (hubRingSecondary) {
        gsap.set(hubRingSecondary, {
          autoAlpha: 0,
          scale: 0.4,
        });
      }

      gsap.set(orbits, {
        autoAlpha: 0,
        scale: 0.88,
      });

      const intro = gsap.timeline({
        paused: true,
        defaults: {
          ease: "power4.out",
        },
      });

      if (readyLayer) {
        intro.set(readyLayer, { visibility: "visible" }, 0);

        intro.to(
          readyLayer,
          {
            autoAlpha: 1,
            duration: 0.34,
            ease: "power2.out",
          },
          0,
        );
      }

      intro.to(shells, {
        autoAlpha: 0.9,
        x: 0,
        y: 0,
        z: 0,
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        ease: "back.out(1.35)",
        duration: 1.02,
        stagger: 0.16,
        delay: 0.12,
        force3D: true,
      });

      intro.to(
        bases,
        {
          strokeDashoffset: 0,
          opacity: 0.78,
          duration: 0.92,
          stagger: 0.08,
          ease: "power2.out",
        },
        "-=0.42",
      );

      intro.to(
        glowPaths,
        {
          autoAlpha: 0.52,
          duration: 0.5,
          stagger: 0.06,
          ease: "power2.out",
        },
        "-=0.62",
      );

      intro.to(
        currents,
        {
          autoAlpha: 1,
          duration: 0.38,
          stagger: 0.05,
        },
        "-=0.42",
      );

      intro.to(
        pulseElements,
        {
          autoAlpha: 1,
          duration: 0.22,
          stagger: 0.04,
          ease: "power2.out",
        },
        "-=0.22",
      );

      if (hub) {
        intro.to(
          hub,
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.42,
            ease: "back.out(2)",
          },
          "-=0.42",
        );
      }

      if (hubRing) {
        intro.to(
          hubRing,
          {
            autoAlpha: 0.85,
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=0.34",
        );
      }

      if (hubRingSecondary) {
        intro.to(
          hubRingSecondary,
          {
            autoAlpha: 0.52,
            scale: 1,
            duration: 0.62,
            ease: "power2.out",
          },
          "-=0.46",
        );
      }

      intro.to(
        orbits,
        {
          autoAlpha: 0.52,
          scale: 1,
          duration: 0.72,
          stagger: 0.08,
          ease: "power3.out",
        },
        "-=0.52",
      );

      const ambient = gsap.timeline({
        paused: true,
        delay: 1.85,
      });

      floats.forEach((card, index) => {
        const direction = Number(card.dataset.direction ?? 1);

        ambient.add(
          gsap.to(card, {
            keyframes: [
              {
                y: -7,
                x: 5 * direction,
                rotateX: -1.4,
                rotateY: 4.2 * direction,
              },
              {
                y: 7,
                x: -4 * direction,
                rotateX: 1.8,
                rotateY: -3.2 * direction,
              },
              {
                y: 0,
                x: 0,
                rotateX: 0,
                rotateY: 0,
              },
            ],
            duration: 8.8 + index * 0.72,
            repeat: -1,
            ease: "sine.inOut",
            force3D: true,
          }),
          0,
        );
      });

      ambient.add(
        gsap.to(".hero-concept-shine", {
          x: 280,
          duration: 2.8,
          stagger: 0.65,
          repeat: -1,
          repeatDelay: 4.8,
          ease: "power2.inOut",
        }),
        0,
      );

      ambient.add(
        gsap.to(".hero-concept-progress", {
          scaleX: 0.92,
          duration: 3.4,
          stagger: 0.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          force3D: true,
        }),
        0,
      );

      ambient.add(
        gsap.to(currents, {
          strokeDashoffset: -230,
          duration: (index) => 1.9 + index * 0.22,
          repeat: -1,
          ease: "none",
        }),
        0,
      );

      if (hubRing) {
        ambient.add(
          gsap.to(hubRing, {
            scale: 2.25,
            opacity: 0,
            duration: 2.15,
            repeat: -1,
            ease: "power2.out",
          }),
          0,
        );
      }

      if (hubRingSecondary) {
        ambient.add(
          gsap.to(hubRingSecondary, {
            scale: 1.75,
            opacity: 0.06,
            duration: 3.1,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          }),
          0,
        );
      }

      orbits.forEach((orbit, index) => {
        ambient.add(
          gsap.to(orbit, {
            rotation: index % 2 === 0 ? 360 : -360,
            duration: 34 + index * 11,
            repeat: -1,
            ease: "none",
          }),
          0,
        );
      });

      pathRefs.current.forEach((path, index) => {
        const pulse = pulseRefs.current[index];
        const pulseHalo = pulseHaloRefs.current[index];

        if (!path || !pulse || !pulseHalo) return;

        const length = path.getTotalLength();
        const state = { progress: 0 };
        const minPulseFrameMs = 1000 / 30;
        let lastPulsePaint = -Infinity;

        const placePulse = (force = false) => {
          const now = performance.now();

          if (!force && now - lastPulsePaint < minPulseFrameMs) {
            return;
          }

          lastPulsePaint = now;
          const point = path.getPointAtLength(length * state.progress);
          const x = String(point.x);
          const y = String(point.y);

          pulse.setAttribute("cx", x);
          pulse.setAttribute("cy", y);
          pulseHalo.setAttribute("cx", x);
          pulseHalo.setAttribute("cy", y);
        };

        placePulse(true);

        ambient.add(
          gsap.to(state, {
            progress: 1,
            duration: 2.65 + index * 0.25,
            delay: index * 0.42,
            repeat: -1,
            repeatDelay: 0.5,
            ease: "none",
            onUpdate: () => placePulse(),
            onRepeat: () => placePulse(true),
          }),
          0,
        );
      });

      introRef.current = intro;
      ambientRef.current = ambient;

      if (active) {
        intro.play(0);
        ambient.play(0);
      }

      if (world) {
        gsap.to(world, {
          yPercent: -4,
          scale: 0.975,
          opacity: 0.58,
          ease: "none",
          scrollTrigger: {
            trigger: root.closest<HTMLElement>(".js-hero") ?? root,
            start: "top top",
            end: "bottom top",
            scrub: 0.85,
            invalidateOnRefresh: true,
          },
        });
      }
    }, root);

    return () => {
      introRef.current?.kill();
      introRef.current = null;
      ambientRef.current?.kill();
      ambientRef.current = null;
      ctx.revert();
    };
  }, [reducedMotion, shouldMount]);

  useEffect(() => {
    introRef.current?.paused(!active);
    ambientRef.current?.paused(!active);
  }, [active]);

  useEffect(() => {
    const root = rootRef.current;

    if (
      !root ||
      !shouldMount ||
      reducedMotion ||
      !active ||
      !enhancedVisuals ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    const layers = Array.from(
      root.querySelectorAll<HTMLElement>(".hero-stage-card-parallax"),
    );

    const xTo = layers.map((element) =>
      gsap.quickTo(element, "x", {
        duration: 1.05,
        ease: "power3.out",
      }),
    );

    const yTo = layers.map((element) =>
      gsap.quickTo(element, "y", {
        duration: 1.05,
        ease: "power3.out",
      }),
    );

    const rotateXTo = layers.map((element) =>
      gsap.quickTo(element, "rotateX", {
        duration: 1.15,
        ease: "power3.out",
      }),
    );

    const rotateYTo = layers.map((element) =>
      gsap.quickTo(element, "rotateY", {
        duration: 1.15,
        ease: "power3.out",
      }),
    );

    let bounds = root.getBoundingClientRect();
    let frame: number | null = null;
    let pointerX = 0;
    let pointerY = 0;

    const updateBounds = () => {
      bounds = root.getBoundingClientRect();
    };

    const applyPointer = () => {
      frame = null;

      layers.forEach((layer, index) => {
        const depth = Number(layer.dataset.depth ?? 18);
        xTo[index](pointerX * depth * 0.5);
        yTo[index](pointerY * depth * 0.36);
        rotateYTo[index](pointerX * 5.4);
        rotateXTo[index](-pointerY * 4.2);
      });
    };

    const handleMove = (event: PointerEvent) => {
      pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
      pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;

      if (frame === null) {
        frame = window.requestAnimationFrame(applyPointer);
      }
    };

    const reset = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }

      layers.forEach((_, index) => {
        xTo[index](0);
        yTo[index](0);
        rotateXTo[index](0);
        rotateYTo[index](0);
      });
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateBounds)
        : null;

    resizeObserver?.observe(root);
    root.addEventListener("pointerenter", updateBounds, { passive: true });
    root.addEventListener("pointermove", handleMove, { passive: true });
    root.addEventListener("pointerleave", reset);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      resizeObserver?.disconnect();
      root.removeEventListener("pointerenter", updateBounds);
      root.removeEventListener("pointermove", handleMove);
      root.removeEventListener("pointerleave", reset);
    };
  }, [active, enhancedVisuals, reducedMotion, shouldMount]);

  const wirePaths = [
    {
      d: "M 122 122 C 210 145 256 217 332 284",
      color: "#5eead4",
    },
    {
      d: "M 628 106 C 558 142 516 213 430 284",
      color: "#22d3ee",
    },
    {
      d: "M 118 506 C 208 467 256 397 332 340",
      color: "#60a5fa",
    },
    {
      d: "M 630 522 C 552 468 507 397 430 340",
      color: "#a78bfa",
    },
  ];

  return (
    <div
      ref={rootRef}
      className="relative mx-auto h-[640px] w-full max-w-[820px] xl:h-[680px] xl:max-w-[860px]"
      style={{ perspective: "1700px" }}
    >
      {shouldMount ? (
        <div
          className="hero-stage-ready-layer absolute inset-0"
          style={
            reducedMotion
              ? { transformStyle: "preserve-3d" }
              : {
                  opacity: 0,
                  visibility: "hidden",
                  transformStyle: "preserve-3d",
                }
          }
        >
          <div
            className="hero-stage-world absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="pointer-events-none absolute inset-[8%] rounded-full bg-blue-500/[0.11] blur-[90px]"
              aria-hidden="true"
            />

            <div
              className="hero-stage-orbit pointer-events-none absolute left-1/2 top-1/2 z-[2] hidden h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/[0.11] lg:block"
              aria-hidden="true"
            >
              <span className="absolute left-[12%] top-[12%] h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,.9)]" />
              <span className="absolute bottom-[17%] right-[7%] h-1 w-1 rounded-full bg-blue-200 shadow-[0_0_12px_rgba(147,197,253,.85)]" />
            </div>

            <div
              className="hero-stage-orbit pointer-events-none absolute left-1/2 top-1/2 z-[2] hidden h-[54%] w-[54%] -translate-x-1/2 -translate-y-1/2 rotate-[24deg] rounded-full border border-dashed border-indigo-300/[0.11] lg:block"
              aria-hidden="true"
            >
              <span className="absolute right-[10%] top-[18%] h-1.5 w-1.5 rounded-full bg-indigo-200 shadow-[0_0_14px_rgba(199,210,254,.8)]" />
            </div>

            <svg
              viewBox="0 0 760 620"
              preserveAspectRatio="xMidYMid meet"
              className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full lg:block"
              aria-hidden="true"
            >
              {wirePaths.map((wire, index) => (
                <g key={wire.d}>
                  <path
                    className="hero-stage-wire-glow"
                    d={wire.d}
                    fill="none"
                    stroke={wire.color}
                    strokeWidth="7"
                    strokeLinecap="round"
                    opacity="0"
                  />

                  <path
                    ref={(element) => {
                      pathRefs.current[index] = element;
                    }}
                    className="hero-stage-wire-base"
                    d={wire.d}
                    fill="none"
                    stroke={wire.color}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    opacity="0.12"
                    vectorEffect="non-scaling-stroke"
                  />

                  <path
                    className="hero-stage-wire-current"
                    d={wire.d}
                    fill="none"
                    stroke={wire.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="5 14"
                    opacity="0"
                    vectorEffect="non-scaling-stroke"
                  />

                  <circle
                    ref={(element) => {
                      pulseHaloRefs.current[index] = element;
                    }}
                    cx="0"
                    cy="0"
                    r="10"
                    fill={wire.color}
                    opacity="0"
                  />

                  <circle
                    ref={(element) => {
                      pulseRefs.current[index] = element;
                    }}
                    cx="0"
                    cy="0"
                    r="4.5"
                    fill="#ffffff"
                    stroke={wire.color}
                    strokeWidth="2.6"
                    opacity="0"
                  />
                </g>
              ))}
            </svg>

            <div className="hero-stage-electric-hub pointer-events-none absolute left-1/2 top-1/2 z-[11] hidden h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_#fff,0_0_34px_rgba(34,211,238,.95),0_0_62px_rgba(96,165,250,.55)] lg:block" />
            <div className="hero-stage-electric-ring pointer-events-none absolute left-1/2 top-1/2 z-[10] hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/70 shadow-[0_0_28px_rgba(34,211,238,.25)] lg:block" />
            <div className="hero-stage-electric-ring-secondary pointer-events-none absolute left-1/2 top-1/2 z-[9] hidden h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-300/25 lg:block" />

            {heroConceptCards.map((card) => (
              <div
                key={card.name}
                className={`hero-stage-card-shell absolute z-20 ${card.visibility}`}
                data-direction={card.direction}
                style={{
                  top: card.top,
                  left: card.left,
                  right: card.right,
                  bottom: card.bottom,
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  className="hero-stage-card-parallax"
                  data-depth={card.depth}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div
                    className="hero-stage-card-float"
                    data-direction={card.direction}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <FloatingConceptCard card={card} />
                  </div>
                </div>
              </div>
            ))}

            <div className="absolute inset-0 z-30 flex items-center justify-center px-7 py-10 sm:px-10 xl:px-12">
              <div className="relative w-full max-w-[690px] xl:max-w-[720px]">
                <PipelineStage active={active} reducedMotion={reducedMotion} />
              </div>
            </div>

            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,.08),rgba(59,130,246,.035)_42%,transparent_72%)] blur-2xl"
              aria-hidden="true"
            />

            <div
              className="pointer-events-none absolute inset-x-[12%] bottom-[8%] z-0 h-16 rounded-[50%] bg-cyan-400/[0.055] blur-3xl"
              aria-hidden="true"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ==========================================================================
   PIPELINE STAGE
   ========================================================================== */

function PipelineStage({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;

    if (
      !stage ||
      reducedMotion ||
      !active ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    const rotateX = gsap.quickTo(stage, "rotateX", {
      duration: 0.85,
      ease: "power3.out",
    });

    const rotateY = gsap.quickTo(stage, "rotateY", {
      duration: 0.85,
      ease: "power3.out",
    });

    let bounds = stage.getBoundingClientRect();
    let frame: number | null = null;
    let pointerX = 0;
    let pointerY = 0;

    const updateBounds = () => {
      bounds = stage.getBoundingClientRect();
    };

    const applyPointer = () => {
      frame = null;
      rotateY(pointerX * 7);
      rotateX(-pointerY * 5);
    };

    const handleMove = (event: PointerEvent) => {
      pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
      pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;

      if (frame === null) {
        frame = window.requestAnimationFrame(applyPointer);
      }
    };

    const reset = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }

      rotateX(0);
      rotateY(0);
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateBounds)
        : null;

    resizeObserver?.observe(stage);
    stage.addEventListener("pointerenter", updateBounds, { passive: true });
    stage.addEventListener("pointermove", handleMove, { passive: true });
    stage.addEventListener("pointerleave", reset);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      resizeObserver?.disconnect();
      stage.removeEventListener("pointerenter", updateBounds);
      stage.removeEventListener("pointermove", handleMove);
      stage.removeEventListener("pointerleave", reset);
    };
  }, [active, reducedMotion]);

  const states = [
    {
      name: "INGEST",
      position: "-left-3 top-[18%]",
    },
    {
      name: "OCR",
      position: "right-0 top-[8%]",
    },
    {
      name: "INDEX",
      position: "-right-5 bottom-[24%]",
    },
    {
      name: "AUDIT",
      position: "left-[8%] bottom-[5%]",
    },
  ];

  return (
    <div
      className="relative mx-auto w-full max-w-[650px]"
      style={{ perspective: "1400px" }}
    >
      <motion.div
        animate={
          active && !reducedMotion
            ? {
                scale: [0.92, 1.08, 0.92],
                opacity: [0.25, 0.6, 0.25],
              }
            : undefined
        }
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
          absolute
          inset-[8%]
          -z-20
          rounded-full
          bg-blue-500/25
          blur-[110px]
        "
      />

      <motion.div
        animate={active && !reducedMotion ? { rotate: 360 } : undefined}
        transition={{
          duration: 38,
          repeat: Infinity,
          ease: "linear",
        }}
        className="
          pointer-events-none
          absolute
          -inset-12
          -z-10
          hidden
          rounded-full
          border
          border-dashed
          border-blue-300/[0.13]
          sm:block
        "
      />

      <motion.div
        animate={active && !reducedMotion ? { rotate: -360 } : undefined}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        className="
          pointer-events-none
          absolute
          -inset-5
          -z-10
          hidden
          rounded-full
          border
          border-teal-300/[0.10]
          sm:block
        "
      />

      {states.map((state, index) => (
        <motion.div
          key={state.name}
          initial={
            reducedMotion
              ? false
              : {
                  opacity: 0,
                  scale: 0.7,
                }
          }
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 0.55,
            delay: 0.7 + index * 0.08,
          }}
          className={`
            pointer-events-none
            absolute
            z-30
            hidden
            items-center
            gap-2
            rounded-full
            border
            border-white/[0.12]
            bg-[#071426]/75
            px-3
            py-1.5
            text-[8px]
            font-semibold
            tracking-[0.15em]
            text-white/55
            shadow-xl
            backdrop-blur-xl
            md:flex
            ${state.position}
          `}
        >
          <span
            className="
              h-1.5
              w-1.5
              rounded-full
              bg-teal-300
              shadow-[0_0_10px_rgba(94,234,212,0.9)]
            "
          />

          {state.name}
        </motion.div>
      ))}

      <motion.div
        initial={
          reducedMotion
            ? false
            : {
                opacity: 0,
                y: 45,
                scale: 0.9,
                rotateY: -9,
              }
        }
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          rotateY: 0,
        }}
        transition={{
          duration: 1.1,
          delay: 0.28,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <motion.div
          animate={
            active && !reducedMotion
              ? {
                  y: [0, -8, 0],
                }
              : undefined
          }
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div
            ref={stageRef}
            className="
              relative
              overflow-hidden
              rounded-[30px]
              border
              border-white/[0.11]
              bg-[#061222]/88
              p-1
              shadow-[0_40px_130px_rgba(0,0,0,0.38)]
              backdrop-blur-sm
              will-change-transform
            "
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            <motion.div
              animate={
                active && !reducedMotion
                  ? {
                      opacity: [0.14, 0.48, 0.14],
                    }
                  : undefined
              }
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="
                pointer-events-none
                absolute
                -inset-px
                rounded-[30px]
                border
                border-teal-300/20
                shadow-[0_0_55px_rgba(45,212,191,0.14)]
              "
            />

            <motion.div
              animate={
                active && !reducedMotion
                  ? {
                      x: ["-140%", "260%"],
                    }
                  : undefined
              }
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut",
              }}
              className="
                pointer-events-none
                absolute
                -top-[40%]
                z-20
                h-[180%]
                w-16
                rotate-[18deg]
                bg-white/[0.05]
                blur-xl
              "
            />

            <DocumentPipeline />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ==========================================================================
   HOW IT WORKS — SCROLL-SCRUBBED 3D PROCESS FIELD
   ========================================================================== */

function HowProcessField({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 58;
    const data = new Float32Array(count * 3);
    let seed = 424242;

    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let index = 0; index < count; index += 1) {
      data[index * 3] = (random() - 0.5) * 15;
      data[index * 3 + 1] = (random() - 0.5) * 7;
      data[index * 3 + 2] = (random() - 0.5) * 6 - 1;
    }

    return data;
  }, []);

  useThrottledThreeFrames(active, reducedMotion, 30);

  useFrame((state, delta) => {
    if (!active || reducedMotion) return;

    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.009;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        state.pointer.x * 0.045,
        0.025,
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        -state.pointer.y * 0.025,
        0.025,
      );
    }

    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.004;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>

        <pointsMaterial
          size={0.032}
          color="#38bdf8"
          transparent
          opacity={0.28}
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      <mesh position={[-3.5, 0.65, -2.3]} rotation={[1.18, 0.12, -0.25]}>
        <torusGeometry args={[1.15, 0.012, 8, 90]} />
        <meshBasicMaterial color="#2dd4bf" transparent opacity={0.16} />
      </mesh>

      <mesh position={[0.15, -0.25, -2.8]} rotation={[1.3, -0.18, 0.18]}>
        <torusGeometry args={[1.55, 0.012, 8, 100]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.13} />
      </mesh>

      <mesh position={[3.75, 0.5, -2.4]} rotation={[1.2, 0.28, -0.18]}>
        <torusGeometry args={[1.05, 0.012, 8, 90]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.14} />
      </mesh>

      {[
        [-4.4, -1.5, -1.6, "#2dd4bf"],
        [-1.5, 1.8, -2.1, "#22d3ee"],
        [1.6, -1.7, -1.8, "#60a5fa"],
        [4.5, 1.4, -2.1, "#818cf8"],
      ].map(([x, y, z, color], index) => (
        <mesh key={index} position={[x as number, y as number, z as number]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color={color as string} />
        </mesh>
      ))}
    </group>
  );
}

function HowItWorksMotionSection({
  headline,
  body,
  steps,
}: {
  headline: string;
  body: string;
  steps: string[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const active = useNearViewport(sectionRef, "180px");
  const enhancedVisuals = useEnhancedVisuals();
  const webglReady = useDeferredVisualActivation(
    active && enhancedVisuals && !reduceMotion,
    180,
  );
  const activated = usePersistentActivation(webglReady);

  useEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;

    if (!section || !scene || reduceMotion || typeof window === "undefined") {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const heading = scene.querySelector<HTMLElement>(".howx-heading");
      const title = heading?.querySelector<HTMLElement>("h1,h2,h3");
      const copy = heading?.querySelector<HTMLElement>("p");
      const sectionLine =
        scene.querySelector<HTMLElement>(".howx-section-line");
      const route = scene.querySelector<SVGPathElement>(".howx-route");
      const routeGlow = scene.querySelector<SVGPathElement>(".howx-route-glow");
      const cards = Array.from(
        scene.querySelectorAll<HTMLElement>(".howx-card"),
      );
      const beam = scene.querySelector<HTMLElement>(".howx-scan-beam");
      const leftGlow = scene.querySelector<HTMLElement>(".howx-glow-left");
      const rightGlow = scene.querySelector<HTMLElement>(".howx-glow-right");
      const flowDots = Array.from(
        scene.querySelectorAll<HTMLElement>(".howx-flow-dot"),
      );

      if (sectionLine) {
        gsap.set(sectionLine, {
          scaleX: 0,
          transformOrigin: "left center",
        });
      }

      if (title) {
        gsap.set(title, {
          autoAlpha: 0,
          y: 48,
          rotateX: 7,
          transformPerspective: 900,
          transformOrigin: "center bottom",
        });
      }

      if (copy) {
        gsap.set(copy, {
          autoAlpha: 0,
          y: 22,
        });
      }

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

      cards.forEach((card) => {
        gsap.set(card, {
          autoAlpha: 0,
          y: 72,
          scale: 0.94,
          rotateX: 9,
          transformPerspective: 1100,
          transformOrigin: "center bottom",
        });

        gsap.set(card.querySelector(".howx-card-index"), {
          autoAlpha: 0,
          y: 10,
          scale: 0.8,
        });

        gsap.set(card.querySelector(".howx-card-copy"), {
          autoAlpha: 0,
          y: 16,
        });

        gsap.set(card.querySelector(".howx-card-rule"), {
          scaleX: 0,
          transformOrigin: "left center",
        });

        gsap.set(card.querySelector(".howx-card-node"), {
          scale: 0.4,
          autoAlpha: 0,
          transformOrigin: "center center",
        });
      });

      gsap.set(flowDots, {
        autoAlpha: 0,
        scale: 0.4,
      });

      if (beam) {
        gsap.set(beam, {
          xPercent: -145,
          autoAlpha: 0,
        });
      }

      const tl = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
        scrollTrigger: {
          trigger: section,
          start: "top 88%",
          end: "bottom 24%",
          scrub: 0.82,
          invalidateOnRefresh: true,
        },
      });

      if (sectionLine) {
        tl.to(sectionLine, {
          scaleX: 1,
          duration: 0.55,
          ease: "power2.out",
        });
      }

      if (title) {
        tl.to(
          title,
          {
            autoAlpha: 1,
            y: 0,
            rotateX: 0,
            duration: 0.72,
            ease: "power4.out",
          },
          "-=0.32",
        );
      }

      if (copy) {
        tl.to(
          copy,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            ease: "power3.out",
          },
          "-=0.42",
        );
      }

      if (route && routeGlow) {
        tl.to(
          routeGlow,
          {
            strokeDashoffset: routeLength * 0.06,
            duration: 1.1,
            ease: "power2.out",
          },
          "-=0.3",
        );

        tl.to(
          route,
          {
            strokeDashoffset: 0,
            duration: 1.25,
            ease: "power2.out",
          },
          "<",
        );
      }

      cards.forEach((card, index) => {
        const indexEl = card.querySelector<HTMLElement>(".howx-card-index");
        const copyEl = card.querySelector<HTMLElement>(".howx-card-copy");
        const rule = card.querySelector<HTMLElement>(".howx-card-rule");
        const node = card.querySelector<HTMLElement>(".howx-card-node");

        tl.to(
          card,
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            duration: 0.62,
            ease: "power4.out",
          },
          index === 0 ? "-=0.72" : "-=0.42",
        );

        if (node) {
          tl.to(
            node,
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.32,
              ease: "back.out(2.2)",
            },
            "-=0.5",
          );
        }

        if (indexEl) {
          tl.to(
            indexEl,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.3,
            },
            "-=0.38",
          );
        }

        if (rule) {
          tl.to(
            rule,
            {
              scaleX: 1,
              duration: 0.4,
              ease: "power2.out",
            },
            "-=0.3",
          );
        }

        if (copyEl) {
          tl.to(
            copyEl,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.4,
            },
            "-=0.3",
          );
        }
      });

      tl.to(
        flowDots,
        {
          autoAlpha: 1,
          scale: 1,
          duration: 0.32,
          stagger: 0.06,
          ease: "back.out(2)",
        },
        "-=0.8",
      );

      if (beam) {
        tl.fromTo(
          beam,
          {
            xPercent: -145,
            autoAlpha: 0,
          },
          {
            xPercent: 150,
            autoAlpha: 0.72,
            duration: 1.15,
            ease: "power1.inOut",
          },
          "-=0.75",
        );
      }

      tl.to({}, { duration: 0.28 });

      if (leftGlow) {
        gsap.fromTo(
          leftGlow,
          { x: -36, y: 32, scale: 0.9 },
          {
            x: 48,
            y: -42,
            scale: 1.08,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
              invalidateOnRefresh: true,
            },
          },
        );
      }

      if (rightGlow) {
        gsap.fromTo(
          rightGlow,
          { x: 34, y: -28, scale: 0.92 },
          {
            x: -44,
            y: 38,
            scale: 1.1,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.05,
              invalidateOnRefresh: true,
            },
          },
        );
      }
    }, scene);

    scheduleScrollTriggerRefresh();

    return () => ctx.revert();
  }, [reduceMotion, steps.length]);

  const accents = [
    {
      dot: "bg-teal-400 shadow-[0_0_18px_rgba(45,212,191,.45)]",
      line: "from-teal-400 via-cyan-400 to-transparent",
      glow: "bg-teal-400/[0.08]",
    },
    {
      dot: "bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,.42)]",
      line: "from-cyan-400 via-blue-400 to-transparent",
      glow: "bg-cyan-400/[0.07]",
    },
    {
      dot: "bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,.42)]",
      line: "from-blue-400 via-indigo-400 to-transparent",
      glow: "bg-blue-400/[0.07]",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-white px-6 py-24 sm:py-28"
    >
      <div ref={sceneRef} className="relative mx-auto max-w-7xl">
        {/* ----------------------------------------------------------- */}
        {/* Animated background — lightweight Three.js process field   */}
        {/* ----------------------------------------------------------- */}

        <div
          className="pointer-events-none absolute -inset-x-6 -inset-y-24 -z-20 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-white" />

          <div className="absolute inset-0 opacity-70">
            {activated && !reduceMotion ? (
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
                <HowProcessField active={active} reducedMotion={reduceMotion} />
              </Canvas>
            ) : null}
          </div>

          <div className="howx-glow-left absolute -left-28 top-[18%] h-80 w-80 rounded-full bg-teal-400/[0.10] blur-[105px]" />
          <div className="howx-glow-right absolute -right-28 bottom-[10%] h-96 w-96 rounded-full bg-blue-500/[0.09] blur-[120px]" />

          <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(15,23,42,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.18)_1px,transparent_1px)] [background-size:84px_84px]" />

          <div className="howx-scan-beam absolute bottom-0 top-0 w-40 bg-gradient-to-r from-transparent via-cyan-300/[0.10] to-transparent blur-xl" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,.22)_55%,white_92%)]" />
        </div>

        <div className="howx-section-line absolute left-0 right-0 top-[-96px] h-px origin-left bg-gradient-to-r from-transparent via-teal-500/25 to-transparent" />

        {/* ----------------------------------------------------------- */}
        {/* Heading                                                     */}
        {/* ----------------------------------------------------------- */}

        <div className="howx-heading relative z-10">
          <SectionHeading title={headline} body={body} />
        </div>

        {/* ----------------------------------------------------------- */}
        {/* Decorative scroll-drawn process route                       */}
        {/* ----------------------------------------------------------- */}

        <div
          className="pointer-events-none absolute left-0 right-0 top-[48%] -z-10 hidden h-[260px] lg:block"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 1200 260"
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            <defs>
              <linearGradient
                id="howx-route-gradient"
                x1="0%"
                y1="50%"
                x2="100%"
                y2="50%"
              >
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.15" />
                <stop offset="35%" stopColor="#22d3ee" stopOpacity="0.75" />
                <stop offset="68%" stopColor="#60a5fa" stopOpacity="0.84" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.22" />
              </linearGradient>

              <filter
                id="howx-route-blur"
                x="-20%"
                y="-100%"
                width="140%"
                height="300%"
              >
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>

            <path
              className="howx-route-glow"
              d="M 18 160 C 170 20 315 232 452 112 C 600 -18 733 236 873 118 C 1000 12 1102 94 1182 48"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="7"
              strokeLinecap="round"
              opacity="0.08"
              filter="url(#howx-route-blur)"
            />

            <path
              className="howx-route"
              d="M 18 160 C 170 20 315 232 452 112 C 600 -18 733 236 873 118 C 1000 12 1102 94 1182 48"
              fill="none"
              stroke="url(#howx-route-gradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* Steps                                                       */}
        {/* ----------------------------------------------------------- */}

        <ol className="relative z-10 mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => {
            const accent = accents[index % accents.length];

            return (
              <li key={step} className="howx-card relative">
                <motion.div
                  whileHover={
                    reduceMotion
                      ? undefined
                      : {
                          y: -7,
                          scale: 1.012,
                        }
                  }
                  transition={{
                    duration: 0.32,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_14px_45px_rgba(15,23,42,.045)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-cyan-200/80 hover:shadow-[0_24px_75px_rgba(14,116,144,.10)] sm:p-6"
                >
                  <div
                    className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full ${accent.glow} blur-3xl transition-transform duration-700 group-hover:scale-125`}
                  />

                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

                  <div className="relative flex min-h-[150px] flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`howx-card-node h-2.5 w-2.5 rounded-full ${accent.dot}`}
                        />

                        <span className="howx-card-index font-mono text-[10px] tracking-[0.17em] text-slate-400">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <span className="text-[8px] font-semibold tracking-[0.16em] text-slate-300 uppercase">
                        Process
                      </span>
                    </div>

                    <div
                      className={`howx-card-rule mt-5 h-px w-20 bg-gradient-to-r ${accent.line}`}
                    />

                    <p className="howx-card-copy mt-5 max-w-[30rem] text-[15px] font-medium leading-relaxed text-slate-700">
                      {step}
                    </p>

                    <div className="mt-auto pt-6">
                      <div className="h-[3px] overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full origin-left scale-x-0 rounded-full bg-gradient-to-r ${accent.line} transition-transform duration-500 group-hover:scale-x-100`}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </li>
            );
          })}
        </ol>

        {/* decorative data pulses */}
        <div
          className="pointer-events-none absolute bottom-[6%] left-[4%] right-[4%] hidden items-center justify-between lg:flex"
          aria-hidden="true"
        >
          {Array.from({ length: 7 }).map((_, index) => (
            <span
              key={index}
              className={`howx-flow-dot h-1.5 w-1.5 rounded-full ${
                index % 3 === 0
                  ? "bg-teal-400 shadow-[0_0_14px_rgba(45,212,191,.45)]"
                  : index % 3 === 1
                    ? "bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,.42)]"
                    : "bg-blue-400 shadow-[0_0_14px_rgba(96,165,250,.42)]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   GOVERNANCE — FULL ISOLATED FLIGHT STORY
   ========================================================================== */

type GovernanceCard = {
  id: string;
  title: string;
  text: string;
};

const GOVERNANCE_FLIGHT_PATH =
  "M -70 635 C 125 702 326 650 414 520 C 498 397 420 283 552 210 C 672 143 810 220 771 360 C 738 478 842 553 980 474 C 1088 412 1118 300 1245 258";

function GovernanceFlightSection({
  headline,
  body,
  cards,
}: {
  headline: string;
  body: string;
  cards: GovernanceCard[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const glowPathRef = useRef<SVGPathElement>(null);
  const planeRef = useRef<SVGGElement>(null);

  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;
    const path = pathRef.current;
    const glowPath = glowPathRef.current;
    const plane = planeRef.current;

    if (
      !section ||
      !scene ||
      !path ||
      !glowPath ||
      !plane ||
      reduceMotion ||
      typeof window === "undefined"
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const ctx = gsap.context(() => {
        const eyebrow = scene.querySelector<HTMLElement>(".govx-eyebrow");
        const title = scene.querySelector<HTMLElement>(".govx-title");
        const titleRule = scene.querySelector<HTMLElement>(".govx-title-rule");
        const introBody = scene.querySelector<HTMLElement>(".govx-intro-body");
        const scrollHint =
          scene.querySelector<HTMLElement>(".govx-scroll-hint");
        const orb = scene.querySelector<HTMLElement>(".govx-orb");
        const cardStage = scene.querySelector<HTMLElement>(".govx-card-stage");
        const cardEls = gsap.utils.toArray<HTMLElement>(".govx-story-card");
        const finalLabel =
          scene.querySelector<HTMLElement>(".govx-final-label");
        const finalTitle =
          scene.querySelector<HTMLElement>(".govx-final-title");
        const mockupStage =
          scene.querySelector<HTMLElement>(".govx-mockup-stage");
        const mockups = gsap.utils.toArray<HTMLElement>(".govx-mockup");
        const summaryChips =
          gsap.utils.toArray<HTMLElement>(".govx-summary-chip");

        const pathLength = path.getTotalLength();
        const flight = { progress: 0 };

        const placePlane = () => {
          const length = pathLength * flight.progress;
          const point = path.getPointAtLength(length);
          const nextPoint = path.getPointAtLength(
            Math.min(pathLength, length + 3),
          );

          const angle =
            (Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180) /
            Math.PI;

          plane.setAttribute(
            "transform",
            `translate(${point.x} ${point.y}) rotate(${angle})`,
          );
        };

        gsap.set([path, glowPath], {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
        });

        gsap.set(plane, { autoAlpha: 0 });
        gsap.set([eyebrow, title, introBody, scrollHint], {
          autoAlpha: 0,
          y: 24,
        });
        gsap.set(titleRule, {
          scaleX: 0,
          transformOrigin: "left center",
        });
        gsap.set(orb, {
          autoAlpha: 0,
          x: -150,
          y: 155,
          scale: 0.72,
          rotate: -16,
        });
        gsap.set(cardStage, { autoAlpha: 0 });
        gsap.set(cardEls, {
          autoAlpha: 0,
          y: 48,
          scale: 0.93,
          rotateX: 8,
          transformPerspective: 1200,
        });
        gsap.set(
          cardEls.map((el) => el.querySelector(".govx-card-kicker")),
          {
            autoAlpha: 0,
            x: -14,
          },
        );
        gsap.set(
          cardEls.map((el) => el.querySelector(".govx-card-title")),
          {
            autoAlpha: 0,
            y: 26,
          },
        );
        gsap.set(
          cardEls.map((el) => el.querySelector(".govx-card-copy")),
          {
            autoAlpha: 0,
            y: 18,
          },
        );
        gsap.set(
          cardEls.map((el) => el.querySelector(".govx-card-rule")),
          {
            scaleX: 0,
            transformOrigin: "left center",
          },
        );
        gsap.set([finalLabel, finalTitle, mockupStage], {
          autoAlpha: 0,
          y: 28,
        });
        gsap.set(mockups, {
          autoAlpha: 0,
          y: 70,
          scale: 0.88,
          rotateX: 10,
          rotateY: 0,
          transformPerspective: 1400,
        });
        gsap.set(summaryChips, {
          autoAlpha: 0,
          y: 12,
          scale: 0.94,
        });

        placePlane();

        const tl = gsap.timeline({
          defaults: {
            ease: "power3.inOut",
          },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () =>
              `+=${window.innerHeight * Math.max(6.2, cards.length + 3.2)}`,
            scrub: 0.76,
            pin: scene,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        /* ------------------------------------------------------------
           01 — Reference-style intro
           ------------------------------------------------------------ */

        tl.to(eyebrow, {
          autoAlpha: 1,
          y: 0,
          duration: 0.26,
          ease: "power2.out",
        })
          .to(
            title,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.55,
              ease: "power4.out",
            },
            "-=0.1",
          )
          .to(
            titleRule,
            {
              scaleX: 1,
              duration: 0.42,
              ease: "power2.out",
            },
            "-=0.28",
          )
          .to(
            introBody,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.46,
              ease: "power3.out",
            },
            "-=0.26",
          )
          .to(
            scrollHint,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.25,
            },
            "-=0.2",
          );

        /* ------------------------------------------------------------
           02 — Plane wakes + first curve
           ------------------------------------------------------------ */

        tl.to(plane, { autoAlpha: 1, duration: 0.08 })
          .to(
            flight,
            {
              progress: 0.28,
              duration: 0.9,
              ease: "sine.inOut",
              onUpdate: placePlane,
            },
            "<",
          )
          .to(
            [path, glowPath],
            {
              strokeDashoffset: pathLength * 0.72,
              duration: 0.9,
              ease: "sine.inOut",
            },
            "<",
          );

        /* ------------------------------------------------------------
           03 — Intro clears; content runway begins
           ------------------------------------------------------------ */

        tl.to([eyebrow, introBody, scrollHint], {
          autoAlpha: 0,
          y: -18,
          duration: 0.34,
          ease: "power2.in",
        })
          .to(
            title,
            {
              autoAlpha: 0,
              y: -105,
              duration: 0.62,
              ease: "power3.inOut",
            },
            "-=0.28",
          )
          .to(
            titleRule,
            {
              scaleX: 0,
              transformOrigin: "right center",
              duration: 0.34,
            },
            "-=0.4",
          )
          .to(
            orb,
            {
              autoAlpha: 0.92,
              x: 0,
              y: 0,
              scale: 1,
              rotate: 0,
              duration: 0.78,
              ease: "power3.out",
            },
            "-=0.42",
          )
          .to(
            cardStage,
            {
              autoAlpha: 1,
              duration: 0.25,
            },
            "-=0.35",
          );

        /* ------------------------------------------------------------
           04 — Every governance card becomes a story destination
           ------------------------------------------------------------ */

        const startProgress = 0.28;
        const endProgress = 0.84;
        const cardStep =
          cards.length > 1
            ? (endProgress - startProgress) / cards.length
            : endProgress - startProgress;

        cardEls.forEach((card, index) => {
          const kicker = card.querySelector<HTMLElement>(".govx-card-kicker");
          const cardTitle = card.querySelector<HTMLElement>(".govx-card-title");
          const copy = card.querySelector<HTMLElement>(".govx-card-copy");
          const rule = card.querySelector<HTMLElement>(".govx-card-rule");
          const halo = card.querySelector<HTMLElement>(".govx-card-halo");
          const indexEl = card.querySelector<HTMLElement>(".govx-card-index");

          const targetProgress = Math.min(
            endProgress,
            startProgress + cardStep * (index + 1),
          );

          tl.to(
            flight,
            {
              progress: targetProgress,
              duration: 0.68,
              ease: "sine.inOut",
              onUpdate: placePlane,
            },
            index === 0 ? undefined : "-=0.04",
          )
            .to(
              [path, glowPath],
              {
                strokeDashoffset: pathLength * (1 - targetProgress),
                duration: 0.68,
                ease: "sine.inOut",
              },
              "<",
            )
            .to(
              card,
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                rotateX: 0,
                duration: 0.52,
                ease: "power4.out",
              },
              "-=0.38",
            );

          if (halo) {
            tl.fromTo(
              halo,
              { opacity: 0, scale: 0.7 },
              {
                opacity: 1,
                scale: 1,
                duration: 0.5,
                ease: "power2.out",
              },
              "-=0.44",
            );
          }

          if (indexEl) {
            tl.fromTo(
              indexEl,
              { autoAlpha: 0, scale: 0.6 },
              {
                autoAlpha: 1,
                scale: 1,
                duration: 0.34,
                ease: "back.out(2)",
              },
              "-=0.42",
            );
          }

          tl.to(
            kicker,
            {
              autoAlpha: 1,
              x: 0,
              duration: 0.28,
              ease: "power2.out",
            },
            "-=0.3",
          )
            .to(
              cardTitle,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.44,
                ease: "power4.out",
              },
              "-=0.2",
            )
            .to(
              rule,
              {
                scaleX: 1,
                duration: 0.36,
                ease: "power2.out",
              },
              "-=0.24",
            )
            .to(
              copy,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.42,
                ease: "power3.out",
              },
              "-=0.22",
            )
            .to({}, { duration: 0.42 });

          if (index < cardEls.length - 1) {
            tl.to(card, {
              autoAlpha: 0,
              y: -34,
              scale: 0.97,
              duration: 0.38,
              ease: "power2.in",
            });
          }
        });

        /* ------------------------------------------------------------
           05 — Last card clears into final visual system
           ------------------------------------------------------------ */

        const lastCard = cardEls[cardEls.length - 1];

        if (lastCard) {
          tl.to(lastCard, {
            autoAlpha: 0,
            y: -40,
            scale: 0.96,
            duration: 0.42,
            ease: "power2.in",
          });
        }

        tl.to(
          flight,
          {
            progress: 1,
            duration: 0.8,
            ease: "sine.inOut",
            onUpdate: placePlane,
          },
          "-=0.16",
        )
          .to(
            [path, glowPath],
            {
              strokeDashoffset: 0,
              duration: 0.8,
              ease: "sine.inOut",
            },
            "<",
          )
          .to(
            orb,
            {
              x: 58,
              y: -30,
              scale: 1.08,
              opacity: 0.72,
              duration: 0.62,
              ease: "power2.inOut",
            },
            "-=0.58",
          );

        /* ------------------------------------------------------------
           06 — Intelligence/Search/Audit finale
           ------------------------------------------------------------ */

        tl.to(finalLabel, {
          autoAlpha: 1,
          y: 0,
          duration: 0.32,
          ease: "power2.out",
        })
          .to(
            finalTitle,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.52,
              ease: "power4.out",
            },
            "-=0.18",
          )
          .to(
            summaryChips,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.36,
              stagger: 0.06,
              ease: "power3.out",
            },
            "-=0.24",
          )
          .to(
            mockupStage,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.25,
            },
            "-=0.22",
          )
          .to(
            mockups,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              rotateX: 0,
              duration: 0.68,
              stagger: 0.09,
              ease: "power4.out",
            },
            "-=0.1",
          );

        if (mockups[0]) {
          tl.to(
            mockups[0],
            {
              rotateY: -5,
              x: -18,
              y: 8,
              duration: 0.42,
              ease: "power2.out",
            },
            "-=0.46",
          );
        }

        if (mockups[2]) {
          tl.to(
            mockups[2],
            {
              rotateY: 5,
              x: 18,
              y: 8,
              duration: 0.42,
              ease: "power2.out",
            },
            "<",
          );
        }

        tl.to({}, { duration: 0.95 });

        /* ------------------------------------------------------------
           07 — Clean exit; nothing outside Governance is touched
           ------------------------------------------------------------ */

        tl.to([finalLabel, finalTitle, summaryChips], {
          autoAlpha: 0,
          y: -18,
          duration: 0.36,
          ease: "power2.in",
        })
          .to(
            mockups,
            {
              autoAlpha: 0,
              y: -34,
              scale: 0.97,
              duration: 0.48,
              stagger: 0.04,
              ease: "power2.in",
            },
            "-=0.22",
          )
          .to(
            [plane, path, glowPath],
            {
              autoAlpha: 0,
              duration: 0.34,
            },
            "-=0.28",
          )
          .to(
            orb,
            {
              autoAlpha: 0,
              y: 95,
              scale: 0.92,
              duration: 0.5,
              ease: "power2.in",
            },
            "-=0.28",
          );
      }, scene);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, [cards.length, reduceMotion]);

  const mobileReveal = {
    hidden: reduceMotion
      ? { opacity: 1 }
      : {
          opacity: 0,
          y: 32,
          scale: 0.98,
        },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.68,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <section ref={sectionRef} className="relative isolate bg-[#050a0f]">
      {/* ============================================================= */}
      {/* DESKTOP — ONE SELF-CONTAINED PINNED GOVERNANCE STORY         */}
      {/* ============================================================= */}

      <div
        ref={sceneRef}
        className="relative hidden h-[100svh] min-h-[740px] overflow-hidden bg-[#050a0f] text-white lg:block"
      >
        <div className="absolute inset-0 bg-[#050a0f]" />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.033] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:88px_88px]"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_38%,rgba(34,211,238,.055),transparent_28%),radial-gradient(circle_at_18%_76%,rgba(129,140,248,.05),transparent_28%)]"
          aria-hidden="true"
        />

        {/* =========================================================== */}
        {/* FLIGHT PATH                                                 */}
        {/* =========================================================== */}

        <svg
          viewBox="0 0 1200 700"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="govx-flight-trail-gradient"
              x1="0%"
              y1="100%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.08" />
              <stop offset="34%" stopColor="#22d3ee" stopOpacity="0.82" />
              <stop offset="68%" stopColor="#60a5fa" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.82" />
            </linearGradient>

            <linearGradient
              id="govx-plane-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#5eead4" />
              <stop offset="34%" stopColor="#22d3ee" />
              <stop offset="68%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>

            <linearGradient
              id="govx-plane-fold"
              x1="0%"
              y1="100%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            <filter
              id="govx-trail-glow"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feGaussianBlur stdDeviation="4" />
            </filter>

            <filter
              id="govx-plane-glow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={GOVERNANCE_FLIGHT_PATH}
            fill="none"
            stroke="rgba(255,255,255,.045)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          <path
            ref={glowPathRef}
            d={GOVERNANCE_FLIGHT_PATH}
            fill="none"
            stroke="url(#govx-flight-trail-gradient)"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.18"
            filter="url(#govx-trail-glow)"
            vectorEffect="non-scaling-stroke"
          />

          <path
            ref={pathRef}
            d={GOVERNANCE_FLIGHT_PATH}
            fill="none"
            stroke="url(#govx-flight-trail-gradient)"
            strokeWidth="1.55"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          <g ref={planeRef} filter="url(#govx-plane-glow)">
            <g transform="translate(-37 -24)">
              <path
                d="M 3 28 L 73 3 L 51 47 L 36 31 Z"
                fill="url(#govx-plane-gradient)"
              />
              <path d="M 36 31 L 73 3 L 47 35 Z" fill="rgba(255,255,255,.72)" />
              <path
                d="M 36 31 L 51 47 L 42 32 Z"
                fill="url(#govx-plane-fold)"
              />
              <path d="M 3 28 L 36 31 L 23 38 Z" fill="#67e8f9" opacity="0.9" />
            </g>
          </g>
        </svg>

        {/* gradient object from the reference, adapted to iDocHive */}
        <div
          className="govx-orb pointer-events-none absolute -bottom-[165px] -left-[125px] h-[410px] w-[410px] rounded-full shadow-[0_0_90px_rgba(56,189,248,.08)]"
          style={{
            background:
              "radial-gradient(circle at 65% 28%, rgba(255,255,255,.72) 0%, rgba(103,232,249,.94) 15%, rgba(96,165,250,.93) 42%, rgba(129,140,248,.92) 66%, rgba(45,212,191,.78) 100%)",
          }}
          aria-hidden="true"
        >
          <div className="absolute inset-[3px] rounded-full bg-[#050a0f]/20" />
        </div>

        {/* =========================================================== */}
        {/* INTRO                                                       */}
        {/* =========================================================== */}

        <div className="absolute left-[6.5%] top-[27%] z-10 w-[min(49vw,700px)]">
          <p className="govx-eyebrow text-[11px] font-semibold tracking-[0.17em] text-teal-300 uppercase">
            Governance &amp; control
          </p>

          <h2 className="govx-title mt-3 text-[clamp(3.3rem,5.7vw,6.35rem)] font-medium leading-[0.92] tracking-[-0.058em] text-white">
            {headline}
          </h2>

          <div className="govx-title-rule mt-6 h-px w-28 bg-gradient-to-r from-teal-300 via-cyan-300 to-transparent" />

          <p className="govx-intro-body mt-5 max-w-lg text-sm leading-relaxed text-white/48 lg:text-base">
            {body}
          </p>
        </div>

        <div className="govx-scroll-hint absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 text-[9px] font-semibold tracking-[0.18em] text-white/25 uppercase">
          <span className="h-px w-9 bg-white/18" />
          Scroll to explore
          <span className="h-px w-9 bg-white/18" />
        </div>

        {/* =========================================================== */}
        {/* GOVERNANCE CARD STORY                                       */}
        {/* =========================================================== */}

        <div className="govx-card-stage pointer-events-none absolute inset-0 z-20">
          {cards.map((card, index) => {
            const accentClasses = [
              "from-teal-300 via-cyan-300 to-blue-400",
              "from-cyan-300 via-blue-400 to-indigo-400",
              "from-blue-300 via-indigo-400 to-violet-400",
              "from-teal-300 via-blue-400 to-violet-400",
            ];

            return (
              <article
                key={card.id}
                className="govx-story-card absolute right-[7%] top-1/2 w-[min(39vw,540px)] -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/[0.12] bg-[#09121c]/92 p-8 shadow-[0_34px_110px_rgba(0,0,0,.36)] backdrop-blur-sm"
              >
                <div className="govx-card-halo pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/[0.13] blur-[70px]" />

                <div className="relative">
                  <div className="flex items-center justify-between gap-6">
                    <div className="govx-card-kicker flex items-center gap-3 text-[10px] font-semibold tracking-[0.18em] text-teal-300/78 uppercase">
                      <span className="h-px w-8 bg-teal-300/60" />
                      Governance principle
                    </div>

                    <span className="govx-card-index font-mono text-xs tracking-[0.16em] text-white/30">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="govx-card-title mt-7 text-[clamp(2.1rem,3.2vw,3.7rem)] font-medium leading-[1] tracking-[-0.045em] text-white">
                    {card.title}
                  </h3>

                  <div
                    className={`govx-card-rule mt-6 h-px w-28 bg-gradient-to-r ${accentClasses[index % accentClasses.length]}`}
                  />

                  <p className="govx-card-copy mt-6 max-w-md text-base leading-relaxed text-white/54">
                    {card.text}
                  </p>

                  <div className="mt-8 flex items-center gap-2 text-[9px] font-semibold tracking-[0.14em] text-white/28 uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_12px_rgba(94,234,212,.75)]" />
                    Policy-aware
                    <span className="mx-1 text-white/10">/</span>
                    Traceable
                    <span className="mx-1 text-white/10">/</span>
                    Controlled
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* =========================================================== */}
        {/* FINAL AI / SEARCH / AUDIT SYSTEM                             */}
        {/* =========================================================== */}

        <div className="absolute inset-0 z-30 flex items-center justify-center px-8">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[0.7fr_1.3fr] items-center gap-10">
            <div>
              <p className="govx-final-label text-[10px] font-semibold tracking-[0.19em] text-cyan-300/78 uppercase">
                Governed intelligence
              </p>

              <h3 className="govx-final-title mt-4 max-w-md text-[clamp(2.45rem,4vw,4.7rem)] font-medium leading-[0.96] tracking-[-0.052em] text-white">
                Intelligence stays inside your controls.
              </h3>

              <div className="mt-7 flex flex-wrap gap-2">
                {[
                  "AI remains inside",
                  "Search stays governed",
                  "Every action auditable",
                ].map((label) => (
                  <span
                    key={label}
                    className="govx-summary-chip rounded-full border border-white/[0.1] bg-white/[0.045] px-3 py-1.5 text-[9px] font-semibold tracking-[0.11em] text-white/48 uppercase backdrop-blur-lg"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="govx-mockup-stage relative h-[500px]"
              style={{ perspective: "1400px" }}
            >
              <div className="govx-mockup absolute left-0 top-[70px] w-[58%] origin-center">
                <IntelligenceMockup />
              </div>

              <div className="govx-mockup absolute right-[2%] top-[20px] z-20 w-[58%] origin-center">
                <SearchMockup />
              </div>

              <div className="govx-mockup absolute bottom-[10px] left-[20%] z-30 w-[58%] origin-center">
                <AuditMockup />
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-40 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,transparent_54%,rgba(5,10,15,.60)_100%)]" />
      </div>

      {/* ============================================================= */}
      {/* MOBILE/TABLET — SAME CONTENT, LIGHTWEIGHT SEQUENTIAL MOTION   */}
      {/* ============================================================= */}

      <div className="relative overflow-hidden bg-[#050a0f] px-6 py-24 text-white lg:hidden">
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full opacity-65 blur-[1px]"
          style={{
            background:
              "radial-gradient(circle at 65% 28%, #a5f3fc 0%, #38bdf8 35%, #818cf8 68%, #2dd4bf 100%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-3xl">
          <motion.div
            variants={mobileReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <p className="text-[10px] font-semibold tracking-[0.16em] text-teal-300 uppercase">
              Governance &amp; control
            </p>

            <h2 className="mt-3 text-4xl font-medium leading-[1] tracking-[-0.045em] sm:text-5xl">
              {headline}
            </h2>

            <div className="mt-5 h-px w-20 bg-gradient-to-r from-teal-300 via-cyan-300 to-transparent" />

            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/58">
              {body}
            </p>
          </motion.div>

          <div className="relative mt-14 space-y-5 before:absolute before:bottom-8 before:left-[17px] before:top-8 before:w-px before:bg-gradient-to-b before:from-teal-300/55 before:via-blue-400/40 before:to-indigo-400/25">
            {cards.map((card, index) => (
              <motion.article
                key={card.id}
                variants={mobileReveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.28 }}
                className="relative grid grid-cols-[36px_1fr] gap-4"
              >
                <div className="relative z-10 flex h-9 w-9 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-300 shadow-[0_0_16px_rgba(94,234,212,.55)]" />
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.045] p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[9px] tracking-[0.15em] text-teal-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[8px] font-semibold tracking-[0.12em] text-white/25 uppercase">
                      Governed
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-semibold text-white">
                    {card.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-white/50">
                    {card.text}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>

          <motion.div
            variants={mobileReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.18 }}
            className="mt-16"
          >
            <p className="text-[9px] font-semibold tracking-[0.18em] text-cyan-300/75 uppercase">
              Governed intelligence
            </p>

            <h3 className="mt-3 text-3xl font-medium leading-tight tracking-[-0.04em]">
              Intelligence stays inside your controls.
            </h3>

            <div className="mt-8 space-y-4">
              <motion.div
                variants={mobileReveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.22 }}
              >
                <IntelligenceMockup />
              </motion.div>

              <motion.div
                variants={mobileReveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.22 }}
              >
                <SearchMockup />
              </motion.div>

              <motion.div
                variants={mobileReveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.22 }}
              >
                <AuditMockup />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   DEPLOYMENT + ARCHITECTURE — CONTINUOUS DARK SCROLL JOURNEY
   ========================================================================== */

type DeploymentMotionCard = {
  title: string;
  points: string[];
};

type InfraSceneMode = "deployment" | "architecture";

function InfrastructureField({
  active,
  reducedMotion,
  mode,
}: {
  active: boolean;
  reducedMotion: boolean;
  mode: InfraSceneMode;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const { positions, connections } = useMemo(() => {
    const count = mode === "deployment" ? 56 : 44;
    const points = new Float32Array(count * 3);
    const edges: number[] = [];

    let seed = mode === "deployment" ? 941 : 571;

    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let index = 0; index < count; index += 1) {
      points[index * 3] = (random() - 0.5) * 15;
      points[index * 3 + 1] = (random() - 0.5) * 8.6;
      points[index * 3 + 2] = (random() - 0.5) * 8;
    }

    const edgeCount = mode === "deployment" ? 24 : 28;

    for (let index = 0; index < edgeCount; index += 1) {
      const a = Math.floor(random() * count);
      let b = Math.floor(random() * count);

      if (a === b) {
        b = (b + 1) % count;
      }

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
  }, [mode]);

  useThrottledThreeFrames(active, reducedMotion, 28);

  useFrame((state, delta) => {
    if (!active || reducedMotion) return;

    if (rootRef.current) {
      rootRef.current.rotation.y = THREE.MathUtils.lerp(
        rootRef.current.rotation.y,
        state.pointer.x * 0.09,
        0.025,
      );

      rootRef.current.rotation.x = THREE.MathUtils.lerp(
        rootRef.current.rotation.x,
        -state.pointer.y * 0.045,
        0.025,
      );

      rootRef.current.rotation.z +=
        delta * (mode === "deployment" ? 0.004 : -0.003);
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y +=
        delta * (mode === "deployment" ? 0.012 : -0.009);
    }
  });

  const pointColor = mode === "deployment" ? "#67e8f9" : "#93c5fd";
  const lineColor = mode === "deployment" ? "#2dd4bf" : "#818cf8";

  return (
    <group ref={rootRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[connections, 3]}
          />
        </bufferGeometry>

        <lineBasicMaterial
          color={lineColor}
          transparent
          opacity={mode === "deployment" ? 0.09 : 0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>

        <pointsMaterial
          size={mode === "deployment" ? 0.04 : 0.035}
          color={pointColor}
          transparent
          opacity={mode === "deployment" ? 0.44 : 0.36}
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {mode === "deployment" ? (
        <>
          <mesh position={[-3.2, 1.1, -1.2]}>
            <sphereGeometry args={[0.075, 14, 14]} />
            <meshBasicMaterial color="#5eead4" />
          </mesh>

          <mesh position={[0.2, -0.7, -0.3]}>
            <sphereGeometry args={[0.065, 14, 14]} />
            <meshBasicMaterial color="#67e8f9" />
          </mesh>

          <mesh position={[3.5, 1.25, -1.7]}>
            <sphereGeometry args={[0.08, 14, 14]} />
            <meshBasicMaterial color="#93c5fd" />
          </mesh>
        </>
      ) : (
        <>
          <mesh rotation={[Math.PI / 2.4, 0.18, 0.15]}>
            <torusGeometry args={[2.9, 0.012, 8, 110]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.13} />
          </mesh>

          <mesh rotation={[Math.PI / 2.05, -0.48, -0.15]}>
            <torusGeometry args={[2.05, 0.01, 8, 100]} />
            <meshBasicMaterial color="#2dd4bf" transparent opacity={0.11} />
          </mesh>

          <mesh rotation={[Math.PI / 1.8, 0.5, 0.2]}>
            <torusGeometry args={[1.35, 0.01, 8, 90]} />
            <meshBasicMaterial color="#a78bfa" transparent opacity={0.1} />
          </mesh>
        </>
      )}
    </group>
  );
}

function InfrastructureBackground({
  active,
  reducedMotion,
  mode,
}: {
  active: boolean;
  reducedMotion: boolean;
  mode: InfraSceneMode;
}) {
  const enhancedVisuals = useEnhancedVisuals();
  const webglReady = useDeferredVisualActivation(
    active && enhancedVisuals && !reducedMotion,
    180,
  );
  const activated = usePersistentActivation(webglReady);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {activated && !reducedMotion ? (
        <Canvas
          frameloop="demand"
          camera={{
            position: [0, 0, 8],
            fov: 50,
          }}
          gl={{
            alpha: true,
            antialias: false,
            powerPreference: "high-performance",
          }}
          dpr={1}
        >
          <InfrastructureField
            active={active}
            reducedMotion={reducedMotion}
            mode={mode}
          />
        </Canvas>
      ) : null}
    </div>
  );
}

function DeploymentArchitectureMotionSection({
  deploymentHeadline,
  deploymentBody,
  deployments,
  architectureHeadline,
  architectureBody,
}: {
  deploymentHeadline: string;
  deploymentBody: string;
  deployments: DeploymentMotionCard[];
  architectureHeadline: string;
  architectureBody: string;
}) {
  const deploymentRef = useRef<HTMLElement>(null);
  const architectureRef = useRef<HTMLElement>(null);

  const reduceMotion = Boolean(useReducedMotion());

  const deploymentActive = useNearViewport(deploymentRef, "220px");
  const architectureActive = useNearViewport(architectureRef, "220px");

  useEffect(() => {
    const section = deploymentRef.current;

    if (!section || reduceMotion || typeof window === "undefined") {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const eyebrow = section.querySelector<HTMLElement>(".depx-eyebrow");
      const title = section.querySelector<HTMLElement>(".depx-title");
      const body = section.querySelector<HTMLElement>(".depx-body");
      const rule = section.querySelector<HTMLElement>(".depx-title-rule");
      const cards = Array.from(
        section.querySelectorAll<HTMLElement>(".depx-card"),
      );
      const spine = section.querySelector<HTMLElement>(".depx-spine");
      const spineFill = section.querySelector<HTMLElement>(".depx-spine-fill");
      const scan = section.querySelector<HTMLElement>(".depx-scan");
      const ambientA = section.querySelector<HTMLElement>(".depx-ambient-a");
      const ambientB = section.querySelector<HTMLElement>(".depx-ambient-b");
      const grid = section.querySelector<HTMLElement>(".depx-grid");
      const nodes = Array.from(
        section.querySelectorAll<HTMLElement>(".depx-node"),
      );

      gsap.set([eyebrow, title, body], {
        autoAlpha: 0,
        y: 34,
      });

      gsap.set(rule, {
        scaleX: 0,
        transformOrigin: "left center",
      });

      gsap.set(cards, {
        autoAlpha: 0,
        y: 66,
        scale: 0.94,
        rotateX: 7,
        transformPerspective: 1100,
      });

      gsap.set(nodes, {
        scale: 0.55,
        autoAlpha: 0.18,
      });

      gsap.set(spine, { autoAlpha: 0 });

      if (spineFill) {
        gsap.set(spineFill, {
          scaleX: 0,
          transformOrigin: "left center",
        });
      }

      if (scan) {
        gsap.set(scan, {
          xPercent: -145,
          autoAlpha: 0,
        });
      }

      const tl = gsap.timeline({
        defaults: {
          ease: "power3.inOut",
        },
        scrollTrigger: {
          trigger: section,
          start: "top 90%",
          end: "bottom 22%",
          scrub: 0.86,
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
            duration: 0.68,
            ease: "power4.out",
          },
          "-=0.12",
        )
        .to(
          rule,
          {
            scaleX: 1,
            duration: 0.54,
            ease: "power2.out",
          },
          "-=0.42",
        )
        .to(
          body,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            ease: "power3.out",
          },
          "-=0.4",
        )
        .to(
          spine,
          {
            autoAlpha: 1,
            duration: 0.28,
          },
          "-=0.2",
        );

      if (spineFill) {
        tl.to(
          spineFill,
          {
            scaleX: 1,
            duration: 1.45,
            ease: "none",
          },
          "-=0.16",
        );
      }

      cards.forEach((card, index) => {
        const cardIndex = card.querySelector<HTMLElement>(".depx-card-index");
        const cardTitle = card.querySelector<HTMLElement>(".depx-card-title");
        const points = Array.from(
          card.querySelectorAll<HTMLElement>(".depx-point"),
        );
        const node = nodes[index];
        const rail = card.querySelector<HTMLElement>(".depx-card-rail");
        const halo = card.querySelector<HTMLElement>(".depx-card-halo");

        if (cardIndex) {
          gsap.set(cardIndex, { autoAlpha: 0, x: -12 });
        }

        if (cardTitle) {
          gsap.set(cardTitle, { autoAlpha: 0, y: 18 });
        }

        gsap.set(points, { autoAlpha: 0, x: 16 });

        if (rail) {
          gsap.set(rail, {
            scaleX: 0,
            transformOrigin: "left center",
          });
        }

        if (halo) {
          gsap.set(halo, {
            opacity: 0,
            scale: 0.7,
          });
        }

        tl.to(
          card,
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            duration: 0.7,
            ease: "power4.out",
          },
          index === 0 ? "-=0.72" : "-=0.42",
        );

        if (node) {
          tl.to(
            node,
            {
              autoAlpha: 1,
              scale: 1.35,
              duration: 0.34,
              ease: "back.out(2)",
            },
            "-=0.58",
          );
        }

        if (halo) {
          tl.to(
            halo,
            {
              opacity: 1,
              scale: 1,
              duration: 0.48,
              ease: "power2.out",
            },
            "-=0.52",
          );
        }

        if (cardIndex) {
          tl.to(
            cardIndex,
            {
              autoAlpha: 1,
              x: 0,
              duration: 0.3,
            },
            "-=0.5",
          );
        }

        if (cardTitle) {
          tl.to(
            cardTitle,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.42,
              ease: "power3.out",
            },
            "-=0.34",
          );
        }

        if (rail) {
          tl.to(
            rail,
            {
              scaleX: 1,
              duration: 0.42,
              ease: "power2.out",
            },
            "-=0.3",
          );
        }

        if (points.length) {
          tl.to(
            points,
            {
              autoAlpha: 1,
              x: 0,
              duration: 0.34,
              stagger: 0.055,
              ease: "power2.out",
            },
            "-=0.28",
          );
        }

        if (node) {
          tl.to(
            node,
            {
              scale: 1,
              duration: 0.22,
            },
            "-=0.1",
          );
        }
      });

      if (scan) {
        tl.to(
          scan,
          {
            xPercent: 145,
            autoAlpha: 0.75,
            duration: 1.1,
            ease: "power1.inOut",
          },
          "-=0.8",
        );
      }

      if (ambientA) {
        gsap.fromTo(
          ambientA,
          { x: -80, y: 45, scale: 0.82 },
          {
            x: 60,
            y: -35,
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

      if (ambientB) {
        gsap.fromTo(
          ambientB,
          { x: 70, y: -40, scale: 0.9 },
          {
            x: -60,
            y: 55,
            scale: 1.08,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.25,
            },
          },
        );
      }

      if (grid) {
        gsap.fromTo(
          grid,
          { x: -28, y: -28 },
          {
            x: 54,
            y: 54,
            force3D: true,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          },
        );
      }
    }, section);

    return () => ctx.revert();
  }, [deployments.length, reduceMotion]);

  useEffect(() => {
    const section = architectureRef.current;

    if (!section || reduceMotion || typeof window === "undefined") {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const eyebrow = section.querySelector<HTMLElement>(".archx-eyebrow");
      const title = section.querySelector<HTMLElement>(".archx-title");
      const body = section.querySelector<HTMLElement>(".archx-body");
      const rule = section.querySelector<HTMLElement>(".archx-title-rule");
      const explorer = section.querySelector<HTMLElement>(".archx-explorer");
      const frame = section.querySelector<HTMLElement>(".archx-frame");
      const scan = section.querySelector<HTMLElement>(".archx-scan");
      const orbitA = section.querySelector<HTMLElement>(".archx-orbit-a");
      const orbitB = section.querySelector<HTMLElement>(".archx-orbit-b");
      const orbitC = section.querySelector<HTMLElement>(".archx-orbit-c");
      const nodes = Array.from(
        section.querySelectorAll<HTMLElement>(".archx-node"),
      );
      const labels = Array.from(
        section.querySelectorAll<HTMLElement>(".archx-label"),
      );
      const grid = section.querySelector<HTMLElement>(".archx-grid");
      const glow = section.querySelector<HTMLElement>(".archx-glow");

      gsap.set([eyebrow, title, body], {
        autoAlpha: 0,
        y: 34,
      });

      gsap.set(rule, {
        scaleX: 0,
        transformOrigin: "left center",
      });

      /*
       * IMPORTANT FOR THE ARCHITECTURE MODAL:
       * Do not put transform / perspective / filter on ancestors of
       * ArchitectureExplorer. A fixed dialog inside a transformed ancestor
       * becomes fixed to that box instead of the viewport.
       * We keep the reveal opacity-based and animate the surrounding scene.
       */
      gsap.set(explorer, {
        autoAlpha: 0,
      });

      gsap.set(frame, {
        autoAlpha: 0,
      });

      gsap.set([orbitA, orbitB, orbitC], {
        autoAlpha: 0,
        scale: 0.78,
      });

      gsap.set(nodes, {
        autoAlpha: 0,
        scale: 0.45,
      });

      gsap.set(labels, {
        autoAlpha: 0,
        y: 8,
      });

      if (scan) {
        gsap.set(scan, {
          yPercent: -160,
          autoAlpha: 0,
        });
      }

      const tl = gsap.timeline({
        defaults: {
          ease: "power3.inOut",
        },
        scrollTrigger: {
          trigger: section,
          start: "top 90%",
          end: "bottom 18%",
          scrub: 0.9,
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
            duration: 0.7,
            ease: "power4.out",
          },
          "-=0.12",
        )
        .to(
          rule,
          {
            scaleX: 1,
            duration: 0.52,
            ease: "power2.out",
          },
          "-=0.42",
        )
        .to(
          body,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.54,
            ease: "power3.out",
          },
          "-=0.4",
        )
        .to(
          [orbitA, orbitB, orbitC],
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.85,
            stagger: 0.08,
            ease: "power3.out",
          },
          "-=0.38",
        )
        .to(
          nodes,
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.42,
            stagger: 0.055,
            ease: "back.out(1.9)",
          },
          "-=0.62",
        )
        .to(
          labels,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.32,
            stagger: 0.05,
          },
          "-=0.38",
        )
        .to(
          frame,
          {
            autoAlpha: 1,
            duration: 0.48,
            ease: "power2.out",
          },
          "-=0.4",
        )
        .to(
          explorer,
          {
            autoAlpha: 1,
            duration: 0.72,
            ease: "power3.out",
          },
          "-=0.3",
        );

      if (scan) {
        tl.to(
          scan,
          {
            yPercent: 620,
            autoAlpha: 0.65,
            duration: 1.05,
            ease: "power1.inOut",
          },
          "-=0.68",
        );
      }

      tl.to(
        orbitA,
        {
          rotation: 24,
          duration: 0.85,
          ease: "none",
        },
        "-=0.95",
      )
        .to(
          orbitB,
          {
            rotation: -28,
            duration: 0.85,
            ease: "none",
          },
          "<",
        )
        .to(
          orbitC,
          {
            rotation: 38,
            duration: 0.85,
            ease: "none",
          },
          "<",
        );

      if (grid) {
        gsap.fromTo(
          grid,
          { x: -32, y: -20 },
          {
            x: 64,
            y: 44,
            force3D: true,
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

      if (glow) {
        gsap.fromTo(
          glow,
          { x: -70, y: 45, scale: 0.85 },
          {
            x: 70,
            y: -45,
            scale: 1.12,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.2,
            },
          },
        );
      }
    }, section);

    return () => ctx.revert();
  }, [reduceMotion]);

  const deploymentAccents = [
    {
      dot: "bg-teal-300 shadow-[0_0_18px_rgba(94,234,212,.58)]",
      line: "from-teal-300 via-cyan-300 to-transparent",
      glow: "bg-teal-400/[0.13]",
      border: "hover:border-teal-300/30",
    },
    {
      dot: "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.56)]",
      line: "from-cyan-300 via-blue-400 to-transparent",
      glow: "bg-cyan-400/[0.12]",
      border: "hover:border-cyan-300/30",
    },
    {
      dot: "bg-indigo-300 shadow-[0_0_18px_rgba(165,180,252,.54)]",
      line: "from-blue-400 via-indigo-400 to-transparent",
      glow: "bg-indigo-400/[0.12]",
      border: "hover:border-indigo-300/30",
    },
  ];

  return (
    <div className="relative bg-[#020817] text-white">
      {/* ============================================================= */}
      {/* DEPLOYMENT                                                    */}
      {/* ============================================================= */}

      <section
        ref={deploymentRef}
        className="relative overflow-hidden bg-[#020817] px-6 py-24 sm:py-28 lg:py-32"
      >
        <InfrastructureBackground
          active={deploymentActive}
          reducedMotion={reduceMotion}
          mode="deployment"
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(45,212,191,.10),transparent_25%),radial-gradient(circle_at_82%_68%,rgba(59,130,246,.10),transparent_28%)]" />

        <div
          className="depx-grid absolute -inset-24 opacity-[0.035] will-change-transform [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:82px_82px]"
          aria-hidden="true"
        />

        <div
          className="depx-ambient-a pointer-events-none absolute -left-40 top-20 h-[440px] w-[440px] rounded-full bg-teal-400/[0.11] blur-[135px]"
          aria-hidden="true"
        />

        <div
          className="depx-ambient-b pointer-events-none absolute -right-36 bottom-[-80px] h-[500px] w-[500px] rounded-full bg-blue-500/[0.12] blur-[150px]"
          aria-hidden="true"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/15 to-transparent" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="depx-eyebrow text-[10px] font-semibold tracking-[0.2em] text-teal-300/75 uppercase">
              Deployment modes
            </p>

            <h2 className="depx-title mt-4 text-4xl font-medium leading-[0.98] tracking-[-0.045em] text-white sm:text-5xl lg:text-[4.5rem]">
              {deploymentHeadline}
            </h2>

            <div className="depx-title-rule mt-6 h-px w-28 bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400" />

            <p className="depx-body mt-6 max-w-2xl text-base leading-relaxed text-white/52 sm:text-lg">
              {deploymentBody}
            </p>
          </div>

          <div className="relative mt-14 lg:mt-16">
            <div className="depx-spine pointer-events-none absolute left-[8%] right-[8%] top-[29px] hidden h-px bg-white/[0.06] lg:block">
              <div className="depx-spine-fill h-full origin-left scale-x-0 bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-400" />
            </div>

            <div className="relative grid gap-5 lg:grid-cols-3">
              {deployments.map((card, index) => {
                const accent =
                  deploymentAccents[index % deploymentAccents.length];

                return (
                  <div key={card.title} className="relative">
                    <span
                      className={`depx-node absolute left-7 top-[24px] z-20 hidden h-3 w-3 rounded-full lg:block ${accent.dot}`}
                      aria-hidden="true"
                    />

                    <div className="depx-card h-full will-change-transform">
                      <motion.article
                        whileHover={
                          reduceMotion
                            ? undefined
                            : {
                                y: -7,
                                scale: 1.012,
                              }
                        }
                        transition={{
                          duration: 0.32,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={`group relative h-full overflow-hidden rounded-[26px] border border-white/[0.095] bg-[#07111f]/90 p-6 shadow-[0_28px_90px_rgba(0,0,0,.28)] backdrop-blur-sm transition-[border-color,box-shadow] duration-300 ${accent.border} hover:shadow-[0_34px_105px_rgba(0,0,0,.36)] sm:p-7`}
                      >
                        <div
                          className={`depx-card-halo pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full ${accent.glow} blur-[62px]`}
                          aria-hidden="true"
                        />

                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

                        <div className="relative">
                          <div className="flex items-center justify-between gap-4">
                            <span className="depx-card-index font-mono text-[10px] tracking-[0.18em] text-white/30">
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            <span className="text-[8px] font-semibold tracking-[0.16em] text-white/24 uppercase">
                              Infrastructure
                            </span>
                          </div>

                          <h3 className="depx-card-title mt-6 text-2xl font-medium leading-tight tracking-[-0.03em] text-white">
                            {card.title}
                          </h3>

                          <div
                            className={`depx-card-rail mt-5 h-px w-24 bg-gradient-to-r ${accent.line}`}
                          />

                          <ul className="mt-6 space-y-3">
                            {card.points.map((point, pointIndex) => (
                              <li
                                key={point}
                                className="depx-point grid grid-cols-[22px_1fr] gap-3 text-sm leading-relaxed text-white/50"
                              >
                                <span className="pt-[2px] font-mono text-[9px] text-white/24">
                                  {String(pointIndex + 1).padStart(2, "0")}
                                </span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-7 flex items-center gap-2 text-[8px] font-semibold tracking-[0.15em] text-white/24 uppercase">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${accent.dot}`}
                            />
                            Secure runtime
                          </div>
                        </div>
                      </motion.article>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="depx-scan pointer-events-none absolute left-[-15%] top-[48%] h-px w-[130%] bg-gradient-to-r from-transparent via-cyan-300/65 to-transparent shadow-[0_0_26px_rgba(34,211,238,.28)]"
          aria-hidden="true"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#020817] to-transparent" />
      </section>

      {/* ============================================================= */}
      {/* ARCHITECTURE                                                  */}
      {/* ============================================================= */}

      <section
        ref={architectureRef}
        className="relative overflow-hidden bg-[#020817] px-6 pb-28 pt-16 sm:pb-32 lg:pb-36 lg:pt-20"
      >
        <InfrastructureBackground
          active={architectureActive}
          reducedMotion={reduceMotion}
          mode="architecture"
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,.10),transparent_31%),radial-gradient(circle_at_18%_72%,rgba(45,212,191,.065),transparent_24%)]" />

        <div
          className="archx-grid absolute -inset-24 opacity-[0.03] will-change-transform [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:96px_96px]"
          aria-hidden="true"
        />

        <div
          className="archx-glow pointer-events-none absolute left-1/2 top-[46%] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.11] blur-[160px]"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute left-1/2 top-[58%] hidden -translate-x-1/2 -translate-y-1/2 lg:block"
          aria-hidden="true"
        >
          <div className="archx-orbit-a absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/[0.08]" />
          <div className="archx-orbit-b absolute left-1/2 top-1/2 h-[590px] w-[590px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-300/[0.08]" />
          <div className="archx-orbit-c absolute left-1/2 top-1/2 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/[0.075]" />
        </div>

        {[
          ["13%", "47%", "INPUT"],
          ["27%", "75%", "OCR"],
          ["51%", "28%", "INDEX"],
          ["76%", "35%", "AI"],
          ["89%", "65%", "AUDIT"],
        ].map(([left, top, label], index) => (
          <div
            key={`${left}-${top}`}
            className="pointer-events-none absolute hidden lg:block"
            style={{ left, top }}
            aria-hidden="true"
          >
            <span
              className={`archx-node absolute left-0 top-0 h-2.5 w-2.5 rounded-full ${
                index % 2 === 0
                  ? "bg-teal-300 shadow-[0_0_18px_rgba(94,234,212,.55)]"
                  : "bg-blue-300 shadow-[0_0_18px_rgba(147,197,253,.55)]"
              }`}
            />

            <span className="archx-label absolute left-4 top-[-2px] whitespace-nowrap text-[7px] font-semibold tracking-[0.16em] text-white/26 uppercase">
              {label}
            </span>
          </div>
        ))}

        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="archx-eyebrow text-[10px] font-semibold tracking-[0.2em] text-cyan-300/75 uppercase">
              System architecture
            </p>

            <h2 className="archx-title mt-4 text-4xl font-medium leading-[0.98] tracking-[-0.045em] text-white sm:text-5xl lg:text-[4.5rem]">
              {architectureHeadline}
            </h2>

            <div className="archx-title-rule mx-auto mt-6 h-px w-28 bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-400" />

            <p className="archx-body mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/52 sm:text-lg">
              {architectureBody}
            </p>
          </div>

          <div className="archx-frame relative mx-auto mt-14 max-w-6xl rounded-[32px] border border-white/[0.095] bg-[#07111f]/92 p-1 shadow-[0_44px_145px_rgba(0,0,0,.38)] sm:mt-16">
            <div className="pointer-events-none absolute -inset-px rounded-[32px] border border-cyan-300/[0.08] shadow-[0_0_70px_rgba(34,211,238,.06)]" />

            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" />

            <div className="archx-scan pointer-events-none absolute inset-x-3 top-0 z-30 h-20 bg-gradient-to-b from-transparent via-cyan-300/[0.08] to-transparent" />

            {/*
              Keep ArchitectureExplorer free of transformed / filtered / clipped
              ancestors. Its internal fixed modal can now resolve against the
              browser viewport instead of this card.
            */}
            <div className="archx-explorer relative">
              <div className="relative rounded-[28px] p-5 bg-white shadow-[0_24px_75px_rgba(0,0,0,.20)] transition-shadow duration-300 hover:shadow-[0_30px_90px_rgba(0,0,0,.26)]">
                <ArchitectureExplorer />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[8px] font-semibold tracking-[0.14em] text-white/25 uppercase">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5">
              Ingest
            </span>
            <span className="text-cyan-300/35">→</span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5">
              Understand
            </span>
            <span className="text-cyan-300/35">→</span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5">
              Govern
            </span>
            <span className="text-cyan-300/35">→</span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5">
              Activate
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#020817] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#030914] to-transparent" />
      </section>
    </div>
  );
}

/* ==========================================================================
   FINAL CTA — REFERENCE-STYLE CONCENTRIC REVEAL
   ========================================================================== */

function FinalCtaStory({
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
  const reduceMotion = Boolean(useReducedMotion());

  const words = useMemo(
    () => headline.trim().split(/\s+/).filter(Boolean),
    [headline],
  );

  useEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;

    if (!section || !scene || reduceMotion || typeof window === "undefined") {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const ctx = gsap.context(() => {
        const rings = gsap.utils.toArray<HTMLElement>(".final-cta-ring");
        const chars = gsap.utils.toArray<HTMLElement>(".final-cta-char");
        const glow = scene.querySelector<HTMLElement>(".final-cta-core-glow");
        const bodyEl = scene.querySelector<HTMLElement>(".final-cta-body");
        const buttonEl = scene.querySelector<HTMLElement>(".final-cta-button");
        const eyebrow = scene.querySelector<HTMLElement>(".final-cta-eyebrow");
        const rule = scene.querySelector<HTMLElement>(".final-cta-rule");
        const noise = scene.querySelector<HTMLElement>(".final-cta-noise");

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

        gsap.set([bodyEl, buttonEl, eyebrow], {
          autoAlpha: 0,
          y: 16,
        });

        if (rule) {
          gsap.set(rule, {
            scaleX: 0,
            transformOrigin: "left center",
          });
        }

        if (glow) {
          gsap.set(glow, {
            scale: 0.35,
            autoAlpha: 0,
          });
        }

        const tl = gsap.timeline({
          defaults: {
            ease: "power3.inOut",
          },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${window.innerHeight * 2.55}`,
            scrub: 0.75,
            pin: scene,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        /* --------------------------------------------------------------
           PHASE 1 — quiet dark scene wakes up
           -------------------------------------------------------------- */

        tl.addLabel("reveal");

        if (noise) {
          tl.fromTo(
            noise,
            { opacity: 0.015 },
            { opacity: 0.045, duration: 0.65, ease: "power2.out" },
            "reveal",
          );
        }

        if (glow) {
          tl.to(
            glow,
            {
              scale: 1,
              autoAlpha: 0.72,
              duration: 0.8,
              ease: "power2.out",
            },
            "reveal+=0.05",
          );
        }

        /* --------------------------------------------------------------
           PHASE 2 — concentric rings bloom from the centre
           -------------------------------------------------------------- */

        tl.to(
          rings,
          {
            scale: 1,
            autoAlpha: 1,
            duration: 1.05,
            stagger: 0.065,
            ease: "power2.out",
          },
          "reveal+=0.05",
        );

        if (eyebrow) {
          tl.to(
            eyebrow,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.45,
              ease: "power2.out",
            },
            "reveal+=0.2",
          );
        }

        /* --------------------------------------------------------------
           PHASE 3 — headline types/reveals from left to right
           -------------------------------------------------------------- */

        tl.to(
          chars,
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.38,
            stagger: 0.018,
            ease: "power3.out",
          },
          "reveal+=0.28",
        );

        if (rule) {
          tl.to(
            rule,
            {
              scaleX: 1,
              duration: 0.65,
              ease: "power2.out",
            },
            "reveal+=0.7",
          );
        }

        if (bodyEl) {
          tl.to(
            bodyEl,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.55,
              ease: "power3.out",
            },
            "reveal+=0.78",
          );
        }

        if (buttonEl) {
          tl.fromTo(
            buttonEl,
            {
              autoAlpha: 0,
              y: 16,
              scale: 0.92,
            },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.48,
              ease: "back.out(1.8)",
            },
            "reveal+=0.92",
          );
        }

        /* --------------------------------------------------------------
           PHASE 4 — long visual hold like the reference
           -------------------------------------------------------------- */

        tl.to({}, { duration: 1.35 });

        tl.to(rings, {
          scale: (index) => 1 + index * 0.012,
          duration: 0.7,
          ease: "sine.inOut",
        });

        tl.to({}, { duration: 0.45 });

        /* --------------------------------------------------------------
           PHASE 5 — reverse wipe, leaving the beginning of headline last
           -------------------------------------------------------------- */

        if (buttonEl) {
          tl.to(buttonEl, {
            autoAlpha: 0,
            y: -12,
            scale: 0.96,
            duration: 0.32,
            ease: "power2.in",
          });
        }

        if (bodyEl) {
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
        }

        if (rule) {
          tl.to(
            rule,
            {
              scaleX: 0,
              duration: 0.38,
              transformOrigin: "right center",
              ease: "power2.in",
            },
            "-=0.18",
          );
        }

        tl.to(
          chars,
          {
            autoAlpha: 0,
            x: -6,
            duration: 0.25,
            stagger: {
              each: 0.012,
              from: "end",
            },
            ease: "power2.in",
          },
          "-=0.08",
        );

        if (eyebrow) {
          tl.to(
            eyebrow,
            {
              autoAlpha: 0,
              y: -8,
              duration: 0.25,
            },
            "-=0.22",
          );
        }

        tl.to(
          rings,
          {
            scale: 0.55,
            autoAlpha: 0,
            duration: 0.75,
            stagger: {
              each: 0.035,
              from: "end",
            },
            ease: "power3.in",
          },
          "-=0.28",
        );

        if (glow) {
          tl.to(
            glow,
            {
              scale: 0.5,
              autoAlpha: 0,
              duration: 0.65,
              ease: "power2.in",
            },
            "<",
          );
        }
      }, scene);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, [reduceMotion]);

  /* --------------------------------------------------------------------
     Reduced-motion / mobile version
     -------------------------------------------------------------------- */

  if (reduceMotion) {
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
      className="final-cta-story relative bg-[#020817] text-white"
    >
      <div
        ref={sceneRef}
        className="relative flex h-[100svh] min-h-[700px] w-full items-center justify-center overflow-hidden px-6"
      >
        {/* ============================================================
            BACKGROUND
            ============================================================ */}

        <div className="absolute inset-0 bg-[#020817]" />

        <div
          className="final-cta-noise pointer-events-none absolute inset-0 opacity-[0.025] [background-image:radial-gradient(rgba(255,255,255,0.35)_0.55px,transparent_0.55px)] [background-size:5px_5px]"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(45,212,191,0.09),transparent_19%),radial-gradient(circle_at_50%_52%,rgba(59,130,246,0.07),transparent_36%)]"
          aria-hidden="true"
        />

        {/* ============================================================
            CORE GLOW
            ============================================================ */}

        <div
          className="final-cta-core-glow pointer-events-none absolute left-1/2 top-[46%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/[0.14] blur-[75px]"
          aria-hidden="true"
        />

        {/* ============================================================
            CONCENTRIC RINGS — reference video behaviour
            ============================================================ */}

        <div
          className="final-cta-ring pointer-events-none absolute left-1/2 top-[46%] h-[clamp(240px,29vw,420px)] w-[clamp(240px,29vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300/[0.17] shadow-[0_0_55px_rgba(45,212,191,0.035)]"
          aria-hidden="true"
        />

        <div
          className="final-cta-ring pointer-events-none absolute left-1/2 top-[46%] h-[clamp(390px,47vw,680px)] w-[clamp(390px,47vw,680px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300/[0.20]"
          aria-hidden="true"
        />

        <div
          className="final-cta-ring pointer-events-none absolute left-1/2 top-[46%] h-[clamp(560px,67vw,960px)] w-[clamp(560px,67vw,960px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/[0.18]"
          aria-hidden="true"
        />

        <div
          className="final-cta-ring pointer-events-none absolute left-1/2 top-[46%] h-[clamp(760px,88vw,1260px)] w-[clamp(760px,88vw,1260px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/[0.15]"
          aria-hidden="true"
        />

        <div
          className="final-cta-ring pointer-events-none absolute left-1/2 top-[46%] h-[clamp(980px,112vw,1600px)] w-[clamp(980px,112vw,1600px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-400/[0.11]"
          aria-hidden="true"
        />

        {/* Soft vignette keeps copy readable */}

        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,8,23,0.05)_44%,rgba(2,8,23,0.78)_100%)]"
          aria-hidden="true"
        />

        {/* ============================================================
            CONTENT
            ============================================================ */}

        <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
          <div className="final-cta-eyebrow mb-5 flex items-center justify-center gap-3 text-[9px] font-semibold tracking-[0.22em] text-teal-300/70 uppercase sm:text-[10px]">
            <span className="h-px w-7 bg-gradient-to-r from-transparent to-teal-300/70" />
            Ready when you are
            <span className="h-px w-7 bg-gradient-to-l from-transparent to-teal-300/70" />
          </div>

          <h2 className="flex flex-wrap items-center justify-center text-[clamp(2.4rem,6vw,5.7rem)] font-medium leading-[0.98] tracking-[-0.055em]">
            {words.map((word, wordIndex) => {
              const isAccent = wordIndex === words.length - 1;

              return (
                <span
                  key={`${word}-${wordIndex}`}
                  className="mr-[0.2em] inline-flex whitespace-nowrap last:mr-0"
                >
                  {Array.from(word).map((char, charIndex) => (
                    <span
                      key={`${word}-${charIndex}`}
                      className={`final-cta-char inline-block ${
                        isAccent
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

          <div className="final-cta-rule mx-auto mt-6 h-px w-20 bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400 sm:w-28" />

          <p className="final-cta-body mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base lg:text-lg">
            {body}
          </p>

          <div className="final-cta-button mt-8 flex justify-center">
            <LocaleLink
              to="/book"
              className="group inline-flex min-h-12 items-center overflow-hidden rounded-lg border border-teal-300/[0.18] bg-white/[0.045] pl-5 pr-1.5 text-xs font-semibold tracking-[0.08em] text-white shadow-[0_18px_55px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:border-teal-300/35 hover:bg-white/[0.075]"
            >
              <span>{actionLabel}</span>

              <span className="ml-4 flex h-9 w-9 items-center justify-center rounded-md bg-teal-400 text-[#03101a] transition-transform duration-300 group-hover:translate-x-0.5">
                ↗
              </span>
            </LocaleLink>
          </div>
        </div>

        {/* ============================================================
            SMALL EDGE DETAILS
            ============================================================ */}

        <div
          className="pointer-events-none absolute bottom-7 left-7 hidden items-center gap-3 text-[8px] font-medium tracking-[0.18em] text-white/20 uppercase lg:flex"
          aria-hidden="true"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-teal-300/70" />
          iDocHive
          <span className="text-white/10">/</span>
          Secure document intelligence
        </div>

        <div
          className="pointer-events-none absolute bottom-7 right-7 hidden items-center gap-2 text-[8px] font-medium tracking-[0.16em] text-white/20 uppercase lg:flex"
          aria-hidden="true"
        >
          <span>Explore</span>
          <span className="h-px w-8 bg-gradient-to-r from-white/10 to-teal-300/40" />
        </div>

        {/* Mobile: content stays useful without pinning */}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#020817] to-transparent" />
      </div>
    </section>
  );
}

/* ==========================================================================
   USE CASES — ISOLATED CINEMATIC CASE STORY
   ========================================================================== */

type UseCaseStoryItem = {
  title: string;
  problem: string;
  workflow: string;
  result: string;
  control: string;
};

const USE_CASE_ACCENTS = [
  {
    dot: "#2dd4bf",
    soft: "rgba(45,212,191,.16)",
    glow: "rgba(45,212,191,.28)",
  },
  {
    dot: "#22d3ee",
    soft: "rgba(34,211,238,.15)",
    glow: "rgba(34,211,238,.27)",
  },
  {
    dot: "#60a5fa",
    soft: "rgba(96,165,250,.15)",
    glow: "rgba(96,165,250,.27)",
  },
  {
    dot: "#818cf8",
    soft: "rgba(129,140,248,.15)",
    glow: "rgba(129,140,248,.27)",
  },
  {
    dot: "#a78bfa",
    soft: "rgba(167,139,250,.14)",
    glow: "rgba(167,139,250,.25)",
  },
];

function UseCasesStorySection({
  headline,
  items,
}: {
  headline: string;
  items: UseCaseStoryItem[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const routeGlowRef = useRef<SVGPathElement>(null);

  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;
    const route = routeRef.current;
    const routeGlow = routeGlowRef.current;

    if (
      !section ||
      !scene ||
      !route ||
      !routeGlow ||
      reduceMotion ||
      typeof window === "undefined" ||
      items.length === 0
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const ctx = gsap.context(() => {
        const intro = scene.querySelector<HTMLElement>(".ucx-intro");
        const introTitle = scene.querySelector<HTMLElement>(".ucx-intro-title");
        const introLine = scene.querySelector<HTMLElement>(".ucx-intro-line");
        const counter = scene.querySelector<HTMLElement>(".ucx-counter");
        const caseStage = scene.querySelector<HTMLElement>(".ucx-case-stage");
        const progressFill =
          scene.querySelector<HTMLElement>(".ucx-progress-fill");
        const ambientGlow =
          scene.querySelector<HTMLElement>(".ucx-ambient-glow");
        const orbitA = scene.querySelector<HTMLElement>(".ucx-orbit-a");
        const orbitB = scene.querySelector<HTMLElement>(".ucx-orbit-b");
        const finalScene = scene.querySelector<HTMLElement>(".ucx-final-scene");
        const finalTitle = scene.querySelector<HTMLElement>(".ucx-final-title");

        const caseCards = Array.from(
          scene.querySelectorAll<HTMLElement>(".ucx-case-card"),
        );

        const navItems = Array.from(
          scene.querySelectorAll<HTMLElement>(".ucx-nav-item"),
        );

        const overviewCards = Array.from(
          scene.querySelectorAll<HTMLElement>(".ucx-overview-card"),
        );

        const nodes = Array.from(
          scene.querySelectorAll<HTMLElement>(".ucx-float-node"),
        );

        const routeLength = route.getTotalLength();

        gsap.set([route, routeGlow], {
          strokeDasharray: routeLength,
          strokeDashoffset: routeLength,
        });

        gsap.set(intro, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          transformOrigin: "left top",
        });

        gsap.set(introTitle, {
          autoAlpha: 0,
          y: 48,
          rotateX: 8,
          transformPerspective: 900,
        });

        gsap.set(introLine, {
          scaleX: 0,
          transformOrigin: "left center",
        });

        gsap.set(counter, {
          autoAlpha: 0,
          x: -12,
        });

        gsap.set(caseStage, { autoAlpha: 0 });

        gsap.set(caseCards, {
          autoAlpha: 0,
          x: 90,
          y: 105,
          scale: 0.9,
          rotateX: 7,
          rotateY: -10,
          transformPerspective: 1400,
          transformOrigin: "center center",
        });

        caseCards.forEach((card) => {
          gsap.set(card.querySelector(".ucx-card-index"), {
            autoAlpha: 0,
            x: -16,
          });

          gsap.set(card.querySelector(".ucx-card-title"), {
            autoAlpha: 0,
            y: 28,
          });

          gsap.set(card.querySelector(".ucx-card-rule"), {
            scaleX: 0,
            transformOrigin: "left center",
          });

          gsap.set(card.querySelectorAll(".ucx-detail-row"), {
            autoAlpha: 0,
            y: 22,
          });

          gsap.set(card.querySelector(".ucx-control-pill"), {
            autoAlpha: 0,
            y: 12,
            scale: 0.94,
          });

          gsap.set(card.querySelector(".ucx-card-scan"), {
            yPercent: -130,
            autoAlpha: 0,
          });
        });

        gsap.set(navItems, {
          autoAlpha: 0,
          x: -10,
        });

        gsap.set(finalScene, {
          autoAlpha: 0,
          y: 30,
        });

        gsap.set(finalTitle, {
          autoAlpha: 0,
          y: 28,
        });

        gsap.set(overviewCards, {
          autoAlpha: 0,
          y: 70,
          scale: 0.9,
          rotateX: 8,
          transformPerspective: 1200,
        });

        gsap.set(nodes, {
          autoAlpha: 0,
          scale: 0.4,
        });

        if (progressFill) {
          gsap.set(progressFill, {
            scaleX: 0,
            transformOrigin: "left center",
          });
        }

        const tl = gsap.timeline({
          defaults: {
            ease: "power3.inOut",
          },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () =>
              `+=${window.innerHeight * Math.max(5.2, 2.8 + items.length * 1.45)}`,
            scrub: 0.78,
            pin: scene,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        /* ============================================================ */
        /* INTRO                                                        */
        /* ============================================================ */

        tl.addLabel("intro");

        tl.to(
          introTitle,
          {
            autoAlpha: 1,
            y: 0,
            rotateX: 0,
            duration: 0.85,
            ease: "power4.out",
          },
          "intro",
        );

        tl.to(
          introLine,
          {
            scaleX: 1,
            duration: 0.7,
            ease: "power2.out",
          },
          "intro+=0.25",
        );

        tl.to(
          counter,
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.5,
          },
          "intro+=0.35",
        );

        tl.to(
          nodes,
          {
            autoAlpha: 0.65,
            scale: 1,
            duration: 0.6,
            stagger: 0.06,
            ease: "back.out(1.8)",
          },
          "intro+=0.2",
        );

        if (ambientGlow) {
          tl.fromTo(
            ambientGlow,
            {
              x: -120,
              y: 80,
              scale: 0.72,
              opacity: 0.18,
            },
            {
              x: 0,
              y: 0,
              scale: 1,
              opacity: 0.7,
              duration: 1.1,
              ease: "power2.out",
            },
            "intro",
          );
        }

        if (orbitA) {
          tl.fromTo(
            orbitA,
            { rotation: -20, scale: 0.88, opacity: 0 },
            {
              rotation: 12,
              scale: 1,
              opacity: 1,
              duration: 1.1,
            },
            "intro+=0.08",
          );
        }

        if (orbitB) {
          tl.fromTo(
            orbitB,
            { rotation: 22, scale: 0.85, opacity: 0 },
            {
              rotation: -10,
              scale: 1,
              opacity: 1,
              duration: 1.1,
            },
            "intro+=0.12",
          );
        }

        tl.to({}, { duration: 0.45 });

        /* Move headline into compact section identity. */
        tl.to(intro, {
          x: -24,
          y: -235,
          scale: 0.62,
          duration: 0.85,
          ease: "power3.inOut",
        });

        tl.to(
          caseStage,
          {
            autoAlpha: 1,
            duration: 0.35,
          },
          "-=0.35",
        );

        tl.to(
          navItems,
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.45,
            stagger: 0.055,
          },
          "-=0.3",
        );

        /* ============================================================ */
        /* CASE-BY-CASE STORY                                           */
        /* ============================================================ */

        caseCards.forEach((card, index) => {
          const accent = USE_CASE_ACCENTS[index % USE_CASE_ACCENTS.length];
          const nav = navItems[index];
          const cardIndex = card.querySelector<HTMLElement>(".ucx-card-index");
          const cardTitle = card.querySelector<HTMLElement>(".ucx-card-title");
          const cardRule = card.querySelector<HTMLElement>(".ucx-card-rule");
          const detailRows =
            card.querySelectorAll<HTMLElement>(".ucx-detail-row");
          const control = card.querySelector<HTMLElement>(".ucx-control-pill");
          const scan = card.querySelector<HTMLElement>(".ucx-card-scan");
          const halo = card.querySelector<HTMLElement>(".ucx-card-halo");

          tl.addLabel(`case-${index}`);

          /* Navigation focus */
          if (navItems.length) {
            tl.to(
              navItems,
              {
                opacity: 0.32,
                scale: 0.96,
                duration: 0.22,
              },
              `case-${index}`,
            );
          }

          if (nav) {
            tl.to(
              nav,
              {
                opacity: 1,
                scale: 1.04,
                duration: 0.28,
              },
              `case-${index}`,
            );

            tl.to(
              nav.querySelector(".ucx-nav-dot"),
              {
                backgroundColor: accent.dot,
                boxShadow: `0 0 22px ${accent.glow}`,
                scale: 1.35,
                duration: 0.28,
              },
              `case-${index}`,
            );
          }

          /* Route redraw for each case */
          tl.set(
            [route, routeGlow],
            {
              strokeDashoffset: routeLength,
              opacity: 1,
            },
            `case-${index}`,
          );

          tl.to(
            routeGlow,
            {
              strokeDashoffset: routeLength * 0.15,
              duration: 0.58,
              ease: "power2.out",
            },
            `case-${index}`,
          );

          tl.to(
            route,
            {
              strokeDashoffset: 0,
              duration: 0.72,
              ease: "power2.out",
            },
            `case-${index}`,
          );

          /* Card takeover */
          tl.fromTo(
            card,
            {
              autoAlpha: 0,
              x: 90,
              y: 105,
              scale: 0.9,
              rotateX: 7,
              rotateY: -10,
            },
            {
              autoAlpha: 1,
              x: 0,
              y: 0,
              scale: 1,
              rotateX: 0,
              rotateY: 0,
              duration: 0.8,
              ease: "power4.out",
            },
            `case-${index}+=0.15`,
          );

          if (halo) {
            tl.fromTo(
              halo,
              {
                opacity: 0,
                scale: 0.7,
              },
              {
                opacity: 1,
                scale: 1,
                duration: 0.7,
                ease: "power2.out",
              },
              `case-${index}+=0.18`,
            );
          }

          if (scan) {
            tl.fromTo(
              scan,
              {
                autoAlpha: 0,
                yPercent: -130,
              },
              {
                autoAlpha: 0.8,
                yPercent: 520,
                duration: 0.85,
                ease: "power1.inOut",
              },
              `case-${index}+=0.24`,
            );
          }

          tl.to(
            cardIndex,
            {
              autoAlpha: 1,
              x: 0,
              duration: 0.4,
            },
            `case-${index}+=0.32`,
          );

          tl.to(
            cardTitle,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.55,
              ease: "power3.out",
            },
            `case-${index}+=0.36`,
          );

          tl.to(
            cardRule,
            {
              scaleX: 1,
              duration: 0.55,
              ease: "power2.out",
            },
            `case-${index}+=0.46`,
          );

          tl.to(
            detailRows,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.48,
              stagger: 0.08,
              ease: "power3.out",
            },
            `case-${index}+=0.52`,
          );

          tl.to(
            control,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.4,
              ease: "back.out(1.7)",
            },
            `case-${index}+=0.72`,
          );

          tl.to({}, { duration: 0.58 });

          /* Current case archives away to make room for next. */
          if (index < caseCards.length - 1) {
            tl.to(card, {
              x: -120,
              y: -82,
              scale: 0.82,
              rotateY: 8,
              autoAlpha: 0.08,
              duration: 0.7,
              ease: "power3.inOut",
            });

            if (nav) {
              tl.to(
                nav.querySelector(".ucx-nav-dot"),
                {
                  scale: 1,
                  boxShadow: "0 0 0 rgba(0,0,0,0)",
                  duration: 0.24,
                },
                "<",
              );
            }
          }
        });

        /* ============================================================ */
        /* OVERVIEW / FINALE                                            */
        /* ============================================================ */

        tl.to(caseCards, {
          autoAlpha: 0,
          y: -45,
          scale: 0.93,
          duration: 0.55,
          stagger: 0.035,
          ease: "power2.in",
        });

        tl.to(
          [caseStage, route, routeGlow],
          {
            autoAlpha: 0,
            duration: 0.35,
          },
          "-=0.28",
        );

        tl.to(
          intro,
          {
            autoAlpha: 0,
            y: -270,
            duration: 0.35,
          },
          "<",
        );

        tl.to(
          navItems,
          {
            autoAlpha: 0,
            x: -12,
            duration: 0.35,
            stagger: 0.025,
          },
          "<",
        );

        tl.to(finalScene, {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
        });

        tl.to(
          finalTitle,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power4.out",
          },
          "-=0.35",
        );

        tl.to(
          overviewCards,
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            duration: 0.72,
            stagger: 0.075,
            ease: "power4.out",
          },
          "-=0.38",
        );

        tl.to({}, { duration: 0.65 });

        if (orbitA) {
          tl.to(
            orbitA,
            {
              rotation: 42,
              scale: 1.08,
              opacity: 0.55,
              duration: 0.8,
            },
            "-=0.45",
          );
        }

        if (orbitB) {
          tl.to(
            orbitB,
            {
              rotation: -38,
              scale: 1.12,
              opacity: 0.48,
              duration: 0.8,
            },
            "<",
          );
        }

        tl.to(finalScene, {
          y: -24,
          scale: 0.985,
          opacity: 0.55,
          duration: 0.75,
          ease: "power2.inOut",
        });

        /* page-progress inside this pinned sequence */
        if (progressFill) {
          gsap.to(progressFill, {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: () =>
                `+=${window.innerHeight * Math.max(5.2, 2.8 + items.length * 1.45)}`,
              scrub: true,
            },
          });
        }
      }, scene);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, [items.length, reduceMotion]);

  const mobileReveal = {
    hidden: reduceMotion
      ? { opacity: 1 }
      : {
          opacity: 0,
          y: 34,
          scale: 0.98,
        },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.68,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <section
      ref={sectionRef}
      id="use-cases"
      className="relative isolate scroll-mt-24 bg-[#030914]"
    >
      {/* ============================================================= */}
      {/* DESKTOP — PINNED CASE STORY                                  */}
      {/* ============================================================= */}

      <div
        ref={sceneRef}
        className="relative hidden h-[100svh] min-h-[760px] overflow-hidden bg-[#030914] text-white lg:block"
      >
        <div className="absolute inset-0 bg-[#030914]" />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:92px_92px]"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_44%,rgba(37,99,235,.09),transparent_29%),radial-gradient(circle_at_23%_75%,rgba(45,212,191,.07),transparent_27%)]"
          aria-hidden="true"
        />

        <div
          className="ucx-ambient-glow pointer-events-none absolute -right-32 top-[18%] h-[520px] w-[520px] rounded-full bg-blue-500/[0.11] blur-[140px]"
          aria-hidden="true"
        />

        {/* large geometry */}
        <div
          className="ucx-orbit-a pointer-events-none absolute -right-[8%] top-[4%] h-[620px] w-[620px] rounded-full border border-cyan-300/[0.08]"
          aria-hidden="true"
        />

        <div
          className="ucx-orbit-b pointer-events-none absolute -right-[1%] top-[13%] h-[470px] w-[470px] rounded-full border border-blue-300/[0.08]"
          aria-hidden="true"
        />

        {/* small floating nodes */}
        {[
          ["14%", "25%"],
          ["25%", "73%"],
          ["58%", "13%"],
          ["91%", "68%"],
          ["80%", "26%"],
          ["45%", "84%"],
        ].map(([left, top], index) => (
          <span
            key={`${left}-${top}`}
            className={`
              ucx-float-node
              pointer-events-none
              absolute
              h-1.5
              w-1.5
              rounded-full
              ${
                index % 2 === 0
                  ? "bg-teal-300 shadow-[0_0_14px_rgba(94,234,212,.75)]"
                  : "bg-blue-300 shadow-[0_0_14px_rgba(147,197,253,.72)]"
              }
            `}
            style={{ left, top }}
            aria-hidden="true"
          />
        ))}

        {/* =========================================================== */}
        {/* INTRO                                                       */}
        {/* =========================================================== */}

        <div className="ucx-intro absolute left-[7%] top-1/2 z-20 w-[min(44vw,620px)] -translate-y-1/2">
          <div className="ucx-counter mb-5 flex items-center gap-3 font-mono text-[10px] tracking-[0.18em] text-teal-300/75">
            <span>{String(items.length).padStart(2, "0")}</span>
            <span className="h-px w-10 bg-gradient-to-r from-teal-300/75 to-transparent" />
          </div>

          <h2 className="ucx-intro-title text-[clamp(3rem,5.5vw,6rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white">
            {headline}
          </h2>

          <div className="ucx-intro-line mt-7 h-px w-32 bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400" />
        </div>

        {/* =========================================================== */}
        {/* NAV                                                         */}
        {/* =========================================================== */}

        <div className="absolute bottom-[9%] left-[7%] z-20 flex flex-col gap-3">
          {items.map((item, index) => (
            <div
              key={`nav-${item.title}`}
              className="ucx-nav-item flex origin-left items-center gap-3"
            >
              <span className="ucx-nav-dot h-2 w-2 rounded-full bg-white/20" />

              <span className="font-mono text-[9px] tracking-[0.14em] text-white/36">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="hidden max-w-[180px] truncate text-[10px] font-medium text-white/38 xl:block">
                {item.title}
              </span>
            </div>
          ))}
        </div>

        {/* =========================================================== */}
        {/* ROUTE                                                       */}
        {/* =========================================================== */}

        <svg
          viewBox="0 0 1200 700"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="ucx-route-gradient"
              x1="0%"
              y1="100%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.04" />
              <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.72" />
              <stop offset="72%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.7" />
            </linearGradient>

            <filter
              id="ucx-route-glow"
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          <path
            ref={routeGlowRef}
            d="M 220 515 C 330 510 350 390 445 350 C 520 318 558 335 620 328"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.12"
            filter="url(#ucx-route-glow)"
          />

          <path
            ref={routeRef}
            d="M 220 515 C 330 510 350 390 445 350 C 520 318 558 335 620 328"
            fill="none"
            stroke="url(#ucx-route-gradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {/* =========================================================== */}
        {/* ACTIVE CARD STAGE                                           */}
        {/* =========================================================== */}

        <div className="ucx-case-stage absolute left-[42%] top-1/2 z-30 h-[520px] w-[min(51vw,720px)] -translate-y-1/2">
          {items.map((item, index) => {
            const accent = USE_CASE_ACCENTS[index % USE_CASE_ACCENTS.length];

            return (
              <article
                key={`story-${item.title}`}
                className="ucx-case-card absolute inset-0 overflow-hidden rounded-[30px] border border-white/[0.11] bg-white text-slate-950 shadow-[0_45px_150px_rgba(0,0,0,.34)] will-change-transform"
              >
                <div
                  className="ucx-card-halo pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full blur-[70px]"
                  style={{ background: accent.soft }}
                  aria-hidden="true"
                />

                <div
                  className="ucx-card-scan pointer-events-none absolute left-0 right-0 top-0 z-10 h-20 bg-gradient-to-b from-transparent via-cyan-300/[0.13] to-transparent"
                  aria-hidden="true"
                />

                <div className="relative z-20 flex h-full flex-col p-8 xl:p-10">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="ucx-card-index flex items-center gap-3 font-mono text-[10px] tracking-[0.16em] text-slate-400">
                        <span style={{ color: accent.dot }}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>/</span>
                        <span>{String(items.length).padStart(2, "0")}</span>
                      </div>

                      <h3 className="ucx-card-title mt-4 max-w-[540px] text-3xl font-semibold leading-[1.04] tracking-[-0.035em] text-slate-950 xl:text-[2.65rem]">
                        {item.title}
                      </h3>
                    </div>

                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{
                        background: accent.dot,
                        boxShadow: `0 0 22px ${accent.glow}`,
                      }}
                      aria-hidden="true"
                    />
                  </div>

                  <div
                    className="ucx-card-rule mt-7 h-px w-full"
                    style={{
                      background: `linear-gradient(90deg, ${accent.dot}, rgba(148,163,184,.15), transparent)`,
                    }}
                  />

                  <div className="mt-5 flex flex-1 flex-col justify-center gap-3">
                    {[item.problem, item.workflow, item.result].map(
                      (copy, rowIndex) => (
                        <div
                          key={`${item.title}-${rowIndex}`}
                          className="ucx-detail-row grid grid-cols-[34px_1fr] items-start gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-4"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-mono text-[9px] text-slate-400 shadow-sm">
                            {String(rowIndex + 1).padStart(2, "0")}
                          </span>

                          <p
                            className={`text-sm leading-relaxed xl:text-[15px] ${
                              rowIndex === 0
                                ? "text-slate-500"
                                : "text-slate-700"
                            }`}
                          >
                            {copy}
                          </p>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-5">
                    <div className="flex items-center gap-2 text-[9px] font-medium tracking-[0.14em] text-slate-400 uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>

                    <div
                      className="ucx-control-pill max-w-[70%] rounded-full border px-4 py-2 text-right text-[10px] font-semibold tracking-[0.09em] uppercase"
                      style={{
                        borderColor: `${accent.dot}33`,
                        color: accent.dot,
                        background: accent.soft,
                      }}
                    >
                      {item.control}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* =========================================================== */}
        {/* FINAL OVERVIEW                                               */}
        {/* =========================================================== */}

        <div className="ucx-final-scene invisible absolute inset-0 z-40 flex items-center px-[7%]">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="ucx-final-title max-w-3xl text-[clamp(2.6rem,4.7vw,5.2rem)] font-medium leading-[0.97] tracking-[-0.05em] text-white">
              {headline}
            </h2>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {items.map((item, index) => {
                const accent =
                  USE_CASE_ACCENTS[index % USE_CASE_ACCENTS.length];

                return (
                  <article
                    key={`overview-${item.title}`}
                    className="ucx-overview-card group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.045] p-5 backdrop-blur-sm"
                  >
                    <div
                      className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full blur-3xl"
                      style={{ background: accent.soft }}
                      aria-hidden="true"
                    />

                    <div className="relative flex items-start gap-4">
                      <span
                        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-[9px]"
                        style={{
                          borderColor: `${accent.dot}38`,
                          color: accent.dot,
                          background: accent.soft,
                        }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-white">
                          {item.title}
                        </h3>

                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/42">
                          {item.result}
                        </p>

                        <p
                          className="mt-3 truncate text-[9px] font-semibold tracking-[0.12em] uppercase"
                          style={{ color: accent.dot }}
                        >
                          {item.control}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {/* pinned sequence progress */}
        <div className="absolute bottom-0 left-0 right-0 z-50 h-[2px] bg-white/[0.04]">
          <div className="ucx-progress-fill h-full origin-left scale-x-0 bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 h-28 bg-gradient-to-b from-[#030914] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-28 bg-gradient-to-t from-[#030914] to-transparent" />
      </div>

      {/* ============================================================= */}
      {/* MOBILE / TABLET                                               */}
      {/* ============================================================= */}

      <div className="relative overflow-hidden bg-[#030914] px-6 py-24 text-white lg:hidden">
        <div
          className="pointer-events-none absolute -right-28 top-16 h-80 w-80 rounded-full bg-blue-500/[0.11] blur-[100px]"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -left-36 bottom-28 h-80 w-80 rounded-full bg-teal-400/[0.09] blur-[110px]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-3xl">
          <motion.div
            initial={mobileReveal.hidden}
            whileInView={mobileReveal.show}
            viewport={{ once: true, amount: 0.45 }}
          >
            <div className="flex items-center gap-3 font-mono text-[9px] tracking-[0.16em] text-teal-300/70">
              <span>{String(items.length).padStart(2, "0")}</span>
              <span className="h-px w-9 bg-gradient-to-r from-teal-300/70 to-transparent" />
            </div>

            <h2 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl">
              {headline}
            </h2>
          </motion.div>

          <div className="relative mt-12 space-y-5 before:absolute before:bottom-8 before:left-[18px] before:top-8 before:w-px before:bg-gradient-to-b before:from-teal-300/40 before:via-blue-300/28 before:to-indigo-300/20">
            {items.map((item, index) => {
              const accent = USE_CASE_ACCENTS[index % USE_CASE_ACCENTS.length];

              return (
                <motion.article
                  key={`mobile-${item.title}`}
                  initial={mobileReveal.hidden}
                  whileInView={mobileReveal.show}
                  viewport={{ once: true, amount: 0.22 }}
                  transition={{ delay: index * 0.035 }}
                  className="relative grid grid-cols-[38px_1fr] gap-4"
                >
                  <div className="relative z-10 flex h-9 w-9 items-center justify-center">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: accent.dot,
                        boxShadow: `0 0 18px ${accent.glow}`,
                      }}
                    />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.045] p-5 backdrop-blur-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span
                          className="font-mono text-[9px] tracking-[0.14em]"
                          style={{ color: accent.dot }}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <h3 className="mt-2 text-xl font-semibold text-white">
                          {item.title}
                        </h3>
                      </div>

                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: accent.dot }}
                      />
                    </div>

                    <div className="mt-5 space-y-3">
                      {[item.problem, item.workflow, item.result].map(
                        (copy, rowIndex) => (
                          <motion.div
                            key={`${item.title}-mobile-${rowIndex}`}
                            initial={
                              reduceMotion
                                ? false
                                : {
                                    opacity: 0,
                                    x: 16,
                                  }
                            }
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, amount: 0.65 }}
                            transition={{
                              duration: 0.5,
                              delay: 0.12 + rowIndex * 0.07,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            className="grid grid-cols-[26px_1fr] gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"
                          >
                            <span className="font-mono text-[8px] text-white/26">
                              {String(rowIndex + 1).padStart(2, "0")}
                            </span>

                            <p className="text-sm leading-relaxed text-white/52">
                              {copy}
                            </p>
                          </motion.div>
                        ),
                      )}
                    </div>

                    <motion.p
                      initial={
                        reduceMotion
                          ? false
                          : {
                              opacity: 0,
                              scale: 0.94,
                            }
                      }
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.45,
                        delay: 0.35,
                      }}
                      className="mt-4 inline-flex rounded-full border px-3 py-1.5 text-[9px] font-semibold tracking-[0.1em] uppercase"
                      style={{
                        borderColor: `${accent.dot}35`,
                        background: accent.soft,
                        color: accent.dot,
                      }}
                    >
                      {item.control}
                    </motion.p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   SECTION DECORATION
   ========================================================================== */

function SectionLine() {
  return (
    <div
      className="
        js-section-line
        pointer-events-none
        absolute
        left-6
        right-6
        top-0
        h-px
        origin-left
        scale-x-0
        bg-gradient-to-r
        from-transparent
        via-teal-600/25
        to-transparent
      "
    />
  );
}

/* ==========================================================================
   TRANSFORM STORY — VIDEO-STYLE PINNED SVG NETWORK
   ========================================================================== */

type TransformStage = {
  title: string;
  text: string;
};

const transformNetwork = [
  {
    start: "M -40 130 C 170 155 355 275 560 335",
    end: "M -40 150 C 115 180 235 220 330 205",
    x: 330,
    y: 205,
    color: "#2dd4bf",
  },
  {
    start: "M -40 245 C 180 245 365 300 560 335",
    end: "M -40 270 C 165 260 330 250 545 245",
    x: 545,
    y: 245,
    color: "#22d3ee",
  },
  {
    start: "M -40 380 C 175 372 365 354 560 335",
    end: "M -40 420 C 165 400 305 500 470 470",
    x: 470,
    y: 470,
    color: "#60a5fa",
  },
  {
    start: "M -40 570 C 160 510 350 400 560 335",
    end: "M -40 565 C 175 520 315 485 575 505",
    x: 575,
    y: 505,
    color: "#818cf8",
  },
] as const;

function TransformStorySection({
  headline,
  stages,
}: {
  headline: string;
  stages: TransformStage[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useReducedMotion());

  const headlineWords = useMemo(() => headline.trim().split(/\s+/), [headline]);

  useEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;

    if (!section || !scene || reduceMotion || typeof window === "undefined") {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const ctx = gsap.context(() => {
        const paths = gsap.utils.toArray<SVGPathElement>(
          ".transform-network-path",
        );

        const shadowPaths = gsap.utils.toArray<SVGPathElement>(
          ".transform-network-shadow",
        );

        const nodes = gsap.utils.toArray<SVGCircleElement>(
          ".transform-network-node",
        );

        const nodeHalos = gsap.utils.toArray<SVGCircleElement>(
          ".transform-node-halo",
        );

        const labels = gsap.utils.toArray<HTMLElement>(".transform-node-label");

        const copies = gsap.utils.toArray<HTMLElement>(".transform-stage-copy");

        const introWords = gsap.utils.toArray<HTMLElement>(
          ".transform-intro-word",
        );

        /*
         * Keep the animation stable even if translation data
         * contains fewer than four stages.
         */
        const stageCount = Math.min(
          paths.length,
          nodes.length,
          labels.length,
          copies.length,
          transformNetwork.length,
        );

        paths.forEach((path, index) => {
          const length = path.getTotalLength();

          gsap.set(path, {
            strokeDasharray: length,
            strokeDashoffset: length,
            strokeOpacity: 0.72,
            attr: {
              d: transformNetwork[index].start,
            },
          });
        });

        shadowPaths.forEach((path, index) => {
          gsap.set(path, {
            attr: {
              d: transformNetwork[index].start,
            },
          });
        });

        nodes.forEach((node, index) => {
          gsap.set(node, {
            attr: {
              cx: 560,
              cy: 335,
            },
            scale: 0,
            opacity: 0,
            fill: transformNetwork[index].color,
            transformOrigin: "center center",
          });
        });

        nodeHalos.forEach((node, index) => {
          gsap.set(node, {
            attr: {
              cx: 560,
              cy: 335,
            },
            scale: 0.35,
            opacity: 0,
            stroke: transformNetwork[index].color,
            transformOrigin: "center center",
          });
        });

        gsap.set(labels, {
          autoAlpha: 0,
          y: 10,
        });

        gsap.set(copies, {
          autoAlpha: 0,
          y: 32,
        });

        gsap.set(".transform-hub", {
          scale: 0,
          opacity: 0,
          transformOrigin: "center center",
        });

        gsap.set(".transform-hub-halo", {
          scale: 0.4,
          opacity: 0,
          transformOrigin: "center center",
        });

        gsap.set(".transform-hub-label", {
          autoAlpha: 0,
          x: -10,
        });

        gsap.set(introWords, {
          yPercent: 112,
          rotateX: 22,
          transformOrigin: "50% 100%",
        });

        gsap.set(".transform-intro-kicker", {
          autoAlpha: 0,
          y: 10,
        });

        gsap.set(".transform-intro-rule", {
          scaleX: 0,
          transformOrigin: "left center",
        });

        gsap.set(".transform-intro-sub", {
          autoAlpha: 0,
          y: 20,
        });

        gsap.set(".transform-network-caption", {
          autoAlpha: 0,
          y: 10,
        });

        gsap.set(".transform-stage-index", {
          autoAlpha: 0,
          x: -12,
        });

        const timeline = gsap.timeline({
          defaults: {
            ease: "power3.inOut",
          },

          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${Math.max(window.innerHeight * 4.8, 3500)}`,
            scrub: 0.9,
            pin: scene,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        /* ==============================================================
           01 — CURVES DRAW INTO THE CENTRAL HUB
           ============================================================== */

        timeline.to(paths, {
          strokeDashoffset: 0,
          duration: 1.25,
          stagger: 0.07,
          ease: "power2.out",
        });

        timeline.to(
          ".transform-hub",
          {
            scale: 1,
            opacity: 1,
            duration: 0.42,
            ease: "back.out(2.2)",
          },
          "-=0.5",
        );

        timeline.fromTo(
          ".transform-hub-halo",
          {
            scale: 0.45,
            opacity: 0.7,
          },
          {
            scale: 3.5,
            opacity: 0,
            duration: 0.9,
            ease: "power2.out",
          },
          "-=0.35",
        );

        timeline.to(
          ".transform-hub-label",
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.35,
            ease: "power2.out",
          },
          "-=0.58",
        );

        /* ==============================================================
           02 — INTRO COPY REVEAL BESIDE THE HUB
           ============================================================== */

        timeline.to(
          ".transform-intro-kicker",
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.35,
          },
          "-=0.42",
        );

        timeline.to(
          introWords,
          0.75,
          {
            yPercent: 0,
            rotateX: 0,
            stagger: 0.045,
            ease: [0.22, 1, 0.36, 1] as any,
          },
          "-=0.25",
        );

        timeline.to(
          ".transform-intro-rule",
          {
            scaleX: 1,
            duration: 0.65,
            ease: "power2.out",
          },
          "-=0.5",
        );

        timeline.to(
          ".transform-intro-sub",
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            ease: "power2.out",
          },
          "-=0.45",
        );

        /*
         * Small scroll hold, matching the pacing of the supplied video.
         */
        timeline.to({}, { duration: 0.65 });

        /* ==============================================================
           03 — INTRO COPY DIMS / NETWORK PREPARES TO OPEN
           ============================================================== */

        timeline.to(".transform-intro", {
          autoAlpha: 0.08,
          y: -24,
          duration: 0.48,
          ease: "power2.in",
        });

        timeline.to(
          ".transform-hub-label",
          {
            autoAlpha: 0,
            duration: 0.25,
          },
          "<",
        );

        /* ==============================================================
           04 — CURVES FAN OUT INTO FOUR LABELED NODES
           ============================================================== */

        paths.slice(0, stageCount).forEach((path, index) => {
          timeline.to(
            path,
            {
              attr: {
                d: transformNetwork[index].end,
              },
              strokeOpacity: 0.8,
              duration: 1.15,
              ease: "power3.inOut",
            },
            index === 0 ? undefined : "<",
          );
        });

        shadowPaths.slice(0, stageCount).forEach((path, index) => {
          timeline.to(
            path,
            {
              attr: {
                d: transformNetwork[index].end,
              },
              duration: 1.15,
              ease: "power3.inOut",
            },
            "<",
          );
        });

        nodes.slice(0, stageCount).forEach((node, index) => {
          const target = transformNetwork[index];

          timeline.to(
            node,
            {
              attr: {
                cx: target.x,
                cy: target.y,
              },
              scale: 1,
              opacity: 1,
              duration: 1.15,
              ease: "power3.inOut",
            },
            "<",
          );
        });

        nodeHalos.slice(0, stageCount).forEach((node, index) => {
          const target = transformNetwork[index];

          timeline.to(
            node,
            {
              attr: {
                cx: target.x,
                cy: target.y,
              },
              scale: 1,
              opacity: 0.22,
              duration: 1.15,
              ease: "power3.inOut",
            },
            "<",
          );
        });

        timeline.to(
          ".transform-hub",
          {
            scale: 0.55,
            opacity: 0.22,
            duration: 0.75,
          },
          "<",
        );

        timeline.to(
          labels.slice(0, stageCount),
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.075,
            ease: "power2.out",
          },
          "-=0.4",
        );

        timeline.to(
          ".transform-network-caption",
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
          },
          "-=0.35",
        );

        /* ==============================================================
           05 — EACH STAGE GETS A FOCUSED MOMENT
           ============================================================== */

        copies.slice(0, stageCount).forEach((copy, index) => {
          const path = paths[index];
          const node = nodes[index];
          const halo = nodeHalos[index];
          const label = labels[index];

          timeline.to(paths, {
            strokeOpacity: 0.16,
            duration: 0.22,
          });

          timeline.to(
            nodes,
            {
              opacity: 0.28,
              scale: 0.88,
              duration: 0.22,
            },
            "<",
          );

          timeline.to(
            nodeHalos,
            {
              opacity: 0.06,
              duration: 0.22,
            },
            "<",
          );

          timeline.to(
            labels,
            {
              opacity: 0.28,
              duration: 0.22,
            },
            "<",
          );

          timeline.to(
            path,
            {
              strokeOpacity: 1,
              strokeWidth: 2.4,
              duration: 0.28,
            },
            "<",
          );

          timeline.to(
            node,
            {
              opacity: 1,
              scale: 1.45,
              duration: 0.32,
              ease: "back.out(2)",
            },
            "<",
          );

          timeline.to(
            halo,
            {
              opacity: 0.42,
              scale: 1.65,
              duration: 0.32,
            },
            "<",
          );

          timeline.to(
            label,
            {
              opacity: 1,
              duration: 0.25,
            },
            "<",
          );

          timeline.to(
            ".transform-stage-index",
            {
              autoAlpha: 1,
              x: 0,
              duration: 0.3,
            },
            "<",
          );

          timeline.fromTo(
            copy,
            {
              autoAlpha: 0,
              y: 32,
            },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.52,
              ease: "power3.out",
            },
            "-=0.08",
          );

          /*
           * Hold the copy long enough to read while continuing to scroll.
           */
          timeline.to({}, { duration: 0.62 });

          timeline.to(copy, {
            autoAlpha: 0,
            y: -22,
            duration: 0.38,
            ease: "power2.in",
          });

          timeline.to(
            path,
            {
              strokeWidth: 1.7,
              duration: 0.22,
            },
            "<",
          );

          timeline.to(
            node,
            {
              scale: 1,
              duration: 0.22,
            },
            "<",
          );

          timeline.to(
            halo,
            {
              scale: 1,
              duration: 0.22,
            },
            "<",
          );
        });

        /* ==============================================================
           06 — FINAL NETWORK OVERVIEW
           ============================================================== */

        timeline.to(paths, {
          strokeOpacity: 0.78,
          strokeWidth: 1.7,
          duration: 0.4,
        });

        timeline.to(
          nodes,
          {
            opacity: 1,
            scale: 1,
            duration: 0.4,
          },
          "<",
        );

        timeline.to(
          nodeHalos,
          {
            opacity: 0.2,
            scale: 1,
            duration: 0.4,
          },
          "<",
        );

        timeline.to(
          labels,
          {
            opacity: 1,
            duration: 0.4,
          },
          "<",
        );

        timeline.to(
          ".transform-stage-index",
          {
            autoAlpha: 0,
            x: -12,
            duration: 0.25,
          },
          "<",
        );

        timeline.to({}, { duration: 0.25 });

        /* ==============================================================
           07 — SCENE EXITS LEFT LIKE THE REFERENCE VIDEO
           ============================================================== */

        timeline.to(".transform-world", {
          xPercent: -12,
          yPercent: -3,
          scale: 0.97,
          duration: 0.9,
          ease: "power2.inOut",
        });

        timeline.to(
          ".transform-world",
          {
            opacity: 0.08,
            duration: 0.6,
            ease: "power2.in",
          },
          "-=0.3",
        );
      }, scene);

      scheduleScrollTriggerRefresh();

      return () => ctx.revert();
    });

    return () => {
      mm.revert();
    };
  }, [reduceMotion, stages.length]);

  if (reduceMotion) {
    return (
      <section
        className="
          relative
          bg-[#020817]
          px-6
          py-20
          text-white
        "
      >
        <div className="mx-auto max-w-6xl">
          <SectionHeading title={headline} />

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {stages.map((stage, index) => (
              <article
                key={stage.title}
                className="
                  rounded-2xl
                  border
                  border-white/10
                  bg-white/[0.04]
                  p-6
                "
              >
                <span className="font-mono text-xs text-teal-300">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <h3 className="mt-3 text-lg font-semibold">{stage.title}</h3>

                <p className="mt-3 text-sm leading-relaxed text-white/55">
                  {stage.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="
        transform-story
        relative
        z-10
        bg-[#020817]
        text-white
      "
    >
      <div
        ref={sceneRef}
        className="
          relative
          flex
          h-[100svh]
          min-h-[720px]
          w-full
          items-center
          overflow-hidden
        "
      >
        {/* ============================================================= */}
        {/* BACKGROUND                                                    */}
        {/* ============================================================= */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[radial-gradient(circle_at_44%_48%,rgba(20,184,166,0.085),transparent_31%),radial-gradient(circle_at_72%_70%,rgba(59,130,246,0.065),transparent_29%),linear-gradient(180deg,#020817_0%,#030b14_55%,#020817_100%)]
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-[0.022]
            [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)]
            [background-size:96px_96px]
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[radial-gradient(circle_at_center,transparent_20%,rgba(2,8,23,0.32)_100%)]
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            inset-x-0
            top-0
            z-20
            h-28
            bg-gradient-to-b
            from-[#020817]
            to-transparent
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            inset-x-0
            bottom-0
            z-20
            h-28
            bg-gradient-to-t
            from-[#020817]
            to-transparent
          "
        />

        {/* ============================================================= */}
        {/* DESKTOP PINNED STORY                                          */}
        {/* ============================================================= */}

        <div
          className="
            transform-world
            absolute
            inset-0
            hidden
            will-change-transform
            md:block
          "
        >
          <svg
            viewBox="0 0 1200 680"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="transform-flow-gradient"
                x1="0%"
                y1="50%"
                x2="100%"
                y2="50%"
              >
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.18" />

                <stop offset="36%" stopColor="#2dd4bf" stopOpacity="0.82" />

                <stop offset="72%" stopColor="#38bdf8" stopOpacity="0.95" />

                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.95" />
              </linearGradient>

              <radialGradient id="transform-hub-gradient">
                <stop offset="0%" stopColor="#f0fdfa" />

                <stop offset="38%" stopColor="#99f6e4" />

                <stop offset="100%" stopColor="#2dd4bf" />
              </radialGradient>

              <filter
                id="transform-node-glow"
                x="-300%"
                y="-300%"
                width="600%"
                height="600%"
              >
                <feGaussianBlur stdDeviation="5" result="blur" />

                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {transformNetwork.map((item, index) => (
              <path
                key={`shadow-${index}`}
                className="transform-network-shadow"
                d={item.start}
                fill="none"
                stroke={item.color}
                strokeOpacity="0.045"
                strokeWidth="7"
                strokeLinecap="round"
              />
            ))}

            {transformNetwork.map((item, index) => (
              <path
                key={`path-${index}`}
                className="transform-network-path"
                d={item.start}
                fill="none"
                stroke="url(#transform-flow-gradient)"
                strokeWidth="1.7"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <circle
              className="transform-hub-halo"
              cx="560"
              cy="335"
              r="11"
              fill="#2dd4bf"
              opacity="0"
            />

            <circle
              className="transform-hub"
              cx="560"
              cy="335"
              r="6.5"
              fill="url(#transform-hub-gradient)"
              filter="url(#transform-node-glow)"
            />

            {transformNetwork.map((item, index) => (
              <g key={`node-group-${index}`}>
                <circle
                  className="transform-node-halo"
                  cx="560"
                  cy="335"
                  r="12"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="1"
                  opacity="0"
                />

                <circle
                  className="transform-network-node"
                  cx="560"
                  cy="335"
                  r="5"
                  fill={item.color}
                  filter="url(#transform-node-glow)"
                />
              </g>
            ))}
          </svg>

          {/* Central label, matching the small label next to the hub */}

          <div
            className="
              transform-hub-label
              pointer-events-none
              absolute
              left-[46.65%]
              top-[47.7%]
              -translate-y-full
              pl-3
              text-[8px]
              font-semibold
              tracking-[0.16em]
              text-teal-100/80
              uppercase
            "
          >
            Document intelligence
          </div>

          {/* Node labels */}

          {stages.slice(0, 4).map((stage, index) => {
            const point = transformNetwork[index];

            return (
              <div
                key={stage.title}
                className="
                  transform-node-label
                  pointer-events-none
                  absolute
                  whitespace-nowrap
                "
                style={{
                  left: `${(point.x / 1200) * 100}%`,
                  top: `${(point.y / 680) * 100}%`,
                }}
              >
                <span
                  className="
                    absolute
                    bottom-[10px]
                    left-[9px]
                    text-[8px]
                    font-semibold
                    tracking-[0.14em]
                    text-white/72
                    uppercase
                  "
                >
                  {stage.title}
                </span>
              </div>
            );
          })}

          {/* =========================================================== */}
          {/* INTRO TEXT — BESIDE THE CONVERGENCE HUB                     */}
          {/* =========================================================== */}

          <div
            className="
              transform-intro
              absolute
              left-[49%]
              top-1/2
              z-10
              w-[min(43vw,540px)]
              -translate-y-1/2
            "
          >
            <div
              className="
                transform-intro-kicker
                mb-4
                flex
                items-center
                gap-2
                text-[9px]
                font-semibold
                tracking-[0.18em]
                text-teal-300/75
                uppercase
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_12px_rgba(94,234,212,.8)]" />
              Transform
            </div>

            <h2
              className="
                text-[clamp(2.2rem,3.7vw,4.3rem)]
                font-medium
                leading-[0.96]
                tracking-[-0.052em]
                text-white
              "
              style={{ perspective: "900px" }}
            >
              {headlineWords.map((word, index) => (
                <span
                  key={`${word}-${index}`}
                  className="
                    mr-[0.18em]
                    inline-block
                    overflow-hidden
                    align-top
                  "
                >
                  <span
                    className="
                      transform-intro-word
                      inline-block
                      origin-bottom
                    "
                  >
                    {word}
                  </span>
                </span>
              ))}
            </h2>

            <div
              className="
                transform-intro-rule
                mt-6
                h-px
                w-24
                bg-gradient-to-r
                from-teal-300
                via-cyan-400
                to-blue-500
              "
            />

            <p
              className="
                transform-intro-sub
                mt-5
                max-w-md
                text-sm
                leading-relaxed
                text-white/48
                lg:text-base
              "
            >
              Documents converge into one governed intelligence layer, then
              branch into structured, usable outcomes.
            </p>
          </div>

          {/* =========================================================== */}
          {/* STAGE-SPECIFIC COPY — BOTTOM RIGHT LIKE THE VIDEO           */}
          {/* =========================================================== */}

          <div
            className="
              absolute
              bottom-[10%]
              right-[6%]
              z-10
              h-[190px]
              w-[min(39vw,500px)]
            "
          >
            <div
              className="
                transform-stage-index
                absolute
                -left-12
                top-2
                hidden
                font-mono
                text-[10px]
                tracking-[0.18em]
                text-teal-300/60
                xl:block
              "
            >
              FLOW
            </div>

            {stages.slice(0, 4).map((stage, index) => (
              <article
                key={stage.title}
                className="
                  transform-stage-copy
                  invisible
                  absolute
                  inset-0
                "
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-[0.18em] text-teal-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span
                    className="h-px w-10"
                    style={{
                      background: `linear-gradient(90deg, ${transformNetwork[index].color}, transparent)`,
                    }}
                  />
                </div>

                <h3
                  className="
                    mt-4
                    text-3xl
                    font-medium
                    leading-[1.02]
                    tracking-[-0.04em]
                    text-white
                    lg:text-[2.7rem]
                  "
                >
                  {stage.title}
                </h3>

                <p
                  className="
                    mt-4
                    max-w-md
                    text-sm
                    leading-relaxed
                    text-white/52
                    lg:text-base
                  "
                >
                  {stage.text}
                </p>
              </article>
            ))}
          </div>

          {/* Small network caption */}

          <div
            className="
              transform-network-caption
              absolute
              bottom-[8%]
              left-8
              hidden
              items-center
              gap-4
              text-[8px]
              font-semibold
              tracking-[0.16em]
              text-white/24
              uppercase
              lg:flex
            "
          >
            <span className="text-teal-300/65">Document flow</span>

            <span className="h-px w-8 bg-white/10" />

            <span>Structured intelligence</span>
          </div>

          <div
            className="
              absolute
              bottom-7
              left-1/2
              z-10
              flex
              -translate-x-1/2
              items-center
              gap-3
              text-[7px]
              font-semibold
              tracking-[0.2em]
              text-white/20
              uppercase
            "
          >
            <span className="h-px w-8 bg-white/15" />
            Scroll to explore
            <span className="h-px w-8 bg-white/15" />
          </div>
        </div>

        {/* ============================================================= */}
        {/* MOBILE / TABLET FALLBACK                                      */}
        {/* ============================================================= */}

        <div
          className="
            relative
            z-10
            mx-auto
            w-full
            max-w-6xl
            px-6
            py-20
            md:hidden
          "
        >
          <div>
            <p
              className="
                text-[10px]
                font-semibold
                tracking-[0.2em]
                text-teal-300
                uppercase
              "
            >
              Transform
            </p>

            <h2
              className="
                mt-4
                text-3xl
                font-semibold
                leading-tight
                tracking-[-0.035em]
              "
            >
              {headline}
            </h2>
          </div>

          <div
            className="
              relative
              mt-12
              space-y-5
              before:absolute
              before:bottom-8
              before:left-[17px]
              before:top-8
              before:w-px
              before:bg-gradient-to-b
              before:from-teal-400/50
              before:via-blue-400/40
              before:to-indigo-400/30
            "
          >
            {stages.map((stage, index) => {
              const colors = [
                "bg-teal-400 shadow-[0_0_18px_rgba(45,212,191,.45)]",
                "bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,.40)]",
                "bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,.40)]",
                "bg-indigo-400 shadow-[0_0_18px_rgba(129,140,248,.40)]",
              ];

              return (
                <motion.article
                  key={stage.title}
                  initial={{
                    opacity: 0,
                    y: 28,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.35,
                  }}
                  transition={{
                    duration: 0.65,
                    delay: index * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="
                    relative
                    grid
                    grid-cols-[36px_1fr]
                    gap-4
                  "
                >
                  <div
                    className="
                      relative
                      z-10
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                    "
                  >
                    <span
                      className={`
                        h-2.5
                        w-2.5
                        rounded-full
                        ${colors[index % colors.length]}
                      `}
                    />
                  </div>

                  <div
                    className="
                      rounded-2xl
                      border
                      border-white/[0.09]
                      bg-white/[0.035]
                      p-5
                      backdrop-blur-sm
                    "
                  >
                    <span className="font-mono text-[9px] tracking-[0.15em] text-teal-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <h3 className="mt-2 text-lg font-semibold">
                      {stage.title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-white/50">
                      {stage.text}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   PAGE-WIDE SCROLL ANIMATION SYSTEM
   ========================================================================== */

function useHomeScrollAnimations(
  rootRef: RefObject<HTMLDivElement | null>,
  reducedMotion: boolean,
) {
  useEffect(() => {
    const root = rootRef.current;

    if (!root || reducedMotion || typeof window === "undefined") {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({
      ignoreMobileResize: true,
      limitCallbacks: true,
    });

    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: "(min-width: 768px)",
        mobile: "(max-width: 767px)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const conditions = context.conditions as {
          desktop?: boolean;
          mobile?: boolean;
          reduce?: boolean;
        };

        if (conditions.reduce) {
          return;
        }

        const desktop = Boolean(conditions.desktop);

        const one = (selector: string) =>
          root.querySelector<HTMLElement>(selector);

        const all = (selector: string) =>
          Array.from(root.querySelectorAll<HTMLElement>(selector));

        const createTimeline = (selector: string, start = "top 78%") => {
          const section = one(selector);

          if (!section) return null;

          return gsap.timeline({
            defaults: {
              ease: "power3.out",
            },

            scrollTrigger: {
              trigger: section,
              start,
              once: true,
            },
          });
        };

        const animateHeading = (
          sectionSelector: string,
          timeline: gsap.core.Timeline,
        ) => {
          const section = one(sectionSelector);
          const wrapper = section?.querySelector<HTMLElement>(
            ".js-section-heading",
          );

          if (!wrapper) return;

          const title = wrapper.querySelector<HTMLElement>("h1,h2,h3");

          const body = wrapper.querySelector<HTMLElement>("p");

          if (title) {
            timeline.from(title, {
              autoAlpha: 0,
              y: desktop ? 46 : 28,
              duration: 0.85,
            });
          }

          if (body) {
            timeline.from(
              body,
              {
                autoAlpha: 0,
                y: 18,
                duration: 0.65,
                ease: "power2.out",
              },
              "-=0.52",
            );
          }

          const line = section?.querySelector<HTMLElement>(".js-section-line");

          if (line) {
            timeline.to(
              line,
              {
                scaleX: 1,
                duration: 0.85,
                ease: "power2.out",
              },
              "-=0.58",
            );
          }
        };

        /* ==============================================================
           TOP SCROLL PROGRESS
           ============================================================== */

        const progress = one(".js-page-progress");

        if (progress) {
          gsap.to(progress, {
            scaleX: 1,
            ease: "none",

            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.15,
            },
          });
        }

        /* ==============================================================
           HERO EXIT
           ============================================================== */

        const hero = one(".js-hero");
        const heroCopy = one(".js-hero-copy");
        const heroStage = one(".js-hero-stage");
        const heroBackground = one(".js-hero-background");

        if (hero && desktop) {
          if (heroCopy) {
            gsap.to(heroCopy, {
              y: -55,
              opacity: 0.5,
              ease: "none",

              scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: 0.8,
              },
            });
          }

          if (heroStage) {
            gsap.to(heroStage, {
              y: -30,
              scale: 0.96,
              ease: "none",

              scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: 0.9,
              },
            });
          }

          if (heroBackground) {
            gsap.to(heroBackground, {
              scale: 1.035,
              ease: "none",

              scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: 1.2,
              },
            });
          }
        }

        /* ==============================================================
           TRUST STRIP — SCRUBBED VERIFICATION STORY
           ============================================================== */

        {
          const trustStrip = one(".js-trust-strip");
          const trustItems = all(".js-trust-item");
          const trustDots = all(".js-trust-dot");
          const trustCopies = all(".js-trust-copy");
          const trustLines = all(".js-trust-item-line");
          const trustScan = one(".js-trust-scan");
          const trustAmbient = one(".js-trust-ambient");

          if (trustStrip && trustItems.length) {
            /*
             * IMPORTANT: this timeline is SCRUBBED, not a one-time reveal.
             * Scrolling down advances it; scrolling up reverses it.
             * Nothing is pinned, so the rest of the page stays in normal flow.
             */
            const trustTl = gsap.timeline({
              defaults: {
                ease: "power3.out",
              },
              scrollTrigger: {
                trigger: trustStrip,
                start: "top 94%",
                end: "bottom 52%",
                scrub: 0.72,
                invalidateOnRefresh: true,
              },
            });

            trustTl.from(trustItems, {
              autoAlpha: 0,
              y: desktop ? 34 : 22,
              scale: 0.95,
              rotateX: desktop ? -8 : 0,
              duration: 0.9,
              stagger: 0.16,
              transformPerspective: 1000,
            });

            if (trustDots.length) {
              trustTl.from(
                trustDots,
                {
                  autoAlpha: 0,
                  scale: 0.18,
                  rotate: -45,
                  duration: 0.55,
                  stagger: 0.12,
                  ease: "back.out(2.4)",
                },
                "-=0.72",
              );
            }

            if (trustCopies.length) {
              trustTl.from(
                trustCopies,
                {
                  autoAlpha: 0,
                  x: 18,
                  duration: 0.58,
                  stagger: 0.1,
                  ease: "power2.out",
                },
                "-=0.62",
              );
            }

            if (trustLines.length) {
              trustTl.fromTo(
                trustLines,
                {
                  scaleX: 0,
                  transformOrigin: "left center",
                },
                {
                  scaleX: 1,
                  duration: 0.7,
                  stagger: 0.1,
                  ease: "power2.out",
                },
                "-=0.54",
              );
            }
          }

          /*
           * The light sweep is also tied directly to scroll progress.
           * It travels across the strip while the user physically scrolls.
           */
          if (trustStrip && trustScan) {
            gsap.fromTo(
              trustScan,
              {
                xPercent: -160,
                opacity: 0.1,
              },
              {
                xPercent: 430,
                opacity: 0.85,
                ease: "none",
                scrollTrigger: {
                  trigger: trustStrip,
                  start: "top 100%",
                  end: "bottom 20%",
                  scrub: 0.55,
                  invalidateOnRefresh: true,
                },
              },
            );
          }

          if (trustStrip && trustAmbient && desktop) {
            gsap.fromTo(
              trustAmbient,
              {
                x: -90,
                scale: 0.85,
              },
              {
                x: 110,
                scale: 1.08,
                ease: "none",
                scrollTrigger: {
                  trigger: trustStrip,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1,
                  invalidateOnRefresh: true,
                },
              },
            );
          }
        }

        /* ==============================================================
           PROBLEM — SCRUBBED BEFORE → AFTER TRANSFORMATION STORY
           ============================================================== */

        {
          const problemSection = one(".js-problem");

          if (problemSection) {
            const headingWrapper = problemSection.querySelector<HTMLElement>(
              ".js-section-heading",
            );
            const headingTitle =
              headingWrapper?.querySelector<HTMLElement>("h1,h2,h3");
            const headingBody = headingWrapper?.querySelector<HTMLElement>("p");
            const sectionLine =
              problemSection.querySelector<HTMLElement>(".js-section-line");

            const beforeCard = one(".js-problem-before");
            const afterCard = one(".js-problem-after");
            const beforeItems = all(".js-problem-before-item");
            const afterItems = all(".js-problem-after-item");
            const beforeSweep = one(".js-problem-before-sweep");
            const afterSweep = one(".js-problem-after-sweep");
            const bridgeLine = one(".js-problem-bridge-line");
            const bridgeLineMobile = one(".js-problem-bridge-line-mobile");
            const bridgeCores = all(".js-problem-bridge-core");
            const particles = all(".js-problem-particle");

            /*
             * One continuous scroll-controlled timeline.
             * No `once`, no pin, no artificial section height.
             */
            const problemTl = gsap.timeline({
              defaults: {
                ease: "power3.out",
              },
              scrollTrigger: {
                trigger: problemSection,
                start: "top 88%",
                end: "bottom 28%",
                scrub: 0.82,
                invalidateOnRefresh: true,
              },
            });

            /* 01 — heading and section line */
            if (headingTitle) {
              problemTl.from(headingTitle, {
                autoAlpha: 0,
                y: desktop ? 54 : 34,
                rotateX: desktop ? 8 : 0,
                duration: 0.85,
                transformPerspective: 900,
                ease: "power4.out",
              });
            }

            if (headingBody) {
              problemTl.from(
                headingBody,
                {
                  autoAlpha: 0,
                  y: 24,
                  duration: 0.62,
                  ease: "power2.out",
                },
                "-=0.58",
              );
            }

            if (sectionLine) {
              problemTl.to(
                sectionLine,
                {
                  scaleX: 1,
                  duration: 0.72,
                  ease: "power2.out",
                },
                "-=0.52",
              );
            }

            /* 02 — BEFORE state enters */
            if (beforeCard) {
              problemTl.from(
                beforeCard,
                {
                  autoAlpha: 0,
                  x: desktop ? -82 : 0,
                  y: desktop ? 16 : 38,
                  rotateY: desktop ? 7 : 0,
                  rotateX: desktop ? 3 : 0,
                  scale: 0.94,
                  duration: 0.95,
                  transformPerspective: 1200,
                  ease: "power4.out",
                },
                "-=0.24",
              );
            }

            if (beforeItems.length) {
              problemTl.from(
                beforeItems,
                {
                  autoAlpha: 0,
                  x: -20,
                  y: 10,
                  duration: 0.48,
                  stagger: 0.085,
                  ease: "power2.out",
                },
                "-=0.62",
              );
            }

            /* 03 — transformation bridge grows with scroll */
            if (bridgeLine && desktop) {
              problemTl.fromTo(
                bridgeLine,
                {
                  scaleX: 0,
                  transformOrigin: "left center",
                },
                {
                  scaleX: 1,
                  duration: 0.72,
                  ease: "power2.inOut",
                },
                "-=0.34",
              );
            }

            if (bridgeLineMobile && !desktop) {
              problemTl.fromTo(
                bridgeLineMobile,
                {
                  scaleY: 0,
                  transformOrigin: "top center",
                },
                {
                  scaleY: 1,
                  duration: 0.68,
                  ease: "power2.inOut",
                },
                "-=0.34",
              );
            }

            if (bridgeCores.length) {
              problemTl.from(
                bridgeCores,
                {
                  autoAlpha: 0,
                  scale: 0.1,
                  rotate: -90,
                  duration: 0.52,
                  stagger: 0.08,
                  ease: "back.out(2.4)",
                },
                "-=0.48",
              );
            }

            if (particles.length && desktop) {
              problemTl.fromTo(
                particles,
                {
                  autoAlpha: 0,
                  x: -32,
                  scale: 0.35,
                },
                {
                  autoAlpha: 1,
                  x: 34,
                  scale: 1,
                  duration: 0.55,
                  stagger: 0.1,
                  ease: "sine.inOut",
                },
                "-=0.5",
              );

              problemTl.to(
                particles,
                {
                  autoAlpha: 0,
                  x: 58,
                  scale: 0.5,
                  duration: 0.3,
                  stagger: 0.06,
                  ease: "power2.in",
                },
                "-=0.24",
              );
            }

            /* 04 — AFTER state takes over */
            if (afterCard) {
              problemTl.from(
                afterCard,
                {
                  autoAlpha: 0,
                  x: desktop ? 82 : 0,
                  y: desktop ? 16 : 38,
                  rotateY: desktop ? -7 : 0,
                  rotateX: desktop ? 3 : 0,
                  scale: 0.94,
                  duration: 0.95,
                  transformPerspective: 1200,
                  ease: "power4.out",
                },
                "-=0.52",
              );
            }

            if (afterItems.length) {
              problemTl.from(
                afterItems,
                {
                  autoAlpha: 0,
                  x: 20,
                  y: 10,
                  duration: 0.48,
                  stagger: 0.085,
                  ease: "power2.out",
                },
                "-=0.62",
              );
            }

            /* 05 — light scans finish the transformation */
            if (beforeSweep) {
              problemTl.fromTo(
                beforeSweep,
                {
                  xPercent: -170,
                  autoAlpha: 0,
                },
                {
                  xPercent: 330,
                  autoAlpha: 0.72,
                  duration: 0.8,
                  ease: "power1.inOut",
                },
                "-=0.55",
              );
            }

            if (afterSweep) {
              problemTl.fromTo(
                afterSweep,
                {
                  xPercent: -170,
                  autoAlpha: 0,
                },
                {
                  xPercent: 330,
                  autoAlpha: 0.82,
                  duration: 0.8,
                  ease: "power1.inOut",
                },
                "-=0.68",
              );
            }

            /* tiny end hold, still controlled by wheel position */
            problemTl.to({}, { duration: 0.32 });

            /* Background depth stays tied to the same physical scroll. */
            const leftOrb = one(".js-problem-orb-left");
            const rightOrb = one(".js-problem-orb-right");

            if (leftOrb && desktop) {
              gsap.fromTo(
                leftOrb,
                { x: -26, y: 30, scale: 0.92 },
                {
                  x: 38,
                  y: -46,
                  scale: 1.08,
                  ease: "none",
                  scrollTrigger: {
                    trigger: problemSection,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1,
                    invalidateOnRefresh: true,
                  },
                },
              );
            }

            if (rightOrb && desktop) {
              gsap.fromTo(
                rightOrb,
                { x: 24, y: -28, scale: 0.92 },
                {
                  x: -34,
                  y: 44,
                  scale: 1.1,
                  ease: "none",
                  scrollTrigger: {
                    trigger: problemSection,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1.05,
                    invalidateOnRefresh: true,
                  },
                },
              );
            }
          }
        }

        /* ==============================================================
           GOVERNANCE
           ============================================================== */

        {
          const tl = createTimeline(".js-governance");
          const cards = all(".js-governance-card");
          const mockups = all(".js-mockup-card");

          if (tl) {
            animateHeading(".js-governance", tl);

            if (cards.length) {
              tl.from(
                cards,
                {
                  autoAlpha: 0,
                  y: 48,
                  scale: 0.965,
                  duration: 0.78,
                  stagger: 0.08,
                },
                "-=0.35",
              );
            }

            if (mockups.length) {
              tl.from(
                mockups,
                {
                  autoAlpha: 0,
                  y: desktop ? 55 : 28,
                  rotateX: desktop ? 7 : 0,
                  scale: 0.95,
                  duration: 0.85,
                  stagger: 0.1,
                  transformPerspective: 1100,
                },
                "-=0.4",
              );
            }
          }
        } /* ==============================================================
           COMPARISON — SCROLL-SCRUBBED, SECTION-SCOPED STORY
           ============================================================== */

        {
          const section = one(".js-compare");

          if (section) {
            const heading = section.querySelector<HTMLElement>(
              ".js-section-heading",
            );
            const title = heading?.querySelector<HTMLElement>("h1,h2,h3");
            const body = heading?.querySelector<HTMLElement>("p");
            const line = section.querySelector<HTMLElement>(".js-section-line");
            const shell =
              section.querySelector<HTMLElement>(".js-compare-shell");
            const rows = Array.from(
              section.querySelectorAll<HTMLElement>(".js-compare-row"),
            );
            const trackFill = section.querySelector<HTMLElement>(
              ".js-compare-track-fill",
            );
            const ambientA = section.querySelector<HTMLElement>(
              ".js-compare-ambient-a",
            );
            const ambientB = section.querySelector<HTMLElement>(
              ".js-compare-ambient-b",
            );
            const grid = section.querySelector<HTMLElement>(".js-compare-grid");

            if (title) {
              gsap.set(title, {
                autoAlpha: 0,
                y: desktop ? 48 : 30,
                rotateX: desktop ? 7 : 0,
                transformPerspective: 900,
                transformOrigin: "center bottom",
              });
            }

            if (body) {
              gsap.set(body, {
                autoAlpha: 0,
                y: 20,
              });
            }

            if (line) {
              gsap.set(line, {
                scaleX: 0,
                transformOrigin: "left center",
              });
            }

            if (shell) {
              gsap.set(shell, {
                autoAlpha: 0,
                y: 34,
                scale: 0.985,
              });
            }

            if (trackFill) {
              gsap.set(trackFill, {
                scaleY: 0,
                transformOrigin: "top center",
              });
            }

            rows.forEach((row, index) => {
              const indexEl =
                row.querySelector<HTMLElement>(".js-compare-index");
              const vs = row.querySelector<HTMLElement>(".js-compare-vs");
              const connector = row.querySelector<HTMLElement>(
                ".js-compare-connector",
              );
              const node = row.querySelector<HTMLElement>(".js-compare-node");
              const focus = row.querySelector<HTMLElement>(".js-compare-focus");
              const scan = row.querySelector<HTMLElement>(".js-compare-scan");
              const accent =
                row.querySelector<HTMLElement>(".js-compare-accent");

              gsap.set(row, {
                autoAlpha: 0,
                x: desktop ? (index % 2 === 0 ? -34 : 34) : 0,
                y: desktop ? 22 : 28,
                scale: 0.975,
                rotateX: desktop ? 4 : 0,
                transformPerspective: 1000,
              });

              if (indexEl) {
                gsap.set(indexEl, {
                  autoAlpha: 0,
                  scale: 0.72,
                });
              }

              if (vs) {
                gsap.set(vs, {
                  autoAlpha: 0,
                  x: desktop ? -18 : 0,
                  y: desktop ? 0 : 8,
                });
              }

              if (connector) {
                gsap.set(connector, {
                  scaleX: 0,
                  transformOrigin: "left center",
                });
              }

              if (node) {
                gsap.set(node, {
                  autoAlpha: 0,
                  scale: 0.4,
                });
              }

              if (focus) {
                gsap.set(focus, {
                  autoAlpha: 0,
                  x: desktop ? 22 : 0,
                  y: desktop ? 0 : 10,
                });
              }

              if (scan) {
                gsap.set(scan, {
                  xPercent: -150,
                  autoAlpha: 0,
                });
              }

              if (accent) {
                gsap.set(accent, {
                  scaleY: 0,
                  transformOrigin: "top center",
                });
              }
            });

            const tl = gsap.timeline({
              defaults: {
                ease: "power3.out",
              },
              scrollTrigger: {
                trigger: section,
                start: "top 88%",
                end: "bottom 24%",
                scrub: 0.82,
                invalidateOnRefresh: true,
              },
            });

            if (line) {
              tl.to(line, {
                scaleX: 1,
                duration: 0.48,
                ease: "power2.out",
              });
            }

            if (title) {
              tl.to(
                title,
                {
                  autoAlpha: 1,
                  y: 0,
                  rotateX: 0,
                  duration: 0.72,
                  ease: "power4.out",
                },
                "-=0.26",
              );
            }

            if (body) {
              tl.to(
                body,
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.5,
                },
                "-=0.42",
              );
            }

            if (shell) {
              tl.to(
                shell,
                {
                  autoAlpha: 1,
                  y: 0,
                  scale: 1,
                  duration: 0.6,
                  ease: "power4.out",
                },
                "-=0.28",
              );
            }

            if (trackFill) {
              tl.to(
                trackFill,
                {
                  scaleY: 1,
                  duration: Math.max(1.1, rows.length * 0.42),
                  ease: "none",
                },
                "-=0.42",
              );
            }

            rows.forEach((row, index) => {
              const indexEl =
                row.querySelector<HTMLElement>(".js-compare-index");
              const vs = row.querySelector<HTMLElement>(".js-compare-vs");
              const connector = row.querySelector<HTMLElement>(
                ".js-compare-connector",
              );
              const node = row.querySelector<HTMLElement>(".js-compare-node");
              const focus = row.querySelector<HTMLElement>(".js-compare-focus");
              const scan = row.querySelector<HTMLElement>(".js-compare-scan");
              const accent =
                row.querySelector<HTMLElement>(".js-compare-accent");

              tl.to(
                row,
                {
                  autoAlpha: 1,
                  x: 0,
                  y: 0,
                  scale: 1,
                  rotateX: 0,
                  duration: 0.58,
                  ease: "power4.out",
                },
                index === 0 ? "-=0.8" : "-=0.34",
              );

              if (accent) {
                tl.to(
                  accent,
                  {
                    scaleY: 1,
                    duration: 0.32,
                    ease: "power2.out",
                  },
                  "-=0.48",
                );
              }

              if (indexEl) {
                tl.to(
                  indexEl,
                  {
                    autoAlpha: 1,
                    scale: 1,
                    duration: 0.28,
                    ease: "back.out(2)",
                  },
                  "-=0.42",
                );
              }

              if (vs) {
                tl.to(
                  vs,
                  {
                    autoAlpha: 1,
                    x: 0,
                    y: 0,
                    duration: 0.38,
                  },
                  "-=0.34",
                );
              }

              if (connector) {
                tl.to(
                  connector,
                  {
                    scaleX: 1,
                    duration: 0.36,
                    ease: "power2.out",
                  },
                  "-=0.28",
                );
              }

              if (node) {
                tl.to(
                  node,
                  {
                    autoAlpha: 1,
                    scale: 1,
                    duration: 0.28,
                    ease: "back.out(2.3)",
                  },
                  "-=0.3",
                );
              }

              if (focus) {
                tl.to(
                  focus,
                  {
                    autoAlpha: 1,
                    x: 0,
                    y: 0,
                    duration: 0.42,
                  },
                  "-=0.26",
                );
              }

              if (scan) {
                tl.fromTo(
                  scan,
                  {
                    xPercent: -150,
                    autoAlpha: 0,
                  },
                  {
                    xPercent: 165,
                    autoAlpha: 0.62,
                    duration: 0.62,
                    ease: "power1.inOut",
                  },
                  "-=0.32",
                );
              }
            });

            if (ambientA) {
              gsap.fromTo(
                ambientA,
                { x: -45, y: 30, scale: 0.9 },
                {
                  x: 58,
                  y: -42,
                  scale: 1.08,
                  ease: "none",
                  scrollTrigger: {
                    trigger: section,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1.1,
                    invalidateOnRefresh: true,
                  },
                },
              );
            }

            if (ambientB) {
              gsap.fromTo(
                ambientB,
                { x: 48, y: -34, scale: 0.92 },
                {
                  x: -58,
                  y: 46,
                  scale: 1.1,
                  ease: "none",
                  scrollTrigger: {
                    trigger: section,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1.2,
                    invalidateOnRefresh: true,
                  },
                },
              );
            }

            if (grid) {
              gsap.fromTo(
                grid,
                { x: -24, y: -24 },
                {
                  x: 48,
                  y: 48,
                  force3D: true,
                  ease: "none",
                  scrollTrigger: {
                    trigger: section,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1,
                    invalidateOnRefresh: true,
                  },
                },
              );
            }
          }
        }

        /* ==============================================================
           CARD HOVER / 3D TILT — DESKTOP ONLY
           ============================================================== */

        const cleanupHover: Array<() => void> = [];

        if (desktop && window.matchMedia("(pointer: fine)").matches) {
          const hoverCards = all(".js-hover-card");

          hoverCards.forEach((card) => {
            const rotateXTo = gsap.quickTo(card, "rotateX", {
              duration: 0.35,
              ease: "power2.out",
            });

            const rotateYTo = gsap.quickTo(card, "rotateY", {
              duration: 0.35,
              ease: "power2.out",
            });

            const yTo = gsap.quickTo(card, "y", {
              duration: 0.35,
              ease: "power2.out",
            });

            gsap.set(card, {
              transformPerspective: 900,
            });

            let bounds = card.getBoundingClientRect();
            let frame: number | null = null;
            let pointerX = 0;
            let pointerY = 0;

            const updateBounds = () => {
              bounds = card.getBoundingClientRect();
            };

            const applyPointer = () => {
              frame = null;
              rotateXTo(-pointerY * 4);
              rotateYTo(pointerX * 5);
              yTo(-5);
            };

            const handleMove = (event: PointerEvent) => {
              pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
              pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;

              if (frame === null) {
                frame = window.requestAnimationFrame(applyPointer);
              }
            };

            const handleLeave = () => {
              if (frame !== null) {
                window.cancelAnimationFrame(frame);
                frame = null;
              }

              rotateXTo(0);
              rotateYTo(0);
              yTo(0);
            };

            card.addEventListener("pointerenter", updateBounds, {
              passive: true,
            });
            card.addEventListener("pointermove", handleMove, { passive: true });
            card.addEventListener("pointerleave", handleLeave);

            cleanupHover.push(() => {
              if (frame !== null) {
                window.cancelAnimationFrame(frame);
              }

              card.removeEventListener("pointerenter", updateBounds);
              card.removeEventListener("pointermove", handleMove);
              card.removeEventListener("pointerleave", handleLeave);
            });
          });
        }

        scheduleScrollTriggerRefresh();

        return () => {
          cleanupHover.forEach((cleanup) => cleanup());
        };
      },
    );

    return () => {
      mm.revert();
    };
  }, [reducedMotion, rootRef]);
}

/* ==========================================================================
   HOME PAGE
   ========================================================================== */

export function HomePage() {
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation("common");

  const [demo, setDemo] = useState(false);

  const reduceMotion = Boolean(useReducedMotion());

  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const heroActive = useNearViewport(heroRef, "120px");

  useHomeScrollAnimations(pageRef, reduceMotion);

  const trust = t("trust", {
    returnObjects: true,
  }) as string[];

  const before = t("problem.before", {
    returnObjects: true,
  }) as string[];

  const after = t("problem.after", {
    returnObjects: true,
  }) as string[];

  const stages = t("transform.stages", {
    returnObjects: true,
  }) as {
    title: string;
    text: string;
  }[];

  const steps = t("how.steps", {
    returnObjects: true,
  }) as string[];

  const cards = t("governance.cards", {
    returnObjects: true,
  }) as {
    id: string;
    title: string;
    text: string;
  }[];

  const deployments = t("deployment.cards", {
    returnObjects: true,
  }) as {
    title: string;
    points: string[];
  }[];

  const useCases = t("useCases.items", {
    returnObjects: true,
  }) as {
    title: string;
    problem: string;
    workflow: string;
    result: string;
    control: string;
  }[];

  const compare = t("compare.rows", {
    returnObjects: true,
  }) as {
    vs: string;
    focus: string;
  }[];

  const heroHeadline = t("hero.headline");

  return (
    <>
      <Seo page="home" path="/" />

      <div ref={pageRef} className="relative">
        {/* ============================================================= */}
        {/* GLOBAL SCROLL PROGRESS                                        */}
        {/* ============================================================= */}

        <div
          className="
            pointer-events-none
            fixed
            left-0
            right-0
            top-0
            z-[100]
            h-[2px]
          "
          aria-hidden="true"
        >
          <div
            className="
              js-page-progress
              h-full
              origin-left
              scale-x-0
              bg-gradient-to-r
              from-blue-500
              via-teal-400
              to-cyan-300
              shadow-[0_0_12px_rgba(45,212,191,0.55)]
            "
          />
        </div>

        {/* ============================================================= */}
        {/* HERO                                                          */}
        {/* ============================================================= */}

        <section
          ref={heroRef}
          className="
            js-hero
            relative
            isolate
            flex
            min-h-[780px]
            items-center
            overflow-hidden
            bg-[#020817]
            px-6
            pb-24
            pt-28
            text-white
            sm:min-h-[820px]
            sm:pt-32
            lg:min-h-[880px]
            lg:py-28
          "
        >
          <AnimatedHeroEnvironment active={heroActive} />

          <div
            className="
              relative
              z-20
              mx-auto
              grid
              w-full
              max-w-[1280px]
              items-center
              gap-12
              lg:grid-cols-[0.76fr_1.24fr]
              lg:gap-8
              xl:grid-cols-[0.72fr_1.28fr]
              xl:gap-10
            "
          >
            {/* HERO COPY */}

            <div className="js-hero-copy">
              <div className="relative">
                <motion.div
                  animate={
                    heroActive && !reduceMotion
                      ? {
                          opacity: [0.16, 0.42, 0.16],
                          scale: [0.92, 1.08, 0.92],
                        }
                      : undefined
                  }
                  transition={{
                    duration: 4.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="
                    pointer-events-none
                    absolute
                    -left-28
                    -top-28
                    -z-10
                    h-80
                    w-80
                    rounded-full
                    bg-blue-500/[0.13]
                    blur-[100px]
                  "
                />

                {/* Eyebrow */}

                <motion.div
                  initial={
                    reduceMotion
                      ? false
                      : {
                          opacity: 0,
                          x: -24,
                        }
                  }
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    duration: 0.7,
                    delay: 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-center gap-3"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <motion.span
                      animate={
                        heroActive && !reduceMotion
                          ? {
                              scale: [1, 2.2, 1],
                              opacity: [0.6, 0, 0.6],
                            }
                          : undefined
                      }
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                      className="absolute inset-0 rounded-full bg-teal-300"
                    />

                    <span
                      className="
                        relative
                        h-2.5
                        w-2.5
                        rounded-full
                        bg-teal-400
                        shadow-[0_0_14px_rgba(45,212,191,0.9)]
                      "
                    />
                  </span>

                  <p
                    className="
                      text-xs
                      font-semibold
                      tracking-[0.22em]
                      text-teal-400
                      uppercase
                    "
                  >
                    {t("hero.eyebrow")}
                  </p>
                </motion.div>

                {/* Cinematic headline */}

                <AnimatedHeadline reducedMotion={reduceMotion}>
                  {heroHeadline}
                </AnimatedHeadline>

                <motion.div
                  initial={{
                    width: 0,
                    opacity: 0,
                  }}
                  animate={{
                    width: 88,
                    opacity: 1,
                  }}
                  transition={{
                    duration: 1,
                    delay: 0.72,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="
                    mt-5
                    h-px
                    bg-gradient-to-r
                    from-teal-300
                    via-blue-400
                    to-transparent
                  "
                />

                {/* Body */}

                <motion.p
                  initial={
                    reduceMotion
                      ? false
                      : {
                          opacity: 0,
                          y: 24,
                        }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.62,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="
                    mt-5
                    max-w-[31rem]
                    text-[15px]
                    leading-relaxed
                    text-white/68
                    sm:text-base
                  "
                >
                  {t("hero.body")}
                </motion.p>

                {/* CTA */}

                <motion.div
                  initial={
                    reduceMotion
                      ? false
                      : {
                          opacity: 0,
                          y: 24,
                        }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.78,
                  }}
                  className="mt-7 flex flex-wrap gap-2.5"
                >
                  <motion.div
                    whileHover={
                      reduceMotion
                        ? undefined
                        : {
                            y: -4,
                            scale: 1.025,
                          }
                    }
                    whileTap={
                      reduceMotion
                        ? undefined
                        : {
                            scale: 0.97,
                          }
                    }
                  >
                    <LocaleLink
                      to="/book"
                      className="
                        group
                        relative
                        inline-flex
                        min-h-12
                        items-center
                        overflow-hidden
                        rounded-xl
                        bg-blue-600
                        px-5
                        text-sm
                        font-semibold
                        shadow-[0_14px_45px_rgba(37,99,235,0.34)]
                        transition-colors
                        hover:bg-blue-500
                      "
                    >
                      <span
                        className="
                          absolute
                          -left-20
                          top-[-50%]
                          h-[200%]
                          w-14
                          rotate-[18deg]
                          bg-white/25
                          blur-md
                          transition-transform
                          duration-700
                          group-hover:translate-x-[250px]
                        "
                      />

                      <span className="relative z-10">{tc("cta.book")}</span>

                      <span
                        className="
                          relative
                          z-10
                          ml-2
                          transition-transform
                          group-hover:translate-x-1
                        "
                      >
                        →
                      </span>
                    </LocaleLink>
                  </motion.div>

                  <motion.div
                    whileHover={
                      reduceMotion
                        ? undefined
                        : {
                            y: -4,
                          }
                    }
                    whileTap={
                      reduceMotion
                        ? undefined
                        : {
                            scale: 0.98,
                          }
                    }
                  >
                    <LocaleLink
                      to="/how-it-works"
                      className="
                        inline-flex
                        min-h-12
                        items-center
                        rounded-xl
                        border
                        border-white/[0.17]
                        bg-white/[0.055]
                        px-5
                        text-sm
                        font-semibold
                        shadow-xl
                        shadow-black/10
                        backdrop-blur-xl
                        transition
                        hover:border-white/30
                        hover:bg-white/[0.09]
                      "
                    >
                      {tc("cta.how")}
                    </LocaleLink>
                  </motion.div>

                  <motion.button
                    type="button"
                    onClick={() => setDemo(true)}
                    whileHover={
                      reduceMotion
                        ? undefined
                        : {
                            x: 4,
                          }
                    }
                    whileTap={
                      reduceMotion
                        ? undefined
                        : {
                            scale: 0.97,
                          }
                    }
                    className="
                      inline-flex
                      min-h-12
                      items-center
                      gap-2.5
                      px-2
                      text-sm
                      font-semibold
                      text-white/75
                      transition-colors
                      hover:text-white
                    "
                  >
                    <motion.span
                      animate={
                        heroActive && !reduceMotion
                          ? {
                              boxShadow: [
                                "0 0 0 rgba(45,212,191,0)",
                                "0 0 20px rgba(45,212,191,.22)",
                                "0 0 0 rgba(45,212,191,0)",
                              ],
                            }
                          : undefined
                      }
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                      }}
                      className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-white/[0.14]
                        bg-white/[0.06]
                        backdrop-blur-lg
                      "
                    >
                      <span
                        className="
                          ml-[2px]
                          h-0
                          w-0
                          border-b-[4px]
                          border-l-[6px]
                          border-t-[4px]
                          border-b-transparent
                          border-l-white
                          border-t-transparent
                        "
                      />
                    </motion.span>

                    {tc("cta.demo")}
                  </motion.button>
                </motion.div>

                {/* Formats */}

                <motion.div
                  initial={{
                    opacity: 0,
                    y: 14,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.95,
                    duration: 0.7,
                  }}
                  className="mt-6 flex flex-wrap gap-2"
                >
                  {(["PDF", "DOCX", "TXT", "XLSX"] as DocumentType[]).map(
                    (type, index) => {
                      const theme = getDocumentTheme(type);

                      return (
                        <motion.div
                          key={type}
                          animate={
                            heroActive && !reduceMotion
                              ? {
                                  y: [0, -3, 0],
                                }
                              : undefined
                          }
                          transition={{
                            duration: 2.7 + index * 0.2,
                            repeat: Infinity,
                            delay: index * 0.2,
                            ease: "easeInOut",
                          }}
                          className="
                          flex
                          items-center
                          gap-2
                          rounded-full
                          border
                          border-white/[0.09]
                          bg-white/[0.035]
                          px-3
                          py-1.5
                          text-[9px]
                          font-semibold
                          tracking-[0.12em]
                          text-white/45
                          backdrop-blur-md
                        "
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${theme.accent}`}
                          />

                          {type}
                        </motion.div>
                      );
                    },
                  )}
                </motion.div>
              </div>
            </div>

            {/* PIPELINE */}

            <div className="js-hero-stage">
              <HeroRightExperience
                active={heroActive}
                reducedMotion={reduceMotion}
              />
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* TRUST — PREMIUM VERIFICATION STRIP                            */}
        {/* ============================================================= */}

        <section
          className="
            js-trust-strip
            relative
            z-10
            overflow-hidden
            border-y
            border-slate-200/70
            bg-white
            px-6
            py-7
          "
        >
          <div
            className="
              js-trust-ambient
              pointer-events-none
              absolute
              -left-24
              top-1/2
              h-40
              w-80
              -translate-y-1/2
              rounded-full
              bg-teal-400/[0.055]
              blur-[70px]
            "
            aria-hidden="true"
          />

          <div
            className="
              js-trust-scan
              pointer-events-none
              absolute
              -top-[35%]
              left-0
              h-[170%]
              w-[24%]
              -skew-x-12
              bg-gradient-to-r
              from-transparent
              via-cyan-300/[0.12]
              to-transparent
              blur-xl
            "
            aria-hidden="true"
          />

          <ul className="relative mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trust.map((item, index) => (
              <li
                key={item}
                className="
                  js-trust-item
                  group
                  relative
                  overflow-hidden
                  rounded-xl
                  border
                  border-slate-200/80
                  bg-white/90
                  px-4
                  py-3.5
                  shadow-[0_8px_30px_rgba(15,23,42,0.035)]
                  transition-[border-color,box-shadow,background-color]
                  duration-300
                  hover:border-teal-200
                  hover:bg-white
                  hover:shadow-[0_14px_40px_rgba(13,148,136,0.08)]
                "
              >
                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-10
                    -top-10
                    h-24
                    w-24
                    rounded-full
                    bg-teal-400/[0.05]
                    blur-2xl
                    transition-transform
                    duration-500
                    group-hover:scale-125
                  "
                  aria-hidden="true"
                />

                <div className="relative flex items-center gap-3">
                  <span
                    className="
                      js-trust-dot
                      relative
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-teal-200/80
                      bg-teal-50
                    "
                    aria-hidden="true"
                  >
                    <span className="absolute inset-[5px] rounded-full border border-teal-300/60" />
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.45)]" />
                  </span>

                  <span className="js-trust-copy min-w-0 text-sm font-medium leading-relaxed text-slate-700">
                    {item}
                  </span>

                  <span className="ml-auto font-mono text-[9px] tracking-[0.12em] text-slate-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <span
                  className="
                    js-trust-item-line
                    absolute
                    bottom-0
                    left-0
                    h-px
                    w-full
                    bg-gradient-to-r
                    from-teal-400/65
                    via-cyan-400/30
                    to-transparent
                  "
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        </section>

        {/* ============================================================= */}
        {/* PROBLEM — BEFORE → AFTER TRANSFORMATION                       */}
        {/* ============================================================= */}

        <section
          className="
            js-problem
            relative
            isolate
            overflow-hidden
            bg-slate-50/70
            px-6
            py-24
          "
        >
          <SectionLine />

          <div
            className="
              js-problem-orb-left
              pointer-events-none
              absolute
              -left-28
              top-[24%]
              h-72
              w-72
              rounded-full
              bg-rose-300/[0.07]
              blur-[95px]
            "
            aria-hidden="true"
          />

          <div
            className="
              js-problem-orb-right
              pointer-events-none
              absolute
              -right-24
              bottom-[14%]
              h-80
              w-80
              rounded-full
              bg-teal-300/[0.09]
              blur-[100px]
            "
            aria-hidden="true"
          />

          <div className="js-section-heading relative z-10">
            <SectionHeading
              title={t("problem.headline")}
              body={t("problem.body")}
            />
          </div>

          <div className="relative z-10 mx-auto mt-12 grid max-w-6xl items-stretch gap-5 md:grid-cols-[1fr_76px_1fr] md:gap-0">
            {/* BEFORE */}
            <article
              className="
                js-problem-card
                js-problem-before
                group
                relative
                overflow-hidden
                rounded-[26px]
                border
                border-rose-200/70
                bg-white
                p-6
                shadow-[0_18px_65px_rgba(15,23,42,0.055)]
                transition-[border-color,box-shadow]
                duration-300
                hover:border-rose-300/80
                hover:shadow-[0_24px_80px_rgba(244,63,94,0.08)]
                sm:p-7
              "
            >
              <div
                className="
                  pointer-events-none
                  absolute
                  -left-14
                  -top-16
                  h-44
                  w-44
                  rounded-full
                  bg-rose-400/[0.07]
                  blur-[55px]
                "
                aria-hidden="true"
              />

              <div
                className="
                  js-problem-before-sweep
                  pointer-events-none
                  absolute
                  -left-24
                  -top-[25%]
                  h-[150%]
                  w-16
                  rotate-[14deg]
                  bg-gradient-to-r
                  from-transparent
                  via-rose-200/35
                  to-transparent
                  blur-xl
                "
                aria-hidden="true"
              />

              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xs font-semibold tracking-[0.12em] text-rose-600 uppercase">
                    {t("problem.beforeTitle")}
                  </h3>

                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-mono text-[8px] tracking-[0.12em] text-rose-500">
                    BEFORE
                  </span>
                </div>

                <div className="mt-5 h-px bg-gradient-to-r from-rose-300/70 via-rose-200/30 to-transparent" />

                <ul className="mt-5 space-y-3">
                  {before.map((item, index) => (
                    <li
                      key={item}
                      className="
                        js-problem-before-item
                        grid
                        grid-cols-[30px_1fr]
                        items-start
                        gap-3
                        rounded-xl
                        border
                        border-rose-100
                        bg-rose-50/45
                        px-3.5
                        py-3
                      "
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white font-mono text-[8px] text-rose-400 shadow-sm">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="pt-1 text-sm leading-relaxed text-slate-500">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            {/* TRANSFORMATION BRIDGE — desktop */}
            <div
              className="relative hidden items-center justify-center md:flex"
              aria-hidden="true"
            >
              <span
                className="
                  js-problem-bridge-line
                  absolute
                  left-0
                  right-0
                  top-1/2
                  h-px
                  -translate-y-1/2
                  bg-gradient-to-r
                  from-rose-300/55
                  via-slate-300/80
                  to-teal-400/70
                "
              />

              {[0, 1, 2].map((particle) => (
                <span
                  key={particle}
                  className="
                    js-problem-particle
                    absolute
                    left-1/2
                    top-1/2
                    h-1.5
                    w-1.5
                    -translate-x-1/2
                    -translate-y-1/2
                    rounded-full
                    bg-cyan-400
                    shadow-[0_0_10px_rgba(34,211,238,0.65)]
                  "
                />
              ))}

              <span
                className="
                  js-problem-bridge-core
                  relative
                  z-10
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-teal-200
                  bg-white
                  shadow-[0_10px_35px_rgba(13,148,136,0.15)]
                "
              >
                <span className="h-2.5 w-2.5 rounded-full bg-teal-500 shadow-[0_0_13px_rgba(20,184,166,0.55)]" />
              </span>
            </div>

            {/* TRANSFORMATION BRIDGE — mobile */}
            <div
              className="relative flex h-16 items-center justify-center md:hidden"
              aria-hidden="true"
            >
              <span
                className="
                  js-problem-bridge-line-mobile
                  absolute
                  bottom-0
                  top-0
                  left-1/2
                  w-px
                  -translate-x-1/2
                  bg-gradient-to-b
                  from-rose-300/45
                  via-slate-300/70
                  to-teal-400/70
                "
              />

              <span
                className="
                  js-problem-bridge-core
                  relative
                  z-10
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-teal-200
                  bg-white
                  shadow-[0_10px_30px_rgba(13,148,136,0.12)]
                "
              >
                <span className="text-sm text-teal-600">↓</span>
              </span>
            </div>

            {/* AFTER */}
            <article
              className="
                js-problem-card
                js-problem-after
                group
                relative
                overflow-hidden
                rounded-[26px]
                border
                border-teal-200/80
                bg-white
                p-6
                shadow-[0_18px_65px_rgba(15,23,42,0.055)]
                transition-[border-color,box-shadow]
                duration-300
                hover:border-teal-300
                hover:shadow-[0_24px_80px_rgba(13,148,136,0.10)]
                sm:p-7
              "
            >
              <div
                className="
                  pointer-events-none
                  absolute
                  -right-14
                  -top-16
                  h-44
                  w-44
                  rounded-full
                  bg-teal-400/[0.09]
                  blur-[55px]
                "
                aria-hidden="true"
              />

              <div
                className="
                  js-problem-after-sweep
                  pointer-events-none
                  absolute
                  -left-24
                  -top-[25%]
                  h-[150%]
                  w-16
                  rotate-[14deg]
                  bg-gradient-to-r
                  from-transparent
                  via-cyan-200/35
                  to-transparent
                  blur-xl
                "
                aria-hidden="true"
              />

              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xs font-semibold tracking-[0.12em] text-teal-700 uppercase">
                    {t("problem.afterTitle")}
                  </h3>

                  <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 font-mono text-[8px] tracking-[0.12em] text-teal-600">
                    AFTER
                  </span>
                </div>

                <div className="mt-5 h-px bg-gradient-to-r from-teal-400/75 via-cyan-300/35 to-transparent" />

                <ul className="mt-5 space-y-3">
                  {after.map((item, index) => (
                    <li
                      key={item}
                      className="
                        js-problem-after-item
                        grid
                        grid-cols-[30px_1fr]
                        items-start
                        gap-3
                        rounded-xl
                        border
                        border-teal-100
                        bg-teal-50/45
                        px-3.5
                        py-3
                      "
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white font-mono text-[8px] text-teal-500 shadow-sm">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="pt-1 text-sm leading-relaxed text-slate-600">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </section>

        {/* ============================================================= */}
        {/* TRANSFORM — PINNED NETWORK STORY                               */}
        {/* ============================================================= */}

        <TransformStorySection
          headline={t("transform.headline")}
          stages={stages}
        />

        {/* ============================================================= */}
        {/* HOW IT WORKS — SCROLL + 3D PROCESS FIELD                     */}
        {/* ============================================================= */}

        <HowItWorksMotionSection
          headline={t("how.headline")}
          body={t("how.body")}
          steps={steps}
        />

        {/* ============================================================= */}
        {/* GOVERNANCE — ISOLATED REFERENCE-STYLE FLIGHT                 */}
        {/* ============================================================= */}

        <GovernanceFlightSection
          headline={t("governance.headline")}
          body={t("governance.body")}
          cards={cards}
        />

        {/* ============================================================= */}
        {/* DEPLOYMENT + ARCHITECTURE — CONTINUOUS DARK MOTION JOURNEY    */}
        {/* ============================================================= */}

        <DeploymentArchitectureMotionSection
          deploymentHeadline={t("deployment.headline")}
          deploymentBody={t("deployment.body")}
          deployments={deployments}
          architectureHeadline={t("architecture.headline")}
          architectureBody={t("architecture.body")}
        />

        {/* ============================================================= */}
        {/* USE CASES — ISOLATED CINEMATIC STORY                         */}
        {/* ============================================================= */}

        <UseCasesStorySection
          headline={t("useCases.headline")}
          items={useCases}
        />

        {/* ============================================================= */}
        {/* COMPARE                                                       */}
        {/* ============================================================= */}

        <section className="js-compare relative isolate overflow-hidden bg-white px-6 py-24 sm:py-28">
          <SectionLine />

          {/* Compare-only animated atmosphere. Nothing escapes this section. */}
          <div
            className="js-compare-grid pointer-events-none absolute -inset-20 opacity-[0.032] will-change-transform [background-image:linear-gradient(rgba(15,23,42,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.18)_1px,transparent_1px)] [background-size:72px_72px]"
            aria-hidden="true"
          />

          <div
            className="js-compare-ambient-a pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-teal-400/[0.10] blur-[110px]"
            aria-hidden="true"
          />

          <div
            className="js-compare-ambient-b pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-blue-500/[0.09] blur-[125px]"
            aria-hidden="true"
          />

          <div className="js-section-heading relative z-10">
            <SectionHeading
              title={t("compare.headline")}
              body={t("compare.body")}
            />
          </div>

          <div
            className="
              js-compare-shell
              relative
              z-10
              mx-auto
              mt-12
              max-w-5xl
              overflow-hidden
              rounded-[28px]
              border
              border-slate-200/80
              bg-white/92
              shadow-[0_24px_80px_rgba(15,23,42,.07)]
              backdrop-blur-sm
            "
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-teal-400" />
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="h-2 w-2 rounded-full bg-blue-400" />
              </div>

              <div className="flex items-center gap-2 text-[9px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_12px_rgba(20,184,166,.45)]" />
                Comparison matrix
              </div>
            </div>

            <div className="relative px-3 py-3 sm:px-4 sm:py-4">
              <div
                className="pointer-events-none absolute bottom-8 left-[35px] top-8 hidden w-px bg-slate-200 sm:block md:left-[43px]"
                aria-hidden="true"
              >
                <span className="js-compare-track-fill absolute inset-x-0 top-0 h-full origin-top scale-y-0 bg-gradient-to-b from-teal-400 via-cyan-400 to-blue-500" />
              </div>

              <div className="space-y-3">
                {compare.map((row, index) => {
                  const accents = [
                    {
                      dot: "bg-teal-400 shadow-[0_0_18px_rgba(45,212,191,.48)]",
                      line: "from-teal-400 via-cyan-400 to-transparent",
                      glow: "bg-teal-400/[0.08]",
                    },
                    {
                      dot: "bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,.46)]",
                      line: "from-cyan-400 via-blue-400 to-transparent",
                      glow: "bg-cyan-400/[0.08]",
                    },
                    {
                      dot: "bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,.46)]",
                      line: "from-blue-400 via-indigo-400 to-transparent",
                      glow: "bg-blue-400/[0.08]",
                    },
                  ];

                  const accent = accents[index % accents.length];

                  return (
                    <div
                      key={row.vs}
                      className="js-compare-row relative will-change-transform"
                    >
                      <motion.div
                        whileHover={
                          reduceMotion
                            ? undefined
                            : {
                                y: -5,
                                scale: 1.008,
                              }
                        }
                        transition={{
                          duration: 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_10px_35px_rgba(15,23,42,.045)] transition-[border-color,box-shadow] duration-300 hover:border-cyan-200 hover:shadow-[0_20px_55px_rgba(14,116,144,.09)]"
                      >
                        <div
                          className={`pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full ${accent.glow} blur-3xl transition-transform duration-700 group-hover:scale-125`}
                          aria-hidden="true"
                        />

                        <div
                          className="js-compare-scan pointer-events-none absolute bottom-0 top-0 z-10 w-28 bg-gradient-to-r from-transparent via-cyan-200/[0.14] to-transparent blur-lg"
                          aria-hidden="true"
                        />

                        <span
                          className={`js-compare-accent absolute bottom-0 left-0 top-0 w-[3px] origin-top scale-y-0 bg-gradient-to-b ${accent.line}`}
                          aria-hidden="true"
                        />

                        <div className="relative z-20 grid gap-4 px-5 py-5 sm:grid-cols-[44px_1fr] sm:px-6 md:grid-cols-[44px_minmax(0,.8fr)_72px_minmax(0,1.2fr)] md:items-center md:gap-5 md:py-6">
                          <div className="flex items-center gap-3 sm:block">
                            <span
                              className={`js-compare-node relative z-10 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${accent.dot}`}
                              aria-hidden="true"
                            />

                            <span className="js-compare-index ml-3 font-mono text-[10px] tracking-[0.17em] text-slate-400 sm:ml-0 sm:mt-3 sm:block">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p className="js-compare-vs text-sm font-semibold leading-relaxed text-slate-900 sm:text-[15px]">
                              {row.vs}
                            </p>
                          </div>

                          <div
                            className="hidden items-center gap-2 md:flex"
                            aria-hidden="true"
                          >
                            <span
                              className={`js-compare-connector h-px flex-1 origin-left scale-x-0 bg-gradient-to-r ${accent.line}`}
                            />
                            <span className="text-[11px] text-cyan-500/55">
                              →
                            </span>
                          </div>

                          <div className="js-compare-focus relative overflow-hidden rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3.5">
                            <div className="flex items-start gap-3">
                              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                              <p className="text-sm leading-relaxed text-slate-600">
                                {row.focus}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* FINAL CTA                                                     */}
        {/* ============================================================= */}

        <FinalCtaStory
          headline={t("final.headline")}
          body={t("final.body")}
          actionLabel={tc("cta.book")}
        />
      </div>

      <VideoModal open={demo} onClose={() => setDemo(false)} />
    </>
  );
}
