import {
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
import { SectionHeading } from "@/components/SectionHeading";
import { AirGapTopology } from "@/diagrams/AirGapTopology";
import { ProductFrame } from "@/mockups/ProductFrame";


type DeploymentProfile = {
  title: string;
  text: string;
};

type DeploymentSection = {
  title: string;
  text: string;
};

type SharedRow = {
  party: string;
  owns: string;
};

const ACCENT = "#2dd4bf";
const CYAN = "#22d3ee";
const BLUE = "#60a5fa";

function useNearViewport<T extends HTMLElement>(rootMargin = "240px 0px 240px 0px") {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const updateVisibility = (isIntersecting: boolean) => {
      setActive(isIntersecting && document.visibilityState === "visible");
    };

    const observer = new IntersectionObserver(
      ([entry]) => updateVisibility(Boolean(entry?.isIntersecting)),
      { rootMargin },
    );

    observer.observe(node);

    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        setActive(false);
        return;
      }

      const rect = node.getBoundingClientRect();
      const near = rect.bottom > -240 && rect.top < window.innerHeight + 240;
      setActive(near);
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [rootMargin]);

  return { ref, active };
}

function useEnhancedVisuals() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean };
      deviceMemory?: number;
    }).connection;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

    const evaluate = () => {
      const enoughCpu = (navigator.hardwareConcurrency ?? 8) >= 4;
      const enoughMemory = deviceMemory == null || deviceMemory >= 4;
      const saveData = Boolean(connection?.saveData);
      setEnabled(media.matches && enoughCpu && enoughMemory && !saveData);
    };

    evaluate();
    media.addEventListener("change", evaluate);

    return () => media.removeEventListener("change", evaluate);
  }, []);

  return enabled;
}

