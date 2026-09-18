import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
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
import { reviewSchema } from "@/lib/form-schema";

const endpoint = import.meta.env.VITE_FORM_ENDPOINT;

type Status = "idle" | "sending" | "success" | "error";

type FieldProps = {
  name: string;
  label: string;
  error?: string;
  type?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
};

type SelectProps = {
  name: string;
  label: string;
  options: string[];
  error?: string;
};

const trackedNames = [
  "name",
  "organization",
  "title",
  "country",
  "email",
  "phone",
  "useCase",
  "volume",
  "languages",
  "deployment",
  "internet",
  "identity",
  "siem",
  "timeline",
  "notes",
] as const;

function useNearViewport<T extends HTMLElement>(
  ref: RefObject<T | null>,
  rootMargin = "260px 0px",
) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const updateVisibility = (value: boolean) => {
      setActive(value && document.visibilityState === "visible");
    };

    const observer = new IntersectionObserver(
      ([entry]) => updateVisibility(Boolean(entry?.isIntersecting)),
      { rootMargin },
    );

    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        setActive(false);
      }
    };

    observer.observe(node);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ref, rootMargin]);

  return active;
}

function useEnhancedVisuals() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean };
        deviceMemory?: number;
      }
    ).connection;
    const deviceMemory = (
      navigator as Navigator & { deviceMemory?: number }
    ).deviceMemory;

    const evaluate = () => {
      const cpuOkay = (navigator.hardwareConcurrency || 8) >= 4;
      const memoryOkay = deviceMemory == null || deviceMemory >= 4;
      const saveData = Boolean(connection?.saveData);
      setEnabled(media.matches && cpuOkay && memoryOkay && !saveData);
    };

    evaluate();
    media.addEventListener("change", evaluate);
    return () => media.removeEventListener("change", evaluate);
  }, []);

  return enabled;
}

function DemandFramePump({
  active,
  fps = 22,
}: {
  active: boolean;
  fps?: number;
}) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!active) return;

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

function IntakeField({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const particles = useMemo(() => {
    const positions = new Float32Array(54 * 3);
    for (let i = 0; i < 54; i += 1) {
      const theta = (i / 54) * Math.PI * 2;
      const radius = 2.4 + ((i * 37) % 13) * 0.045;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(theta * 1.7) * 1.45;
      positions[i * 3 + 2] = Math.sin(theta) * radius * 0.52;
    }
    return positions;
  }, []);

  const lines = useMemo(() => {
    const pairs = 30;
    const positions = new Float32Array(pairs * 2 * 3);
    for (let i = 0; i < pairs; i += 1) {
      const a = i % 54;
      const b = (i * 7 + 11) % 54;
      positions[i * 6] = particles[a * 3];
      positions[i * 6 + 1] = particles[a * 3 + 1];
      positions[i * 6 + 2] = particles[a * 3 + 2];
      positions[i * 6 + 3] = particles[b * 3];
      positions[i * 6 + 4] = particles[b * 3 + 1];
      positions[i * 6 + 5] = particles[b * 3 + 2];
    }
    return positions;
  }, [particles]);

  useFrame((state, delta) => {
    if (!active || !groupRef.current || !coreRef.current) return;

    groupRef.current.rotation.y += delta * 0.08;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      state.pointer.y * 0.08,
      0.035,
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      -state.pointer.x * 0.06,
      0.035,
    );

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.8) * 0.035;
    coreRef.current.scale.setScalar(pulse);
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          transparent
          opacity={0.58}
          color="#5eead4"
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[lines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial transparent opacity={0.13} color="#67e8f9" />
      </lineSegments>

      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.65, 0.018, 8, 96]} />
        <meshBasicMaterial transparent opacity={0.42} color="#2dd4bf" />
      </mesh>

      <mesh rotation={[Math.PI / 3.2, 0.55, 0.35]}>
        <torusGeometry args={[2.15, 0.012, 8, 96]} />
        <meshBasicMaterial transparent opacity={0.26} color="#22d3ee" />
      </mesh>

      <mesh rotation={[0.35, -0.5, 0.75]}>
        <torusGeometry args={[2.7, 0.008, 8, 96]} />
        <meshBasicMaterial transparent opacity={0.16} color="#818cf8" />
      </mesh>

      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.72, 2]} />
        <meshBasicMaterial
          color="#5eead4"
          wireframe
          transparent
          opacity={0.38}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color="#d5fff7" transparent opacity={0.92} />
      </mesh>
    </group>
  );
}

