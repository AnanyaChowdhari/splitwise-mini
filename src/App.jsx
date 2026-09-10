import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";
import {
  Plus,
  X,
  Check,
  Receipt,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const COLORS = {
  cream: "#FBF3E3",
  creamDeep: "#EFE2C4",
  navy: "#14213D",
  navyDeep: "#0C1730",
  blue: "#3A6FF0",
  blueSoft: "#E3EBFF",
  cyan: "#33C2DA",
  cyanSoft: "#DEF6FA",
  coral: "#FF7A50",
  coralDeep: "#C1481F",
  coralSoft: "#FFE4D8",
  teal: "#1F9E7C",
  tealDeep: "#157A5F",
  tealSoft: "#DBF3EA",
  purple: "#8763F2",
  purpleDeep: "#6339E0",
  purpleSoft: "#EEE6FF",
  gold: "#F4B740",
  goldSoft: "#FDF0D2",
  white: "#FFFFFF",
  ink: "#16233F",
  inkSoft: "#3B4664",
  muted: "#636E88",
  mutedLight: "#98A0B4",
};

const CATEGORY_STYLES = {
  Dinner: { icon: "🍽", main: COLORS.coral, deep: COLORS.coralDeep, soft: COLORS.coralSoft },
  Hotel: { icon: "🏨", main: COLORS.blue, deep: "#2450B8", soft: COLORS.blueSoft },
  Trip: { icon: "🧳", main: COLORS.teal, deep: COLORS.tealDeep, soft: COLORS.tealSoft },
  Other: { icon: "📌", main: COLORS.purple, deep: COLORS.purpleDeep, soft: COLORS.purpleSoft },
};
const CATEGORIES = ["Dinner", "Hotel", "Trip", "Other"];
const categoryOf = (c) => CATEGORY_STYLES[c] || CATEGORY_STYLES.Other;

const AVATAR_PALETTE = [
  { bg: COLORS.coralSoft, fg: COLORS.coralDeep },
  { bg: COLORS.blueSoft, fg: "#2450B8" },
  { bg: COLORS.tealSoft, fg: COLORS.tealDeep },
  { bg: COLORS.purpleSoft, fg: COLORS.purpleDeep },
  { bg: COLORS.goldSoft, fg: "#946A0A" },
  { bg: COLORS.cyanSoft, fg: "#15839F" },
];
function avatarTone(name) {
  const s = (name || "?").trim();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

const RADIUS = { sm: 8, md: 14, pill: 999 };
const FONT = {
  serif: "'Fraunces', serif",
  sans: "'IBM Plex Sans', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

const fmt = (n) =>
  `₹${n.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  })}`;
const uid = () => Math.random().toString(36).slice(2, 10);

const TAP_FEEDBACK = { scale: 0.96 };
const HOVER_FEEDBACK = { scale: 1.02 };
const FEEDBACK_TRANSITION = { duration: 0.15, ease: "easeOut" };

// ---------------------------------------------------------------------------
// AnimatedNumber — tweens between old and new numeric value.
// Purely presentational: never touches how the number is calculated.
// ---------------------------------------------------------------------------
function AnimatedNumber({ value, format = fmt }) {
  const mv = useMotionValue(value);
  const display = useTransform(mv, (v) => format(v));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.5, ease: "easeOut" });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <motion.span style={{ fontVariantNumeric: "tabular-nums" }}>{display}</motion.span>;
}

// ---------------------------------------------------------------------------
// Debt simplification — greedy min-cash-flow (UNCHANGED LOGIC)
// ---------------------------------------------------------------------------
function simplifyDebts(balanceMap) {
  const creditors = [];
  const debtors = [];
  Object.entries(balanceMap).forEach(([name, amt]) => {
    const rounded = Math.round(amt * 100) / 100;
    if (rounded > 0.01) creditors.push({ name, amt: rounded });
    else if (rounded < -0.01) debtors.push({ name, amt: -rounded });
  });
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const txns = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i], c = creditors[j];
    const amt = Math.min(d.amt, c.amt);
    if (amt > 0.01) txns.push({ from: d.name, to: c.name, amount: Math.round(amt * 100) / 100 });
    d.amt -= amt;
    c.amt -= amt;
    if (d.amt <= 0.01) i++;
    if (c.amt <= 0.01) j++;
  }
  return txns;
}

function computeBalances(event) {
  const balances = {};
  event.participants.forEach((p) => (balances[p] = 0));
  event.expenses.forEach((exp) => {
    const among = exp.splitAmong.length ? exp.splitAmong : event.participants;
    const share = exp.amount / among.length;
    balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;
    among.forEach((p) => {
      balances[p] = (balances[p] || 0) - share;
    });
  });
  return balances;
}