function DemandFramePump({
  active,
  fps = 24,
}: {
  active: boolean;
  fps?: number;
}) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!active) return;

    let raf = 0;
    let last = 0;
    const frameGap = 1000 / fps;

    const tick = (time: number) => {
      if (time - last >= frameGap) {
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

function SecureDeploymentField({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const nodeGroupRef = useRef<THREE.Group>(null);

  const nodes = useMemo(
    () => [
      new THREE.Vector3(-3.2, 1.9, -1.6),
      new THREE.Vector3(-1.6, 0.7, 0.4),
      new THREE.Vector3(0.1, 1.8, -0.5),
      new THREE.Vector3(1.9, 0.55, 0.3),
      new THREE.Vector3(3.25, 1.65, -1.2),
      new THREE.Vector3(-2.6, -1.6, -0.8),
      new THREE.Vector3(-0.7, -1.05, 0.85),
      new THREE.Vector3(1.15, -1.55, -0.35),
      new THREE.Vector3(2.95, -0.75, 0.65),
    ],
    [],
  );

  const lineGeometry = useMemo(() => {
    const pairs = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8], [8, 4],
      [1, 6], [2, 6], [2, 7], [3, 7], [3, 8],
    ];
    const values: number[] = [];

    pairs.forEach(([a, b]) => {
      const start = nodes[a];
      const end = nodes[b];
      if (!start || !end) return;
      values.push(start.x, start.y, start.z, end.x, end.y, end.z);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(values, 3));
    return geometry;
  }, [nodes]);

  useEffect(() => () => lineGeometry.dispose(), [lineGeometry]);

  useFrame((state, delta) => {
    if (!active) return;

    const group = groupRef.current;
    const nodeGroup = nodeGroupRef.current;
    if (!group || !nodeGroup) return;

    const targetX = state.pointer.y * 0.11;
    const targetY = state.pointer.x * 0.15;

    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, targetX, 0.035);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetY, 0.035);
    group.rotation.z += delta * 0.025;
    nodeGroup.rotation.y -= delta * 0.06;
  });

  return (
    <group ref={groupRef} position={[0.4, 0, 0]}>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color={CYAN} transparent opacity={0.28} />
      </lineSegments>

      <group ref={nodeGroupRef}>
        {nodes.map((point, index) => (
          <mesh key={index} position={point}>
            <sphereGeometry args={[index % 3 === 0 ? 0.085 : 0.06, 12, 12]} />
            <meshBasicMaterial
              color={index % 2 === 0 ? ACCENT : BLUE}
              transparent
              opacity={0.82}
            />
          </mesh>
        ))}
      </group>

      <mesh rotation={[Math.PI / 2.2, 0.4, 0.2]}>
        <torusGeometry args={[2.3, 0.022, 8, 96]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.28} />
      </mesh>
      <mesh rotation={[Math.PI / 2.8, 0.15, Math.PI / 3]}>
        <torusGeometry args={[3.15, 0.018, 8, 96]} />
        <meshBasicMaterial color={BLUE} transparent opacity={0.18} />
      </mesh>
      <mesh rotation={[0.6, 0.8, 0.2]}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

function DeploymentHero({
  eyebrow,
  headline,
  body,
  reducedMotion,
}: {
  eyebrow: string;
  headline: string;
  body: string;
  reducedMotion: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const matrixRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const { ref: viewportRef, active } = useNearViewport<HTMLDivElement>();
  const enhancedVisuals = useEnhancedVisuals();

  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const content = contentRef.current;
    const matrix = matrixRef.current;
    const world = worldRef.current;
    const beam = beamRef.current;
    if (!section || !content || !matrix || !world || !beam) return;

    const ctx = gsap.context(() => {
      gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: 0.78,
          invalidateOnRefresh: true,
        },
      })
        .to(content, { y: -118, x: -26, scale: 0.965, autoAlpha: 0.24, ease: "none" }, 0)
        .to(matrix, { y: -70, x: 96, scale: 1.12, rotate: 3.5, ease: "none" }, 0)
        .to(world, { yPercent: 12, xPercent: -4, scale: 1.08, ease: "none" }, 0)
        .to(beam, { xPercent: 280, ease: "none" }, 0);

      gsap.to(".dep-hero-route", {
        strokeDashoffset: -180,
        duration: 5.5,
        ease: "none",
        repeat: -1,
        paused: !active,
      });
    }, section);

    return () => ctx.revert();
  }, [active, reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[#020817] px-6 pt-28 pb-24 text-white sm:pb-28 lg:min-h-[760px] lg:pt-32"
    >
      <div ref={viewportRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          ref={worldRef}
          className="absolute -inset-[12%] opacity-90"
          style={{
            backgroundImage:
              "linear-gradient(rgba(45,212,191,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.045) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
            maskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
          }}
        />

        <div className="absolute left-[-18%] top-[12%] h-[540px] w-[540px] rounded-full bg-teal-400/10 blur-[120px]" />
        <div className="absolute right-[-14%] top-[8%] h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-[135px]" />

        <svg
          className="absolute inset-0 h-full w-full opacity-70"
          viewBox="0 0 1440 760"
          preserveAspectRatio="none"
        >
          <path
            d="M-40 590 C 180 570, 260 300, 485 340 S 760 620, 995 375 S 1270 205, 1480 250"
            fill="none"
            stroke="rgba(45,212,191,.22)"
            strokeWidth="1.2"
          />
          <path
            className="dep-hero-route"
            d="M-40 590 C 180 570, 260 300, 485 340 S 760 620, 995 375 S 1270 205, 1480 250"
            fill="none"
            stroke="rgba(34,211,238,.85)"
            strokeWidth="2.2"
            strokeDasharray="12 28"
          />
          <path
            d="M80 110 C 320 260, 525 90, 715 205 S 1100 440, 1460 150"
            fill="none"
            stroke="rgba(96,165,250,.18)"
            strokeWidth="1"
          />
          <path
            className="dep-hero-route"
            d="M80 110 C 320 260, 525 90, 715 205 S 1100 440, 1460 150"
            fill="none"
            stroke="rgba(96,165,250,.7)"
            strokeWidth="1.5"
            strokeDasharray="8 24"
          />
        </svg>

        <div
          ref={beamRef}
          className="absolute left-[-34%] top-[23%] h-[2px] w-[38%] bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent blur-[1px]"
        />

        {enhancedVisuals && (
          <div className="absolute inset-0 opacity-80">
            <Canvas
              frameloop="demand"
              dpr={1}
              camera={{ position: [0, 0, 7.6], fov: 48 }}
              gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
            >
              <DemandFramePump active={active && !reducedMotion} fps={24} />
              <SecureDeploymentField active={active && !reducedMotion} />
            </Canvas>
          </div>
        )}
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <motion.div
          ref={contentRef}
          initial={reducedMotion ? false : { opacity: 0, y: 34 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, x: -18 }}
            animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            transition={{ duration: 0.62, delay: 0.06 }}
            className="text-xs font-semibold tracking-[0.22em] text-teal-300 uppercase"
          >
            {eyebrow}
          </motion.p>

          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl lg:leading-[1.02]">
            {headline}
          </h1>

          <motion.div
            initial={reducedMotion ? false : { scaleX: 0, opacity: 0 }}
            animate={reducedMotion ? undefined : { scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.24 }}
            className="mt-7 h-px w-40 origin-left bg-gradient-to-r from-teal-300 via-cyan-300 to-transparent"
          />

          <p className="mt-7 max-w-2xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
            {body}
          </p>

          <div className="mt-9 flex flex-wrap gap-3 text-[11px] font-medium tracking-[0.16em] text-white/48 uppercase">
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2">Approved models</span>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2">Signed packages</span>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2">Offline ready</span>
          </div>
        </motion.div>

        <motion.div
          ref={matrixRef}
          initial={reducedMotion ? false : { opacity: 0, x: 52, scale: 0.96 }}
          animate={reducedMotion ? undefined : { opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.95, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[620px]"
        >
          <div className="absolute -inset-16 rounded-full bg-cyan-400/[0.045] blur-3xl" />

          <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#06111f]/72 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-teal-300 uppercase">Deployment control plane</p>
                <p className="mt-1 text-sm text-white/48">Isolated route verification</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-emerald-300 uppercase">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                Ready
              </div>
            </div>

            <div className="relative mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["01", "Approved registry", "gateway/approved-v3"],
                ["02", "Checksum verified", "signed package"],
                ["03", "Offline transfer", "no public endpoint"],
                ["04", "Rollback path", "available"],
              ].map(([index, title, meta], i) => (
                <motion.div
                  key={title}
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          y: [0, i % 2 === 0 ? -5 : 5, 0],
                        }
                  }
                  transition={{ duration: 4.6 + i * 0.55, repeat: Infinity, ease: "easeInOut" }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent" />
                  <p className="text-[10px] font-mono text-cyan-200/60">{index}</p>
                  <p className="mt-6 text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-xs text-white/42">{meta}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function OverviewSection({
  headline,
  items,
  reducedMotion,
}: {
  headline: string;
  items: string[];
  reducedMotion: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const progress = progressRef.current;
    if (!section || !progress) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".dep-overview-card");

      cards.forEach((card, index) => {
        const inner = card.querySelector<HTMLElement>(".dep-overview-inner");
        if (!inner) return;

        gsap.fromTo(
          card,
          {
            autoAlpha: 0,
            x: index % 2 === 0 ? -72 : 72,
            y: 34,
            rotateY: index % 2 === 0 ? -7 : 7,
          },
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            rotateY: 0,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              end: "top 54%",
              scrub: 0.55,
              invalidateOnRefresh: true,
            },
          },
        );

        gsap.fromTo(
          inner,
          { y: 20 },
          {
            y: -18,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.8,
            },
          },
        );
      });

      gsap.fromTo(
        progress,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 70%",
            end: "bottom 35%",
            scrub: 0.72,
          },
        },
      );

      gsap.to(".dep-overview-grid", {
        y: -68,
        x: 44,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#f5f8fb] px-6 py-24 sm:py-28">
      <div
        className="dep-overview-grid pointer-events-none absolute -inset-[10%] opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(2,8,23,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(2,8,23,.035) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          transform: "rotate(-7deg)",
        }}
      />
      <div className="pointer-events-none absolute right-[-12%] top-[15%] h-[420px] w-[420px] rounded-full bg-teal-300/12 blur-[110px]" />

      <div className="relative mx-auto max-w-6xl">
        <SectionHeading title={headline} />

        <div className="relative mx-auto mt-14 max-w-4xl pl-9 sm:pl-14">
          <div className="absolute left-[11px] top-2 h-[calc(100%-1rem)] w-px bg-slate-200 sm:left-[19px]" />
          <div
            ref={progressRef}
            className="absolute left-[11px] top-2 h-[calc(100%-1rem)] w-px origin-top bg-gradient-to-b from-teal-400 via-cyan-400 to-blue-400 sm:left-[19px]"
          />

          <div className="space-y-5 sm:space-y-7">
            {items.map((item, index) => (
              <div key={item} className="dep-overview-card relative perspective-[1200px]">
                <div className="absolute -left-[33px] top-7 z-10 h-3 w-3 rounded-full border-2 border-white bg-teal-400 shadow-[0_0_0_5px_rgba(45,212,191,.10)] sm:-left-[41px]" />
                <div className="dep-overview-inner rounded-2xl border border-slate-200/80 bg-white/88 px-5 py-5 shadow-sm shadow-slate-900/5 backdrop-blur sm:px-6">
                  <div className="flex gap-4">
                    <span className="mt-0.5 font-mono text-[11px] text-teal-600">{String(index + 1).padStart(2, "0")}</span>
                    <p className="text-sm leading-7 text-slate-700 sm:text-[15px]">{item}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfilesSection({
  headline,
  profiles,
  reducedMotion,
}: {
  headline: string;
  profiles: DeploymentProfile[];
  reducedMotion: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".dep-profile-shell");

      cards.forEach((card, index) => {
        gsap.fromTo(
          card,
          {
            autoAlpha: 0,
            y: 86,
            rotateX: 8,
            scale: 0.95,
          },
          {
            autoAlpha: 1,
            y: 0,
            rotateX: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top 92%",
              end: "top 55%",
              scrub: 0.62 + index * 0.05,
            },
          },
        );
      });

      gsap.to(".dep-profile-rail-a", {
        xPercent: 48,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.85 },
      });
      gsap.to(".dep-profile-rail-b", {
        xPercent: -42,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.95 },
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-white px-6 py-24 sm:py-28">
      <div className="dep-profile-rail-a pointer-events-none absolute left-[-22%] top-[20%] h-px w-[64%] bg-gradient-to-r from-transparent via-teal-300/40 to-transparent" />
      <div className="dep-profile-rail-b pointer-events-none absolute right-[-20%] bottom-[24%] h-px w-[62%] bg-gradient-to-r from-transparent via-blue-300/35 to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        <SectionHeading title={headline} />

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {profiles.map((item, index) => (
            <div key={item.title} className="dep-profile-shell perspective-[1200px]">
              <motion.article
                whileHover={reducedMotion ? undefined : { y: -7, rotateX: 1.5 }}
                transition={{ duration: 0.22 }}
                className="group relative h-full overflow-hidden rounded-[28px] border border-slate-200 bg-[#f8fbfd] p-6 shadow-sm shadow-slate-950/5"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-400">0{index + 1}</span>
                  <span className="h-8 w-8 rounded-full border border-slate-200 bg-white shadow-inner" />
                </div>
                <h3 className="mt-12 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
                <div className="mt-4 h-px w-16 bg-gradient-to-r from-teal-400 to-cyan-400" />
                <p className="mt-5 text-sm leading-7 text-slate-600">{item.text}</p>
              </motion.article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TopologySection({
  headline,
  body,
  reducedMotion,
}: {
  headline: string;
  body: string;
  reducedMotion: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const topologyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const route = routeRef.current;
    const topology = topologyRef.current;
    if (!section || !route || !topology) return;

    const length = route.getTotalLength();
    gsap.set(route, { strokeDasharray: length, strokeDashoffset: length });

    const ctx = gsap.context(() => {
      gsap.to(route, {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 82%",
          end: "bottom 34%",
          scrub: 0.75,
        },
      });

      gsap.fromTo(
        topology,
        { y: 54, scale: 0.975, autoAlpha: 0.55 },
        {
          y: -34,
          scale: 1.015,
          autoAlpha: 1,
          ease: "none",
          scrollTrigger: {
            trigger: topology,
            start: "top 92%",
            end: "bottom 18%",
            scrub: 0.75,
          },
        },
      );

      gsap.to(".dep-topology-scan", {
        yPercent: 940,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 76%",
          end: "bottom 30%",
          scrub: 0.65,
        },
      });

      gsap.to(".dep-topology-orbit-a", {
        rotate: 68,
        y: -36,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.85 },
      });
      gsap.to(".dep-topology-orbit-b", {
        rotate: -54,
        y: 42,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.95 },
      });

      gsap.utils.toArray<HTMLElement>(".dep-product-frame").forEach((card, index) => {
        gsap.fromTo(
          card,
          { autoAlpha: 0, y: 64, x: index === 0 ? -38 : 38 },
          {
            autoAlpha: 1,
            y: 0,
            x: 0,
            ease: "none",
            scrollTrigger: { trigger: card, start: "top 92%", end: "top 60%", scrub: 0.5 },
          },
        );
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#03101c] px-6 py-24 text-white sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,.10),transparent_28%),radial-gradient(circle_at_80%_68%,rgba(96,165,250,.10),transparent_34%)]" />
      <div className="dep-topology-orbit-a pointer-events-none absolute -left-36 top-24 h-[420px] w-[420px] rounded-full border border-dashed border-teal-300/15" />
      <div className="dep-topology-orbit-b pointer-events-none absolute -right-40 bottom-12 h-[500px] w-[500px] rounded-full border border-dashed border-blue-300/14" />
      <div className="dep-topology-scan pointer-events-none absolute left-0 top-0 h-20 w-full bg-gradient-to-b from-transparent via-cyan-300/[0.035] to-transparent" />

      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-55" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <path
          ref={routeRef}
          d="M0 700 C 260 650, 310 320, 600 390 S 900 640, 1120 320 S 1320 250, 1440 260"
          fill="none"
          stroke="url(#depTopologyGradient)"
          strokeWidth="2"
        />
        <defs>
          <linearGradient id="depTopologyGradient" x1="0" x2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0" />
            <stop offset="28%" stopColor={ACCENT} stopOpacity=".8" />
            <stop offset="64%" stopColor={CYAN} stopOpacity=".9" />
            <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-teal-300 uppercase">Air-gap topology</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">{headline}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">{body}</p>
        </div>

        <div
          ref={topologyRef}
          className="relative mt-12 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
          <AirGapTopology />
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <div className="dep-product-frame rounded-[28px] border border-white/10 bg-white/[0.04] p-2">
            <ProductFrame title="Model registry · approved only">
              <p>gateway/approved-v3 · checksum verified</p>
              <p className="mt-2 text-muted">No public model endpoint. Offline package ready.</p>
            </ProductFrame>
          </div>
          <div className="dep-product-frame rounded-[28px] border border-white/10 bg-white/[0.04] p-2">
            <ProductFrame title="Air-gap update package">
              <p className="font-mono text-xs">idochive-2026.09.signed.tar</p>
              <p className="mt-2 text-success">Signature valid · rollback available</p>
            </ProductFrame>
          </div>
        </div>
      </div>
    </section>
  );
}

function BoundarySections({
  items,
  reducedMotion,
}: {
  items: DeploymentSection[];
  reducedMotion: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".dep-boundary-card").forEach((card, index) => {
        gsap.fromTo(
          card,
          {
            autoAlpha: 0,
            x: index % 2 === 0 ? -84 : 84,
            y: 38,
            rotateZ: index % 2 === 0 ? -1.6 : 1.6,
          },
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            rotateZ: 0,
            ease: "none",
            scrollTrigger: { trigger: card, start: "top 92%", end: "top 58%", scrub: 0.54 },
          },
        );
      });

      gsap.to(".dep-boundary-backdrop", {
        y: -86,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.95 },
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#eef4f7] px-6 py-24 sm:py-28">
      <div className="dep-boundary-backdrop pointer-events-none absolute inset-x-0 top-[22%] h-[520px] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,.12),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
        {items.map((item, index) => (
          <div key={item.title} className="dep-boundary-card">
            <motion.article
              whileHover={reducedMotion ? undefined : { y: -5 }}
              className="relative h-full overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 backdrop-blur"
            >
              <span className="font-mono text-[11px] text-teal-600">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-8 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{item.text}</p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-teal-400/0 via-teal-400/45 to-cyan-400/0" />
            </motion.article>
          </div>
        ))}
      </div>
    </section>
  );
}

function SharedSection({
  headline,
  body,
  rows,
  reducedMotion,
}: {
  headline: string;
  body: string;
  rows: SharedRow[];
  reducedMotion: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    const rail = railRef.current;
    if (!section || !rail) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        rail,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top 72%", end: "bottom 34%", scrub: 0.7 },
        },
      );

      gsap.utils.toArray<HTMLElement>(".dep-shared-row").forEach((row, index) => {
        gsap.fromTo(
          row,
          { autoAlpha: 0, y: 46, x: index % 2 === 0 ? -28 : 28 },
          {
            autoAlpha: 1,
            y: 0,
            x: 0,
            ease: "none",
            scrollTrigger: { trigger: row, start: "top 90%", end: "top 62%", scrub: 0.48 },
          },
        );
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-white px-6 py-24 sm:py-28">
      <div className="pointer-events-none absolute left-[12%] top-0 h-full w-px bg-gradient-to-b from-transparent via-cyan-200/45 to-transparent" />
      <div className="relative mx-auto max-w-5xl">
        <SectionHeading title={headline} body={body} />

        <div className="relative mt-12 pl-8 sm:pl-12">
          <div className="absolute left-2 top-3 h-[calc(100%-1.5rem)] w-px bg-slate-200 sm:left-3" />
          <div ref={railRef} className="absolute left-2 top-3 h-[calc(100%-1.5rem)] w-px origin-top bg-gradient-to-b from-teal-400 via-cyan-400 to-blue-400 sm:left-3" />

          <div className="space-y-4">
            {rows.map((row) => (
              <motion.div
                key={row.party}
                whileHover={reducedMotion ? undefined : { x: 4 }}
                className="dep-shared-row relative grid gap-3 rounded-2xl border border-slate-200 bg-[#f9fbfc] px-5 py-5 md:grid-cols-[12rem_1fr]"
              >
                <span className="absolute -left-[30px] top-7 h-3 w-3 rounded-full border-2 border-white bg-cyan-400 shadow-[0_0_0_5px_rgba(34,211,238,.08)] sm:-left-[43px]" />
                <p className="text-sm font-semibold text-slate-950">{row.party}</p>
                <p className="text-sm leading-7 text-slate-600">{row.owns}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CertificationSection({
  headline,
  items,
  note,
  reducedMotion,
}: {
  headline: string;
  items: string[];
  note: string;
  reducedMotion: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".dep-cert-chip").forEach((chip, index) => {
        gsap.fromTo(
          chip,
          { autoAlpha: 0, y: 42, scale: 0.9, rotate: index % 2 === 0 ? -3 : 3 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotate: 0,
            ease: "none",
            scrollTrigger: { trigger: chip, start: "top 94%", end: "top 70%", scrub: 0.42 },
          },
        );
      });

      gsap.to(".dep-cert-orbit-a", {
        rotate: 72,
        scale: 1.08,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.8 },
      });
      gsap.to(".dep-cert-orbit-b", {
        rotate: -56,
        scale: 0.94,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.92 },
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#06111f] px-6 py-24 text-white sm:py-28">
      <div className="dep-cert-orbit-a pointer-events-none absolute left-[-120px] top-[-90px] h-[360px] w-[360px] rounded-full border border-dashed border-teal-300/15" />
      <div className="dep-cert-orbit-b pointer-events-none absolute bottom-[-180px] right-[-140px] h-[460px] w-[460px] rounded-full border border-dashed border-blue-300/12" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,212,191,.08),transparent_46%)]" />

      <div className="relative mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-cyan-300 uppercase">Assurance surface</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">{headline}</h2>
        </div>

        <div className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-3">
          {items.map((item) => (
            <motion.div
              key={item}
              whileHover={reducedMotion ? undefined : { y: -4, scale: 1.025 }}
              className="dep-cert-chip rounded-full border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm text-white/78 backdrop-blur"
            >
              {item}
            </motion.div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-7 text-white/46">{note}</p>
      </div>
    </section>
  );
}

function DeploymentCta({
  headline,
  body,
  actionLabel,
  reducedMotion,
}: {
  headline: string;
  body: string;
  actionLabel: string;
  reducedMotion: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const leftGateRef = useRef<HTMLDivElement>(null);
  const rightGateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const scene = sceneRef.current;
    const content = contentRef.current;
    const leftGate = leftGateRef.current;
    const rightGate = rightGateRef.current;
    if (!section || !scene || !content || !leftGate || !rightGate) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 900px)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerHeight * 1.95}`,
          scrub: 0.74,
          pin: scene,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.fromTo(leftGate, { xPercent: 0 }, { xPercent: -72, ease: "none" }, 0)
        .fromTo(rightGate, { xPercent: 0 }, { xPercent: 72, ease: "none" }, 0)
        .fromTo(".dep-cta-beam", { scaleY: 0, autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, ease: "none" }, 0.08)
        .fromTo(content, { y: 80, scale: 0.94, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, ease: "none" }, 0.12)
        .to(".dep-cta-world", { scale: 1.12, rotate: 3.2, y: -48, ease: "none" }, 0)
        .to(".dep-cta-line-a", { xPercent: 54, ease: "none" }, 0)
        .to(".dep-cta-line-b", { xPercent: -46, ease: "none" }, 0)
        .to(content, { y: -40, scale: 1.018, ease: "none" }, 0.62);
    });

    mm.add("(max-width: 899px)", () => {
      gsap.fromTo(
        content,
        { y: 54, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          ease: "power2.out",
          scrollTrigger: { trigger: section, start: "top 82%", once: true },
        },
      );
    });

    return () => mm.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} className="relative bg-[#020817] text-white">
      <div ref={sceneRef} className="relative isolate flex min-h-[78vh] items-center overflow-hidden px-6 py-24 sm:min-h-[86vh]">
        <div className="dep-cta-world pointer-events-none absolute -inset-[14%] bg-[radial-gradient(circle_at_center,rgba(45,212,191,.12),transparent_36%),radial-gradient(circle_at_75%_30%,rgba(96,165,250,.10),transparent_30%)]" />
        <div className="dep-cta-line-a pointer-events-none absolute left-[-28%] top-[30%] h-px w-[64%] bg-gradient-to-r from-transparent via-teal-300/50 to-transparent" />
        <div className="dep-cta-line-b pointer-events-none absolute right-[-24%] bottom-[30%] h-px w-[58%] bg-gradient-to-r from-transparent via-blue-300/45 to-transparent" />

        <div ref={leftGateRef} className="pointer-events-none absolute inset-y-0 left-0 w-[54%] border-r border-white/8 bg-gradient-to-r from-[#020817] via-[#071221] to-[#081524]" />
        <div ref={rightGateRef} className="pointer-events-none absolute inset-y-0 right-0 w-[54%] border-l border-white/8 bg-gradient-to-l from-[#020817] via-[#071221] to-[#081524]" />
        <div className="dep-cta-beam pointer-events-none absolute left-1/2 top-[12%] h-[76%] w-px origin-center bg-gradient-to-b from-transparent via-cyan-300/80 to-transparent shadow-[0_0_24px_rgba(34,211,238,.55)]" />

        <div ref={contentRef} className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-teal-300 uppercase">Secure deployment path</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">{headline}</h2>
          <div className="mx-auto mt-7 h-px w-36 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/62 sm:text-lg">{body}</p>

          <motion.a
            href="/book"
            whileHover={reducedMotion ? undefined : { y: -4, scale: 1.02 }}
            whileTap={reducedMotion ? undefined : { scale: 0.98 }}
            className="mt-9 inline-flex items-center gap-3 rounded-full border border-teal-300/30 bg-teal-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_50px_rgba(45,212,191,.18)]"
          >
            {actionLabel}
            <span aria-hidden="true">↗</span>
          </motion.a>
        </div>
      </div>
    </section>
  );
}

export function DeploymentPage() {
  const { t } = useTranslation("deployment");
  const { t: th } = useTranslation("home");
  const { t: tc } = useTranslation("common");
  const reducedMotion = Boolean(useReducedMotion());

  const overview = t("overview.items", { returnObjects: true }) as string[];
  const profiles = t("profiles.items", { returnObjects: true }) as DeploymentProfile[];
  const sections = t("sections", { returnObjects: true }) as DeploymentSection[];
  const shared = t("shared.rows", { returnObjects: true }) as SharedRow[];
  const certs = t("cert.items", { returnObjects: true }) as string[];

  return (
    <>
      <Seo page="deployment" path="/deployment" />

      <DeploymentHero
        eyebrow={t("eyebrow")}
        headline={t("headline")}
        body={t("body")}
        reducedMotion={reducedMotion}
      />

      <OverviewSection
        headline={t("overview.headline")}
        items={overview}
        reducedMotion={reducedMotion}
      />

      <ProfilesSection
        headline={t("profiles.headline")}
        profiles={profiles}
        reducedMotion={reducedMotion}
      />

      <TopologySection
        headline={t("topology.headline")}
        body={t("topology.body")}
        reducedMotion={reducedMotion}
      />

      <BoundarySections items={sections} reducedMotion={reducedMotion} />

      <SharedSection
        headline={t("shared.headline")}
        body={t("shared.body")}
        rows={shared}
        reducedMotion={reducedMotion}
      />

      <CertificationSection
        headline={t("cert.headline")}
        items={certs}
        note={t("cert.note")}
        reducedMotion={reducedMotion}
      />

      <DeploymentCta
        headline={th("final.headline")}
        body={th("final.body")}
        actionLabel={tc("cta.book")}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