function BookingHero({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const enhancedVisuals = useEnhancedVisuals();
  const nearViewport = useNearViewport(sectionRef, "220px 0px");

  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const visual = visualRef.current;
    const grid = gridRef.current;
    if (!section || !visual || !grid) return;

    const ctx = gsap.context(() => {
      gsap.to(visual, {
        y: -42,
        x: 76,
        scale: 1.13,
        rotate: 4,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: 0.95,
          invalidateOnRefresh: true,
        },
      });

      gsap.to(grid, {
        x: 58,
        y: 42,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: 1.12,
          invalidateOnRefresh: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[#020817] px-6 pt-28 pb-20 text-white sm:pb-24 lg:min-h-[680px] lg:pt-32"
    >
      <div
        ref={gridRef}
        className="pointer-events-none absolute inset-[-10%] opacity-[0.24]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(45,212,191,.075) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.06) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,.9), rgba(0,0,0,.35) 72%, transparent)",
        }}
      />

      <div className="pointer-events-none absolute left-[8%] top-[14%] h-80 w-80 rounded-full bg-teal-400/[0.08] blur-[110px]" />
      <div className="pointer-events-none absolute right-[2%] top-[18%] h-[30rem] w-[30rem] rounded-full bg-cyan-400/[0.08] blur-[135px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[22%] h-96 w-96 rounded-full bg-indigo-400/[0.06] blur-[120px]" />

      <div className="pointer-events-none absolute inset-0 opacity-70">
        <svg viewBox="0 0 1440 760" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="book-flow-a" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#2dd4bf" stopOpacity="0" />
              <stop offset=".52" stopColor="#67e8f9" stopOpacity=".8" />
              <stop offset="1" stopColor="#60a5fa" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M-120 565 C 210 440, 360 700, 640 510 S 1030 300, 1530 430"
            fill="none"
            stroke="url(#book-flow-a)"
            strokeWidth="1.2"
            strokeDasharray="9 18"
            opacity=".48"
          />
          <path
            d="M-100 185 C 220 330, 510 90, 800 245 S 1180 520, 1530 245"
            fill="none"
            stroke="url(#book-flow-a)"
            strokeWidth=".85"
            strokeDasharray="4 15"
            opacity=".26"
          />
        </svg>
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.02fr_.98fr]">
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.22em] text-teal-400 uppercase">
            {eyebrow}
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
            {headline}
          </h1>

          <div className="mt-6 h-px w-36 origin-left bg-gradient-to-r from-teal-300 via-cyan-300 to-transparent" />

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
            {body}
          </p>
        </div>

        <motion.div
          ref={visualRef}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative hidden min-h-[430px] lg:block"
        >
          <div className="absolute inset-[8%] rounded-[3rem] border border-white/[0.055] bg-white/[0.015] [transform:perspective(900px)_rotateX(64deg)_rotateZ(-16deg)]" />
          <div className="absolute inset-[18%] rounded-full border border-teal-300/10" />
          <div className="absolute inset-[28%] rounded-full border border-cyan-300/10" />

          {enhancedVisuals ? (
            <div className="absolute inset-0 opacity-95">
              <Canvas
                frameloop="demand"
                dpr={1}
                camera={{ position: [0, 0, 6.4], fov: 48 }}
                gl={{
                  alpha: true,
                  antialias: false,
                  powerPreference: "high-performance",
                }}
              >
                <DemandFramePump active={nearViewport && !reducedMotion} fps={22} />
                <IntakeField active={nearViewport && !reducedMotion} />
              </Canvas>
            </div>
          ) : null}

          <motion.div
            animate={
              reducedMotion
                ? undefined
                : { rotate: [0, 360], scale: [1, 1.035, 1] }
            }
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-teal-300/20"
          />

          <motion.div
            animate={reducedMotion ? undefined : { rotate: [360, 0] }}
            transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan-300/10"
          />
        </motion.div>
      </div>
    </section>
  );
}