// ---------------------------------------------------------------------------
// Float — small helper for gently bobbing decorative elements.
// ---------------------------------------------------------------------------
function Float({ children, duration = 4, delay = 0, distance = 10, style }) {
  return (
    <motion.div
      style={{ position: "absolute", ...style }}
      animate={{ y: [0, -distance, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Global backdrop — crisp flat graphic shapes bleeding off the page edges.
// ---------------------------------------------------------------------------
function GlobalBackdrop() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: -180, left: -220, width: 480, height: 480, borderRadius: "50%", background: COLORS.navy, opacity: 0.05 }} />
      <div style={{ position: "absolute", top: -60, right: -140, width: 360, height: 360, background: COLORS.cyan, opacity: 0.13, clipPath: "polygon(100% 0, 100% 100%, 0 0)" }} />
      <div style={{ position: "absolute", top: "40%", left: -60, width: 280, height: 100, background: COLORS.coral, opacity: 0.09, transform: "rotate(-8deg)" }} />
      <div style={{ position: "absolute", bottom: -140, right: -100, width: 340, height: 340, background: COLORS.purple, opacity: 0.07, clipPath: "polygon(0 100%, 100% 100%, 100% 0)" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(rgba(20,33,61,0.06) 1px, transparent 1px)`,
          backgroundSize: "26px 26px",
          opacity: 0.45,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small UI primitives
// ---------------------------------------------------------------------------
const shineVariants = {
  rest: { x: "-130%" },
  hover: { x: "180%", transition: { duration: 0.65, ease: "easeInOut" } },
};

function Button({ onClick, children, variant = "primary", disabled, style, type = "button" }) {
  const base = {
    border: "none",
    borderRadius: RADIUS.sm,
    padding: "12px 22px",
    fontSize: 14.5,
    fontWeight: 700,
    fontFamily: FONT.sans,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    letterSpacing: "0.01em",
    position: "relative",
    overflow: "hidden",
  };
  const variants = {
    primary: {
      background: disabled ? "#C7CBD6" : `linear-gradient(100deg, ${COLORS.coral}, ${COLORS.gold})`,
      color: COLORS.navy,
      boxShadow: disabled ? "none" : "0 8px 20px rgba(255,122,80,0.35)",
    },
    outline: {
      background: "transparent",
      color: disabled ? COLORS.mutedLight : COLORS.teal,
      border: `2px solid ${disabled ? "#E4E6EC" : COLORS.teal}`,
    },
    ghost: {
      background: "transparent",
      color: COLORS.muted,
      padding: "6px 4px",
    },
  };
  const showShine = variant === "primary" && !disabled;
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      initial="rest"
      whileHover={!disabled ? "hover" : "rest"}
      whileTap={!disabled ? TAP_FEEDBACK : undefined}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {showShine && (
        <motion.span
          variants={shineVariants}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "35%",
            height: "100%",
            background: "linear-gradient(120deg, transparent, rgba(255,255,255,0.55), transparent)",
            transform: "skewX(-20deg)",
          }}
        />
      )}
      <span style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center" }}>
        {children}
      </span>
    </motion.button>
  );
}

function IconButton({ onClick, children, title, danger }) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileHover={HOVER_FEEDBACK}
      whileTap={TAP_FEEDBACK}
      transition={FEEDBACK_TRANSITION}
      style={{
        border: "none",
        background: danger ? COLORS.coralSoft : "#F1F2F6",
        color: danger ? COLORS.coralDeep : COLORS.ink,
        borderRadius: RADIUS.sm,
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {children}
    </motion.button>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="ledger-input"
      style={{
        border: "2px solid #E9E6D8",
        borderRadius: RADIUS.sm,
        padding: "11px 14px",
        fontSize: 14,
        fontFamily: FONT.sans,
        background: COLORS.white,
        color: COLORS.ink,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        ...props.style,
      }}
    />
  );
}

function InitialAvatar({ name, size = 26 }) {
  const t = avatarTone(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: t.bg,
        color: t.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
        fontFamily: FONT.sans,
        flexShrink: 0,
        border: `2px solid ${COLORS.cream}`,
      }}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

function LogoMark({ size = 34 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS.sm,
        background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.cyan})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Receipt size={size * 0.52} color="#fff" strokeWidth={2.4} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero illustration — ONE connected scene: a large anchor shape with
// overlapping objects at real scale, not scattered tiny emoji.
// ---------------------------------------------------------------------------
function HeroIllustration() {
  return (
    <div className="ledger-hero-art" style={{ position: "relative", width: "100%", height: 380 }}>
      {/* Anchor shape — everything else overlaps this */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `linear-gradient(150deg, ${COLORS.cyanSoft}, ${COLORS.blueSoft})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -10,
          left: 20,
          width: 220,
          height: 130,
          background: COLORS.coralSoft,
          clipPath: "polygon(0 100%, 100% 100%, 100% 0)",
          opacity: 0.9,
        }}
      />

      {/* Receipt — 150px */}
      <Float duration={5} distance={9} style={{ top: 26, left: 6 }}>
        <motion.div
          initial={{ opacity: 0, rotate: -16, scale: 0.9 }}
          animate={{ opacity: 1, rotate: -8, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{
            width: 152,
            background: COLORS.white,
            borderRadius: 8,
            padding: "16px 16px",
            boxShadow: "0 16px 34px rgba(20,33,61,0.16)",
          }}
        >
          <div style={{ height: 7, width: "75%", background: COLORS.coralSoft, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 7, width: "55%", background: "#EEE", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 7, width: "65%", background: "#EEE", borderRadius: 4, marginBottom: 12 }} />
          <div style={{ fontFamily: FONT.mono, fontSize: 16, fontWeight: 800, color: COLORS.ink }}>₹1,240</div>
        </motion.div>
      </Float>

      {/* Coin — 72px, overlapping the receipt's top-right corner */}
      <Float duration={3.8} distance={12} delay={0.4} style={{ top: 4, left: 128 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.gold}, #E19A1F)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#7A5306",
            fontWeight: 800,
            fontSize: 28,
            boxShadow: "0 14px 28px rgba(244,183,64,0.45)",
          }}
        >
          ₹
        </motion.div>
      </Float>

      {/* Money-flow — 170px wide, overlapping bottom of receipt */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        style={{
          position: "absolute",
          top: 168,
          left: 34,
          width: 176,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: COLORS.white,
          borderRadius: RADIUS.pill,
          padding: "10px 16px 10px 10px",
          boxShadow: "0 14px 30px rgba(20,33,61,0.16)",
        }}
      >
        <InitialAvatar name="A" size={34} />
        <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
          <ArrowRight size={17} color={COLORS.teal} />
        </motion.div>
        <InitialAvatar name="B" size={34} />
        <span style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: 800, color: COLORS.teal }}>₹420</span>
      </motion.div>

      {/* Suitcase — 74px, overlapping money-flow's bottom-left */}
      <Float duration={4.6} distance={8} delay={0.55} style={{ top: 250, left: 10 }}>
        <motion.div
          initial={{ opacity: 0, rotate: 10, scale: 0.85 }}
          animate={{ opacity: 1, rotate: -6, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          style={{
            width: 74,
            height: 74,
            borderRadius: RADIUS.md,
            background: COLORS.tealSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            boxShadow: "0 12px 26px rgba(31,158,124,0.25)",
          }}
        >
          🧳
        </motion.div>
      </Float>

      {/* Dinner object — 78px, anchored bottom-right, overlaps circle edge */}
      <Float duration={5.2} distance={9} delay={0.2} style={{ top: 262, right: 30 }}>
        <motion.div
          initial={{ opacity: 0, rotate: -10, scale: 0.85 }}
          animate={{ opacity: 1, rotate: 7, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          style={{
            width: 78,
            height: 78,
            borderRadius: RADIUS.md,
            background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.purpleDeep})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            boxShadow: "0 14px 30px rgba(135,99,242,0.4)",
          }}
        >
          🍽
        </motion.div>
      </Float>

      {/* small hotel chip tucked behind, top-right, peeking out */}
      <Float duration={4.2} distance={7} delay={0.3} style={{ top: 8, right: 6 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          style={{
            width: 58,
            height: 58,
            borderRadius: RADIUS.md,
            background: COLORS.blueSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            transform: "rotate(10deg)",
          }}
        >
          🏨
        </motion.div>
      </Float>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Colored anchor shape sitting behind an event object — organic, no border,
// no shadow. Size scales with the object's visual "weight".
// ---------------------------------------------------------------------------
function ObjectShape({ size, color, rotate = 0, style }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "48% 52% 55% 45% / 50% 45% 55% 50%",
        background: color,
        transform: `rotate(${rotate}deg)`,
        zIndex: 0,
        ...style,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// FeaturedEventObject — used when there is exactly one event. Large,
// centered, visually dominant so the page never feels empty with one event.
// ---------------------------------------------------------------------------
function FeaturedEventObject({ event, onOpen }) {
  const [hovered, setHovered] = useState(false);
  const balances = useMemo(() => computeBalances(event), [event]);
  const debts = useMemo(() => simplifyDebts(balances), [balances]);
  const pending = debts.filter((d) => !(event.cleared || {})[`${d.from}__${d.to}`]).length;
  const total = event.expenses.reduce((s, e) => s + e.amount, 0);
  const cat = categoryOf(event.category);

  let dotColor = COLORS.mutedLight;
  let label = "settled";
  if (debts.length > 0) {
    if (pending === 0) {
      dotColor = COLORS.teal;
      label = "all cleared";
    } else {
      dotColor = COLORS.coral;
      label = `${pending} pending`;
    }
  }

  return (
    <motion.div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        position: "relative",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "50px 20px 40px",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 380,
          height: 380,
          maxWidth: "90vw",
          borderRadius: "46% 54% 52% 48% / 48% 44% 56% 52%",
          background: `linear-gradient(150deg, ${cat.soft}, ${COLORS.cream})`,
          zIndex: 0,
        }}
      />
      <div aria-hidden style={{ position: "relative", fontSize: 56, marginBottom: 6 }}>
        {cat.icon}
      </div>
      <div
        style={{
          position: "relative",
          fontSize: 12,
          fontWeight: 700,
          color: cat.deep,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          marginBottom: 8,
        }}
      >
        {event.category}
      </div>
      <div style={{ position: "relative", fontFamily: FONT.serif, fontWeight: 700, fontSize: 34, color: COLORS.ink, marginBottom: 10, maxWidth: 320 }}>
        {event.name}
      </div>
      <div style={{ position: "relative", fontFamily: FONT.mono, fontWeight: 800, fontSize: 56, color: cat.main, marginBottom: 12, lineHeight: 1 }}>
        <AnimatedNumber value={total} />
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, display: "inline-block" }} />
        <span style={{ fontSize: 12.5, color: COLORS.muted, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ position: "relative", display: "flex", marginTop: 14 }}>
        {event.participants.slice(0, 6).map((p, i) => (
          <div key={p} style={{ marginLeft: i === 0 ? 0 : -8 }}>
            <InitialAvatar name={p} size={30} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// EventObject — used when there are multiple events. Pure typography + icon
// over its own colored anchor shape. No card, no border, no shadow.
// ---------------------------------------------------------------------------
function EventObject({ event, onOpen, weight = "md", rotate = 0, lift = 0 }) {
  const [hovered, setHovered] = useState(false);
  const balances = useMemo(() => computeBalances(event), [event]);
  const debts = useMemo(() => simplifyDebts(balances), [balances]);
  const pending = debts.filter((d) => !(event.cleared || {})[`${d.from}__${d.to}`]).length;
  const total = event.expenses.reduce((s, e) => s + e.amount, 0);
  const cat = categoryOf(event.category);

  let dotColor = COLORS.mutedLight;
  let label = "settled";
  if (debts.length > 0) {
    if (pending === 0) {
      dotColor = COLORS.teal;
      label = "all cleared";
    } else {
      dotColor = COLORS.coral;
      label = `${pending} pending`;
    }
  }

  const scaleMap = { xl: 1.4, lg: 1.15, md: 1, sm: 0.86 };
  const shapeMap = { xl: 240, lg: 195, md: 165, sm: 135 };
  const scale = scaleMap[weight];
  const shapeSize = shapeMap[weight];

  return (
    <motion.div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: lift, rotate: hovered ? 0 : rotate }}
      exit={{ opacity: 0, y: -12 }}
      whileHover={{ scale: scale * 1.03 }}
      whileTap={{ scale: scale * 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
        position: "relative",
        cursor: "pointer",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: shapeSize * 0.14,
        transformOrigin: "center",
      }}
    >
      <ObjectShape size={shapeSize} color={cat.soft} rotate={rotate * 3} style={{ top: -shapeSize * 0.12, left: -shapeSize * 0.1 }} />

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <span style={{ fontSize: 24 * scale }}>{cat.icon}</span>
        <span style={{ fontSize: 11 * Math.max(scale, 0.9), fontWeight: 700, color: cat.deep, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {event.category}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          fontFamily: FONT.serif,
          fontWeight: 700,
          fontSize: 19 * scale,
          color: COLORS.ink,
          lineHeight: 1.05,
          maxWidth: 210 * scale,
          marginBottom: 2,
        }}
      >
        {event.name}
      </div>
      <div style={{ position: "relative", fontFamily: FONT.mono, fontWeight: 800, fontSize: 34 * scale, color: cat.main, margin: "2px 0 6px" }}>
        <AnimatedNumber value={total} />
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, display: "inline-block" }} />
        <span style={{ fontSize: 11 * Math.max(scale, 0.9), color: COLORS.muted }}>{label}</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Scatter pattern — cycles rotation/lift/weight so the collection reads as
// arranged, not gridded.
// ---------------------------------------------------------------------------
const SCATTER_PATTERN = [
  { weight: "xl", rotate: -2, lift: 0 },
  { weight: "sm", rotate: 3, lift: 20 },
  { weight: "md", rotate: -3, lift: -8 },
  { weight: "sm", rotate: 2, lift: 12 },
  { weight: "lg", rotate: -1, lift: 4 },
  { weight: "sm", rotate: 4, lift: -10 },
];

// ---------------------------------------------------------------------------
// Empty state — typography + a handful of scattered objects, no container.
// ---------------------------------------------------------------------------
function EmptyIllustration({ onCreate }) {
  return (
    <div style={{ position: "relative", padding: "6px 0 10px" }}>
      <div style={{ position: "relative", height: 170, maxWidth: 260, margin: "0 auto" }}>
        <Float duration={4.2} distance={9} style={{ top: 0, left: "50%", marginLeft: -16 }}>
          <div style={{ fontSize: 30, transform: "rotate(-6deg)" }}>🧾</div>
        </Float>
        <Float duration={4.8} distance={8} delay={0.3} style={{ top: 66, left: 4 }}>
          <div style={{ fontSize: 22, transform: "rotate(12deg)" }}>🪙</div>
        </Float>
        <Float duration={5.2} distance={10} delay={0.5} style={{ top: 60, right: 4 }}>
          <div style={{ fontSize: 24, transform: "rotate(-8deg)" }}>👥</div>
        </Float>
        <Float duration={4.4} distance={7} delay={0.2} style={{ top: 128, left: "50%", marginLeft: -10 }}>
          <div style={{ fontSize: 20, transform: "rotate(10deg)" }}>✨</div>
        </Float>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ textAlign: "center" }}>
        <div style={{ fontFamily: FONT.serif, fontSize: 24, fontWeight: 700, color: COLORS.ink, marginBottom: 6 }}>Nothing to split yet.</div>
        <div style={{ fontSize: 13.5, color: COLORS.muted, marginBottom: 18 }}>
          A dinner, a trip, a hotel stay — add the people, log what everyone paid.
        </div>
        <Button variant="primary" onClick={onCreate}>
          <Sparkles size={15} style={{ marginRight: 6 }} />
          Create your first event
        </Button>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event creation form
// ---------------------------------------------------------------------------
function NewEventForm({ onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Dinner");
  const [participantInput, setParticipantInput] = useState("");
  const [participants, setParticipants] = useState([]);

  const addParticipant = () => {
    const v = participantInput.trim();
    if (v && !participants.includes(v)) {
      setParticipants([...participants, v]);
      setParticipantInput("");
    }
  };

  const canCreate = name.trim() && participants.length >= 2;
  const cat = categoryOf(category);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ borderTop: `2px solid ${cat.main}`, paddingTop: 18, marginBottom: 24 }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, fontFamily: FONT.serif, marginBottom: 16 }}>New event</div>

      <div style={{ marginBottom: 14 }}>
        <TextInput placeholder="Event name — e.g. Goa Trip" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {CATEGORIES.map((c) => {
          const cs = categoryOf(c);
          const selected = category === c;
          return (
            <motion.button
              key={c}
              onClick={() => setCategory(c)}
              whileHover={HOVER_FEEDBACK}
              whileTap={TAP_FEEDBACK}
              transition={FEEDBACK_TRANSITION}
              style={{
                border: `2px solid ${selected ? cs.main : "#EDEAD8"}`,
                background: selected ? cs.soft : "transparent",
                color: selected ? cs.deep : COLORS.inkSoft,
                borderRadius: RADIUS.pill,
                padding: "7px 14px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONT.sans,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span>{cs.icon}</span> {c}
            </motion.button>
          );
        })}
      </div>

      <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 8, fontWeight: 600 }}>
        Participants <span style={{ color: COLORS.mutedLight, fontWeight: 400 }}>(add at least 2)</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <TextInput
          placeholder="Name, then press Add"
          value={participantInput}
          onChange={(e) => setParticipantInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addParticipant()}
        />
        <Button variant="outline" onClick={addParticipant} style={{ whiteSpace: "nowrap" }}>
          Add
        </Button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22, minHeight: 2 }}>
        <AnimatePresence initial={false}>
          {participants.map((p) => (
            <motion.span
              key={p}
              layout
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18, type: "spring", bounce: 0.35 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "#F6F5EE",
                borderRadius: RADIUS.pill,
                padding: "4px 11px 4px 4px",
                fontSize: 13,
                color: COLORS.inkSoft,
                fontWeight: 500,
              }}
            >
              <InitialAvatar name={p} size={22} />
              {p}
              <X
                size={13}
                style={{ cursor: "pointer", color: COLORS.mutedLight }}
                onClick={() => setParticipants(participants.filter((x) => x !== p))}
              />
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
        <Button variant="primary" disabled={!canCreate} onClick={() => canCreate && onCreate({ name: name.trim(), category, participants })}>
          Create event
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Expense add form
// ---------------------------------------------------------------------------
function NewExpenseForm({ participants, onAdd, category }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(participants[0] || "");
  const [splitAmong, setSplitAmong] = useState(participants);
  const cat = categoryOf(category);

  const toggle = (p) => {
    setSplitAmong((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const canAdd = description.trim() && Number(amount) > 0 && paidBy && splitAmong.length > 0;

  const submit = () => {
    if (!canAdd) return;
    onAdd({ description: description.trim(), amount: Number(amount), paidBy, splitAmong });
    setDescription("");
    setAmount("");
    setSplitAmong(participants);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ borderTop: `2px solid ${cat.main}`, paddingTop: 16, marginBottom: 20 }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.ink, fontFamily: FONT.serif, marginBottom: 14 }}>Add a payment</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: 160 }}>
          <TextInput placeholder="What was it for?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 110 }}>
          <TextInput placeholder="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ fontFamily: FONT.mono }} />
        </div>
      </div>

      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Paid by</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {participants.map((p) => {
          const selected = paidBy === p;
          return (
            <motion.button
              key={p}
              onClick={() => setPaidBy(p)}
              whileHover={HOVER_FEEDBACK}
              whileTap={TAP_FEEDBACK}
              transition={FEEDBACK_TRANSITION}
              style={{
                border: `2px solid ${selected ? COLORS.gold : "#EDEAD8"}`,
                background: selected ? COLORS.goldSoft : "transparent",
                color: COLORS.inkSoft,
                borderRadius: RADIUS.pill,
                padding: "6px 13px 6px 6px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: FONT.sans,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <InitialAvatar name={p} size={20} />
              {p}
            </motion.button>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Split among</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {participants.map((p) => {
          const selected = splitAmong.includes(p);
          return (
            <motion.button
              key={p}
              onClick={() => toggle(p)}
              whileHover={HOVER_FEEDBACK}
              whileTap={TAP_FEEDBACK}
              transition={FEEDBACK_TRANSITION}
              style={{
                border: `2px solid ${selected ? COLORS.teal : "#EDEAD8"}`,
                background: selected ? COLORS.tealSoft : "transparent",
                color: COLORS.inkSoft,
                borderRadius: RADIUS.pill,
                padding: "6px 13px 6px 6px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: FONT.sans,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <InitialAvatar name={p} size={20} />
              {p}
            </motion.button>
          );
        })}
      </div>

      <Button variant="primary" onClick={submit} disabled={!canAdd}>
        <Plus size={14} style={{ marginRight: 5 }} />
        Add payment
      </Button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ExpenseStrip — a thin receipt-like strip, not a boxed card.
// ---------------------------------------------------------------------------
function ExpenseStrip({ exp, category, index, onRemove }) {
  const [hovered, setHovered] = useState(false);
  const cat = categoryOf(category);
  const tilt = index % 2 === 0 ? -0.6 : 0.6;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0, rotate: hovered ? 0 : tilt }}
      exit={{ opacity: 0, x: 30, transition: { duration: 0.2 } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 14,
        background: hovered ? cat.soft : "transparent",
        borderTop: `2px dashed ${cat.main}55`,
        padding: "12px 4px 12px 4px",
        transition: "background 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <InitialAvatar name={exp.paidBy} size={28} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, color: COLORS.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {exp.description}
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
            {exp.paidBy} paid · split {exp.splitAmong.length} way{exp.splitAmong.length > 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ fontFamily: FONT.mono, color: COLORS.ink, fontSize: 14.5, fontWeight: 700 }}>{fmt(exp.amount)}</div>
        <motion.div animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.8 }} transition={{ duration: 0.12 }} style={{ pointerEvents: hovered ? "auto" : "none" }}>
          <IconButton title="Remove" danger onClick={() => onRemove(exp.id)}>
            <Trash2 size={13} />
          </IconButton>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// FlowLine — the connecting line between two avatars, with a small dot
// continuously traveling along it.
// ---------------------------------------------------------------------------
function FlowLine({ color }) {
  return (
    <div style={{ position: "relative", flex: 1, height: 2, background: `${color}33`, minWidth: 50 }}>
      <motion.div
        animate={{ left: ["2%", "90%"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", top: "50%", width: 7, height: 7, borderRadius: "50%", background: color, transform: "translateY(-50%)" }}
      />
      <ArrowRight size={15} color={color} style={{ position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DebtDiagram — a plain money-flow diagram entry.
// ---------------------------------------------------------------------------
function DebtDiagram({ d, isCleared, onToggle, isLast }) {
  const fg = isCleared ? COLORS.tealDeep : COLORS.coralDeep;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{ textAlign: "center", padding: "22px 8px", borderBottom: isLast ? "none" : `1px dashed ${COLORS.creamDeep}` }}
    >
      <div style={{ fontFamily: FONT.mono, fontSize: 32, fontWeight: 800, color: fg, marginBottom: 16 }}>
        <AnimatedNumber value={d.amount} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, maxWidth: 360, margin: "0 auto 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 66 }}>
          <InitialAvatar name={d.from} size={40} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.inkSoft, textTransform: "uppercase" }}>{d.from}</span>
        </div>
        <FlowLine color={fg} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 66 }}>
          <InitialAvatar name={d.to} size={40} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.inkSoft, textTransform: "uppercase" }}>{d.to}</span>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {isCleared ? (
          <motion.div
            key="cleared"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, type: "spring", bounce: 0.4 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: COLORS.tealDeep, fontSize: 13, fontWeight: 700 }}>
              <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.3, type: "spring", bounce: 0.6 }} style={{ display: "flex" }}>
                <Check size={14} />
              </motion.span>
              Cleared
            </span>
            <button onClick={onToggle} style={{ background: "transparent", border: "none", color: "#4C5570", fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: FONT.sans }}>
              undo
            </button>
          </motion.div>
        ) : (
          <motion.div key="not-cleared" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
            <Button variant="outline" onClick={onToggle}>
              Mark cleared
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Event detail
// ---------------------------------------------------------------------------
function EventDetail({ event, onBack, onUpdate }) {
  const [showAddExpense, setShowAddExpense] = useState(false);

  const balances = useMemo(() => computeBalances(event), [event]);
  const debts = useMemo(() => simplifyDebts(balances), [balances]);

  const debtKey = (d) => `${d.from}__${d.to}`;

  const addExpense = (exp) => {
    onUpdate({ ...event, expenses: [...event.expenses, { ...exp, id: uid() }] });
    setShowAddExpense(false);
  };

  const removeExpense = (id) => {
    onUpdate({ ...event, expenses: event.expenses.filter((e) => e.id !== id) });
  };

  const toggleCleared = (key) => {
    const cleared = { ...(event.cleared || {}) };
    cleared[key] = !cleared[key];
    onUpdate({ ...event, cleared });
  };

  const totalSpent = event.expenses.reduce((s, e) => s + e.amount, 0);
  const cat = categoryOf(event.category);

  return (
    <div style={{ position: "relative" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -20,
          right: -40,
          width: 280,
          height: 280,
          background: cat.soft,
          opacity: 0.8,
          clipPath: "polygon(100% 0, 100% 100%, 20% 0)",
          pointerEvents: "none",
        }}
      />
      <div aria-hidden style={{ position: "absolute", top: 60, right: 30, fontSize: 130, opacity: 0.15, pointerEvents: "none" }}>
        {cat.icon}
      </div>

      <motion.button
        onClick={onBack}
        whileHover={{ x: -3 }}
        whileTap={TAP_FEEDBACK}
        transition={FEEDBACK_TRANSITION}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          color: COLORS.muted,
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 26,
          padding: 0,
          fontFamily: FONT.sans,
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={15} /> All events
      </motion.button>

      <div style={{ position: "relative", fontSize: 11.5, fontWeight: 700, color: cat.deep, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        {cat.icon} {event.category}
      </div>
      <div style={{ position: "relative", fontSize: 32, fontWeight: 700, color: COLORS.ink, fontFamily: FONT.serif, lineHeight: 1.08, marginBottom: 18, maxWidth: 440 }}>
        {event.name}
      </div>

      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex" }}>
            {event.participants.slice(0, 6).map((p, i) => (
              <div key={p} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <InitialAvatar name={p} size={30} />
              </div>
            ))}
          </div>
          <span style={{ fontSize: 12.5, color: COLORS.muted, marginLeft: 10 }}>{event.participants.length} people</span>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Total spent</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 44, fontWeight: 800, color: cat.main, lineHeight: 1 }}>
            <AnimatedNumber value={totalSpent} />
          </div>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.inkSoft, textTransform: "uppercase", letterSpacing: "0.09em" }}>Payments</div>
          <div style={{ fontSize: 12, color: COLORS.mutedLight }}>{event.expenses.length} logged</div>
        </div>

        {event.expenses.length === 0 ? (
          <div style={{ padding: "22px 4px", color: cat.deep, fontSize: 13, borderTop: `2px dashed ${cat.main}55` }}>
            No payments logged yet — add the first one below.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {event.expenses.map((exp, idx) => (
              <ExpenseStrip key={exp.id} exp={exp} category={event.category} index={idx} onRemove={removeExpense} />
            ))}
          </AnimatePresence>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {showAddExpense ? (
            <NewExpenseForm key="new-expense-form" participants={event.participants} onAdd={addExpense} category={event.category} />
          ) : (
            <motion.button
              key="add-payment-button"
              onClick={() => setShowAddExpense(true)}
              whileHover={{ x: 4 }}
              whileTap={TAP_FEEDBACK}
              transition={FEEDBACK_TRANSITION}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                color: cat.deep,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                padding: "16px 4px 4px",
                fontFamily: FONT.sans,
              }}
            >
              <Plus size={16} /> Add a payment
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.inkSoft, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 6 }}>Who owes whom</div>

        {debts.length === 0 ? (
          <div style={{ padding: "22px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.tealDeep }}>Everyone's even</div>
            <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 2 }}>No payments are needed right now.</div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {debts.map((d, idx) => {
              const key = debtKey(d);
              const isCleared = !!(event.cleared || {})[key];
              return <DebtDiagram key={key} d={d} isCleared={isCleared} onToggle={() => toggleCleared(key)} isLast={idx === debts.length - 1} />;
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root app
// ---------------------------------------------------------------------------
export default function SplitwiseMini() {
  const [events, setEvents] = useState([]);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [openEventId, setOpenEventId] = useState(null);

  const createEvent = ({ name, category, participants }) => {
    setEvents([...events, { id: uid(), name, category, participants, expenses: [], cleared: {} }]);
    setShowNewEvent(false);
  };

  const updateEvent = (updated) => {
    setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
  };

  const openEvent = events.find((e) => e.id === openEventId);

  // Presentational-only ordering (newest first) — does not mutate state.
  const ordered = [...events].reverse();

  return (
    <div
      className="ledger-shell"
      style={{
        position: "relative",
        minHeight: "100vh",
        background: COLORS.cream,
        fontFamily: FONT.sans,
        padding: "24px 28px 60px",
      }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .ledger-input:focus {
          border-color: ${COLORS.blue} !important;
          box-shadow: 0 0 0 4px rgba(58,111,240,0.14);
        }
        .ledger-input::placeholder { color: ${COLORS.mutedLight}; }
        .ledger-hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: center; }
        .ledger-events-field { display: flex; flex-wrap: wrap; gap: 6px 30px; align-items: flex-start; }
        @media (max-width: 860px) {
          .ledger-hero-grid { grid-template-columns: 1fr !important; }
          .ledger-hero-art { height: 280px !important; transform: scale(0.85); transform-origin: top left; }
        }
        @media (max-width: 720px) {
          .ledger-shell { padding: 18px 16px 46px !important; }
          .ledger-events-field { gap: 0 20px; }
        }
      `}</style>

      <GlobalBackdrop />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 920, margin: "0 auto" }}>
        <AnimatePresence mode="wait" initial={false}>
          {!openEvent ? (
            <motion.div key="home" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: "easeOut" }}>
              {/* Brand mark */}
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}
              >
                <LogoMark />
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, textTransform: "uppercase", letterSpacing: "0.16em" }}>Ledger</span>
              </motion.div>

              {/* Hero: headline left / illustration right, two-column */}
              <div className="ledger-hero-grid" style={{ marginBottom: 26 }}>
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.05 }}
                    style={{ fontSize: 44, fontWeight: 700, color: COLORS.navy, fontFamily: FONT.serif, lineHeight: 1.05, marginBottom: 14 }}
                  >
                    Split the bill,
                    <br />
                    not the friendship.
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.12 }}
                    style={{ fontSize: 15, color: COLORS.muted, maxWidth: 340, lineHeight: 1.55, marginBottom: 20 }}
                  >
                    Add an event, log what everyone paid — Ledger works out who owes whom.
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}>
                    <Button variant="primary" onClick={() => setShowNewEvent(true)}>
                      <Plus size={15} style={{ marginRight: 6 }} />
                      New event
                    </Button>
                  </motion.div>
                </div>

                <HeroIllustration />
              </div>

              <AnimatePresence initial={false}>
                {showNewEvent && <NewEventForm key="new-event-form" onCreate={createEvent} onCancel={() => setShowNewEvent(false)} />}
              </AnimatePresence>

              {ordered.length === 0 ? (
                <EmptyIllustration onCreate={() => setShowNewEvent(true)} />
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.mutedLight, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                      Your events
                    </span>
                    <span style={{ flex: 1, height: 1, background: COLORS.creamDeep }} />
                  </motion.div>

                  {ordered.length === 1 ? (
                    <FeaturedEventObject event={ordered[0]} onOpen={() => setOpenEventId(ordered[0].id)} />
                  ) : (
                    <div className="ledger-events-field">
                      <AnimatePresence initial={false}>
                        {ordered.map((event, idx) => {
                          const pattern = SCATTER_PATTERN[idx % SCATTER_PATTERN.length];
                          return (
                            <EventObject
                              key={event.id}
                              event={event}
                              weight={pattern.weight}
                              rotate={pattern.rotate}
                              lift={pattern.lift}
                              onOpen={() => setOpenEventId(event.id)}
                            />
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="detail" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: "easeOut" }}>
              <EventDetail event={openEvent} onBack={() => setOpenEventId(null)} onUpdate={updateEvent} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}