function BookingFormSection({
  configured,
  status,
  errors,
  onSubmit,
  t,
}: {
  configured: boolean;
  status: Status;
  errors: Record<string, string>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const formShellRef = useRef<HTMLDivElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const [activeField, setActiveField] = useState<string | null>(null);
  const [completion, setCompletion] = useState(0);

  const fieldLabels = useMemo<Record<string, string>>(
    () => ({
      name: t("fields.name"),
      organization: t("fields.organization"),
      title: t("fields.title"),
      country: t("fields.country"),
      email: t("fields.email"),
      phone: t("fields.phone"),
      useCase: t("fields.useCase"),
      volume: t("fields.volume"),
      languages: t("fields.languages"),
      deployment: t("fields.deployment"),
      internet: t("fields.internet"),
      identity: t("fields.identity"),
      siem: t("fields.siem"),
      timeline: t("fields.timeline"),
      notes: t("fields.notes"),
    }),
    [t],
  );

  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const shell = formShellRef.current;
    if (!section || !shell) return;

    const ctx = gsap.context(() => {
      const fields = Array.from(
        shell.querySelectorAll<HTMLElement>("[data-book-field]"),
      );

      fields.forEach((field, index) => {
        gsap.fromTo(
          field,
          {
            autoAlpha: 0,
            y: 34,
            x: index % 2 === 0 ? -18 : 18,
            scale: 0.985,
          },
          {
            autoAlpha: 1,
            y: 0,
            x: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: field,
              start: "top 92%",
              end: "top 66%",
              scrub: 0.5,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      gsap.to(".book-form-grid", {
        y: 70,
        x: -42,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.05,
          invalidateOnRefresh: true,
        },
      });

      gsap.to(".book-form-orbit-a", {
        rotate: 120,
        y: -54,
        scale: 1.09,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.78,
          invalidateOnRefresh: true,
        },
      });

      gsap.to(".book-form-orbit-b", {
        rotate: -150,
        y: 72,
        scale: 0.92,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.94,
          invalidateOnRefresh: true,
        },
      });

    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  const updateCompletion = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const completed = trackedNames.reduce((count, name) => {
      const value = data.get(name);
      return typeof value === "string" && value.trim() ? count + 1 : count;
    }, 0);
    setCompletion(Math.round((completed / trackedNames.length) * 100));
  };

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[#f7fafc] px-6 py-16 sm:py-20 lg:py-24"
    >
      <div
        className="book-form-grid pointer-events-none absolute inset-[-12%] opacity-[0.42]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.04) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      <div className="book-form-orbit-a pointer-events-none absolute -left-40 top-24 h-[34rem] w-[34rem] rounded-full border border-teal-500/10" />
      <div className="book-form-orbit-a pointer-events-none absolute -left-20 top-44 h-[24rem] w-[24rem] rounded-full border border-dashed border-cyan-500/10" />
      <div className="book-form-orbit-b pointer-events-none absolute -right-44 bottom-20 h-[38rem] w-[38rem] rounded-full border border-blue-500/10" />
      <div className="book-form-orbit-b pointer-events-none absolute -right-12 bottom-52 h-[22rem] w-[22rem] rounded-full border border-dashed border-indigo-500/10" />

      <div className="pointer-events-none absolute left-[10%] top-[24%] h-72 w-72 rounded-full bg-teal-300/10 blur-[100px]" />
      <div className="pointer-events-none absolute right-[8%] bottom-[18%] h-80 w-80 rounded-full bg-blue-300/10 blur-[110px]" />

      <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-28 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/78 p-5 shadow-[0_18px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/70 to-transparent" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/12 blur-3xl" />

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.22em] text-teal-600 uppercase">
                  {activeField ? fieldLabels[activeField] : t("eyebrow")}
                </p>
                <div className="mt-2 flex items-end gap-2">
                  <motion.p
                    key={completion}
                    initial={reducedMotion ? false : { opacity: 0.65, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-3xl font-semibold tracking-tight text-slate-950"
                  >
                    {completion}%
                  </motion.p>
                </div>
              </div>

              <div className="relative h-20 w-20 flex-none overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-inner">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(94,234,212,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.12) 1px, transparent 1px)",
                    backgroundSize: "12px 12px",
                  }}
                />
                <div className="absolute inset-3 rounded-xl border border-teal-300/20" />
                <motion.div
                  aria-hidden="true"
                  animate={
                    reducedMotion
                      ? undefined
                      : { y: [-14, 62, -14], opacity: [0, 0.95, 0] }
                  }
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-2 right-2 top-1 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_14px_rgba(34,211,238,.85)]"
                />
                <motion.div
                  aria-hidden="true"
                  animate={
                    reducedMotion
                      ? undefined
                      : { scale: [0.8, 1.25, 0.8], opacity: [0.28, 0.8, 0.28] }
                  }
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-200 bg-teal-300/70 shadow-[0_0_18px_rgba(45,212,191,.85)]"
                />
              </div>
            </div>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full origin-left rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500"
                initial={false}
                animate={{ scaleX: Math.max(completion / 100, 0.018) }}
                transition={{ type: "spring", stiffness: 125, damping: 22, mass: 0.55 }}
              />
            </div>

            <div className="relative mt-6">
              <div className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-200" />
              <motion.div
                aria-hidden="true"
                className="absolute left-[5px] top-2 h-8 w-[5px] rounded-full bg-gradient-to-b from-teal-400 via-cyan-400 to-transparent shadow-[0_0_14px_rgba(45,212,191,.55)]"
                animate={
                  reducedMotion
                    ? undefined
                    : { y: [0, 176, 0], opacity: [0.3, 1, 0.3] }
                }
                transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="space-y-1.5">
                {trackedNames.slice(0, 8).map((name, index) => {
                  const selected = activeField === name;
                  return (
                    <div
                      key={name}
                      className="relative flex min-h-8 items-center gap-3 rounded-lg px-2 pl-6 text-xs"
                    >
                      {selected ? (
                        <motion.div
                          layoutId="book-active-field-rail"
                          transition={{ type: "spring", stiffness: 360, damping: 30 }}
                          className="absolute inset-0 rounded-lg border border-teal-200/70 bg-teal-50/80"
                        />
                      ) : null}

                      <motion.span
                        animate={
                          selected && !reducedMotion
                            ? { scale: [1, 1.55, 1], opacity: [0.7, 1, 0.7] }
                            : { scale: 1, opacity: selected ? 1 : 0.55 }
                        }
                        transition={
                          selected && !reducedMotion
                            ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                            : { duration: 0.2 }
                        }
                        className={`relative z-10 h-2 w-2 rounded-full ${
                          selected
                            ? "bg-teal-500 shadow-[0_0_12px_rgba(20,184,166,.65)]"
                            : "bg-slate-300"
                        }`}
                      />
                      <span className={`relative z-10 font-mono ${selected ? "text-teal-700" : "text-slate-400"}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={`relative z-10 line-clamp-1 ${selected ? "font-medium text-slate-950" : "text-slate-500"}`}>
                        {fieldLabels[name]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div aria-hidden="true" className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
              <span className="relative flex h-2 w-2">
                <motion.span
                  animate={reducedMotion ? undefined : { scale: [1, 2.2], opacity: [0.5, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-teal-400"
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-teal-300/70 via-cyan-300/30 to-transparent" />
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/70" />
            </div>
          </div>
        </aside>

        <div
          ref={formShellRef}
          className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/92 p-5 shadow-[0_30px_100px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-7 lg:p-9"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/70 to-transparent" />
          <div className="pointer-events-none absolute right-[-8%] top-[-8%] h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />

          {!configured ? (
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-slate-800"
            >
              {t("unconfigured")}
            </motion.p>
          ) : null}

          {status === "success" ? (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative grid min-h-[360px] place-items-center overflow-hidden rounded-[1.5rem] border border-teal-200/70 bg-gradient-to-b from-teal-50 to-white p-8 text-center"
            >
              <motion.div
                animate={reducedMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute h-64 w-64 rounded-full border border-dashed border-teal-300/50"
              />
              <motion.div
                animate={reducedMotion ? undefined : { rotate: -360 }}
                transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
                className="absolute h-44 w-44 rounded-full border border-cyan-300/50"
              />
              <div className="relative z-10">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-teal-300 bg-white shadow-[0_12px_40px_rgba(45,212,191,0.18)]">
                  <span className="text-2xl text-teal-600">✓</span>
                </div>
                <p className="mt-6 text-lg font-semibold text-teal-700">{t("success")}</p>
              </div>
            </motion.div>
          ) : (
            <form
              className="grid gap-5"
              onSubmit={onSubmit}
              onFocusCapture={(event) => {
                const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                if (target.name) setActiveField(target.name);
              }}
              onBlurCapture={(event) => {
                const form = event.currentTarget;
                window.setTimeout(() => {
                  const active = document.activeElement as HTMLElement | null;
                  if (!active || !form.contains(active)) setActiveField(null);
                }, 0);
              }}
              onInput={(event) => updateCompletion(event.currentTarget)}
              noValidate
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field name="name" label={t("fields.name")} error={errors.name} required />
                <Field name="organization" label={t("fields.organization")} error={errors.organization} required />
                <Field name="title" label={t("fields.title")} error={errors.title} required />
                <Field name="country" label={t("fields.country")} error={errors.country} required />
                <Field name="email" label={t("fields.email")} type="email" error={errors.email} required dir="ltr" />
                <Field name="phone" label={t("fields.phone")} dir="ltr" />
                <Select name="useCase" label={t("fields.useCase")} options={t("useCases", { returnObjects: true }) as string[]} error={errors.useCase} />
                <Select name="volume" label={t("fields.volume")} options={t("volumes", { returnObjects: true }) as string[]} error={errors.volume} />
                <Select name="languages" label={t("fields.languages")} options={t("languages", { returnObjects: true }) as string[]} error={errors.languages} />
                <Select name="deployment" label={t("fields.deployment")} options={t("deployments", { returnObjects: true }) as string[]} error={errors.deployment} />
                <Select name="internet" label={t("fields.internet")} options={t("internet", { returnObjects: true }) as string[]} error={errors.internet} />
                <Field name="identity" label={t("fields.identity")} error={errors.identity} required />
                <Field name="siem" label={t("fields.siem")} error={errors.siem} required />
                <Select name="timeline" label={t("fields.timeline")} options={t("timelines", { returnObjects: true }) as string[]} error={errors.timeline} />
              </div>

              <label data-book-field className="group grid gap-2 text-sm">
                <span className="font-medium text-slate-700 transition-colors group-focus-within:text-teal-700">
                  {t("fields.notes")}
                </span>
                <textarea
                  name="notes"
                  rows={5}
                  className="min-h-[132px] resize-y rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-950 outline-none transition duration-300 placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                />
              </label>

              <div className="hidden" aria-hidden="true">
                <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
              </div>

              <div data-book-field className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="consent"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>{t("consent")}</span>
                </label>
                {errors.consent ? (
                  <p className="mt-2 text-sm text-danger">{errors.consent}</p>
                ) : null}
              </div>

              {status === "error" ? (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-danger"
                >
                  {t("error")}
                </motion.p>
              ) : null}

              <motion.button
                data-book-field
                type="submit"
                disabled={!configured || status === "sending"}
                whileHover={configured && status !== "sending" && !reducedMotion ? { y: -2, scale: 1.005 } : undefined}
                whileTap={configured && status !== "sending" && !reducedMotion ? { scale: 0.995 } : undefined}
                className="relative inline-flex min-h-13 items-center justify-center overflow-hidden rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(15,23,42,0.18)] transition disabled:cursor-not-allowed disabled:opacity-45"
              >
                <motion.span
                  aria-hidden="true"
                  animate={
                    reducedMotion
                      ? undefined
                      : { x: ["-130%", "150%"] }
                  }
                  transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
                  className="absolute inset-y-0 w-28 -skew-x-12 bg-gradient-to-r from-transparent via-white/14 to-transparent"
                />
                <span className="relative z-10">
                  {status === "sending" ? t("sending") : t("submit")}
                </span>
              </motion.button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export function BookPage() {
  const { t } = useTranslation("book");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const raw = {
      name: String(form.get("name") ?? ""),
      organization: String(form.get("organization") ?? ""),
      title: String(form.get("title") ?? ""),
      country: String(form.get("country") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      useCase: String(form.get("useCase") ?? ""),
      volume: String(form.get("volume") ?? ""),
      languages: String(form.get("languages") ?? ""),
      deployment: String(form.get("deployment") ?? ""),
      internet: String(form.get("internet") ?? ""),
      identity: String(form.get("identity") ?? ""),
      siem: String(form.get("siem") ?? ""),
      timeline: String(form.get("timeline") ?? ""),
      notes: String(form.get("notes") ?? ""),
      consent: form.get("consent") === "on",
      companyWebsite: String(form.get("companyWebsite") ?? ""),
    };

    const parsed = reviewSchema.safeParse(raw);

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        next[key] =
          key === "email"
            ? t("errors.email")
            : key === "consent"
              ? t("errors.consent")
              : t("errors.required");
      }
      setErrors(next);
      setStatus("idle");
      return;
    }

    setErrors({});

    if (parsed.data.companyWebsite) {
      setStatus("success");
      return;
    }

    if (!endpoint) {
      setStatus("idle");
      return;
    }

    setStatus("sending");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      setStatus(response.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  const configured = Boolean(endpoint);

  return (
    <>
      <Seo page="book" path="/book" />

      <BookingHero
        eyebrow={t("eyebrow")}
        headline={t("headline")}
        body={t("body")}
      />

      <BookingFormSection
        configured={configured}
        status={status}
        errors={errors}
        onSubmit={onSubmit}
        t={t}
      />
    </>
  );
}

function Field({
  name,
  label,
  error,
  type = "text",
  required,
  dir,
}: FieldProps) {
  const id = `field-${name}`;

  return (
    <label data-book-field className="group grid gap-2 text-sm" htmlFor={id}>
      <span className="font-medium text-slate-700 transition-colors group-focus-within:text-teal-700">
        {label}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        dir={dir}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`rounded-xl border bg-slate-50/70 px-4 py-3 text-slate-950 outline-none transition duration-300 placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
            : "border-slate-200 focus:border-teal-400 focus:ring-teal-500/10"
        }`}
      />
      {error ? (
        <span id={`${id}-error`} className="text-sm text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function Select({
  name,
  label,
  options,
  error,
}: SelectProps) {
  const id = `field-${name}`;

  return (
    <label data-book-field className="group grid gap-2 text-sm" htmlFor={id}>
      <span className="font-medium text-slate-700 transition-colors group-focus-within:text-teal-700">
        {label}
      </span>
      <select
        id={id}
        name={name}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`rounded-xl border bg-slate-50/70 px-4 py-3 text-slate-950 outline-none transition duration-300 focus:bg-white focus:ring-4 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
            : "border-slate-200 focus:border-teal-400 focus:ring-teal-500/10"
        }`}
      >
        <option value="" />
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <span id={`${id}-error`} className="text-sm text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}
