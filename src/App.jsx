import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";
import { Plus, X, Check, Receipt, Users, ChevronRight, ArrowLeft, Trash2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens (ledger / receipt aesthetic)
// ---------------------------------------------------------------------------
const INK = "#16302B";
const PAPER = "#EEF0EA";
const CARD = "#F8F8F3";
const LINE = "#D8D9CE";
const GOLD = "#B98A2E";
const OWES = "#A44A34";
const OWED = "#2F6F5E";
const MUTED = "#6B7266";

const CATEGORY_ICON = { Dinner: "🍽", Hotel: "🏨", Trip: "🧳", Other: "📌" };
const CATEGORIES = ["Dinner", "Hotel", "Trip", "Other"];

const fmt = (n) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: n % 1 === 0 ? 0 : 2 })}`;
const uid = () => Math.random().toString(36).slice(2, 10);

const TAP_FEEDBACK = { scale: 0.95};
const HOVER_FEEDBACK = { scale: 1.03,y:-2 };
const FEEDBACK_TRANSITION = { duration: 0.15, ease: "easeOut" };

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
// Debt simplification — greedy min-cash-flow
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
// Small building blocks
// ---------------------------------------------------------------------------
function IconButton({ onClick, children, title, danger }) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileHover={HOVER_FEEDBACK}
      whileTap={TAP_FEEDBACK}
      transition={FEEDBACK_TRANSITION}
      style={{
        border: `1px solid ${danger ? OWES : LINE}`,
        background: "transparent",
        color: danger ? OWES : INK,
        borderRadius: 6,
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

function PrimaryButton({ onClick, children, style, disabled }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? HOVER_FEEDBACK : undefined}
      whileTap={!disabled ? TAP_FEEDBACK : undefined}
      transition={FEEDBACK_TRANSITION}
      style={{
        background: disabled ? "#C7C9BC" : INK,
        color: PAPER,
        border: "none",
        borderRadius: 6,
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'IBM Plex Sans', sans-serif",
        ...style,
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
      style={{
        border: `1px solid ${LINE}`,
        borderRadius: 6,
        padding: "9px 11px",
        fontSize: 14,
        fontFamily: "'IBM Plex Sans', sans-serif",
        background: "#fff",
        color: INK,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        ...props.style,
      }}
    />
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

  return (
    <motion.div
  initial={{ opacity: 0, scale: 0.92, y: -20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.92, y: 20 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        background: CARD,
        border: `1px solid ${LINE}`,
        borderRadius: 8,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 14, fontFamily: "'Fraunces', serif" }}>
        New event
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <TextInput
          placeholder="Event name — e.g. Goa Trip"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {CATEGORIES.map((c) => (
          <motion.button
            key={c}
            onClick={() => setCategory(c)}
            whileHover={HOVER_FEEDBACK}
            whileTap={TAP_FEEDBACK}
            transition={FEEDBACK_TRANSITION}
            style={{
              border: `1px solid ${category === c ? INK : LINE}`,
              background: category === c ? INK : "transparent",
              color: category === c ? PAPER : INK,
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {CATEGORY_ICON[c]} {c}
          </motion.button>
        ))}
      </div>

      <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>Participants (add at least 2)</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <TextInput
          placeholder="Name, then press Add"
          value={participantInput}
          onChange={(e) => setParticipantInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addParticipant()}
        />
        <PrimaryButton onClick={addParticipant} style={{ whiteSpace: "nowrap" }}>
          Add
        </PrimaryButton>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {participants.map((p) => (
          <span
            key={p}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#fff",
              border: `1px solid ${LINE}`,
              borderRadius: 20,
              padding: "5px 10px",
              fontSize: 13,
              color: INK,
            }}
          >
            {p}
            <X
              size={13}
              style={{ cursor: "pointer", color: MUTED }}
              onClick={() => setParticipants(participants.filter((x) => x !== p))}
            />
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <PrimaryButton
          disabled={!canCreate}
          onClick={() => canCreate && onCreate({ name: name.trim(), category, participants })}
        >
          Create event
        </PrimaryButton>
        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            color: MUTED,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Expense add form
// ---------------------------------------------------------------------------
function NewExpenseForm({ participants, onAdd }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(participants[0] || "");
  const [splitAmong, setSplitAmong] = useState(participants);

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
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: 18, marginBottom: 20 }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12, fontFamily: "'Fraunces', serif" }}>
        Add a payment
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: 160 }}>
          <TextInput placeholder="What was it for?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <TextInput
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>
      </div>

      <div style={{ fontSize: 13, color: MUTED, marginBottom: 6 }}>Paid by</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {participants.map((p) => (
          <motion.button
            key={p}
            onClick={() => setPaidBy(p)}
            whileHover={HOVER_FEEDBACK}
            whileTap={TAP_FEEDBACK}
            transition={FEEDBACK_TRANSITION}
            style={{
              border: `1px solid ${paidBy === p ? GOLD : LINE}`,
              background: paidBy === p ? "#FBF2DE" : "#fff",
              color: INK,
              borderRadius: 20,
              padding: "5px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {p}
          </motion.button>
        ))}
      </div>

      <div style={{ fontSize: 13, color: MUTED, marginBottom: 6 }}>Split among</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {participants.map((p) => (
          <motion.button
            key={p}
            onClick={() => toggle(p)}
            whileHover={HOVER_FEEDBACK}
            whileTap={TAP_FEEDBACK}
            transition={FEEDBACK_TRANSITION}
            style={{
              border: `1px solid ${splitAmong.includes(p) ? OWED : LINE}`,
              background: splitAmong.includes(p) ? "#E9F2EE" : "#fff",
              color: INK,
              borderRadius: 20,
              padding: "5px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {p}
          </motion.button>
        ))}
      </div>

      <PrimaryButton onClick={submit} disabled={!canAdd}>
        <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
        Add payment
      </PrimaryButton>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Event detail view
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

  return (
    <div>
      <motion.button
        onClick={onBack}
        whileHover={HOVER_FEEDBACK}
        whileTap={TAP_FEEDBACK}
        transition={FEEDBACK_TRANSITION}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          color: MUTED,
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 16,
          padding: 0,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        <ArrowLeft size={15} /> All events
      </motion.button>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: INK, fontFamily: "'Fraunces', serif" }}>
          {CATEGORY_ICON[event.category]} {event.name}
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
          {event.participants.length} people · total spent <AnimatedNumber value={totalSpent} />
        </div>
      </div>

      <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, marginBottom: 20 }}>
        <div
          style={{
            padding: "12px 18px",
            borderBottom: `1px solid ${LINE}`,
            fontSize: 13,
            color: MUTED,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Payments logged</span>
          <span>{event.expenses.length}</span>
        </div>
        {event.expenses.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 13 }}>
            No payments yet — add the first one below.
          </div>
        )}
        <AnimatePresence initial={false}>
          {event.expenses.map((exp, idx) => (
            <motion.div
              key={exp.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 18px",
                  borderBottom: idx < event.expenses.length - 1 ? `1px dashed ${LINE}` : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, color: INK, fontWeight: 500 }}>{exp.description}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                    {exp.paidBy} paid · split among {exp.splitAmong.length}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: GOLD, fontSize: 14 }}>{fmt(exp.amount)}</div>
                  <IconButton title="Remove" danger onClick={() => removeExpense(exp.id)}>
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {showAddExpense ? (
          <NewExpenseForm key="new-expense-form" participants={event.participants} onAdd={addExpense} />
        ) : (
          <motion.button
            key="add-payment-button"
            onClick={() => setShowAddExpense(true)}
            whileHover={HOVER_FEEDBACK}
            whileTap={TAP_FEEDBACK}
            transition={FEEDBACK_TRANSITION}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: `1px dashed ${LINE}`,
              borderRadius: 8,
              padding: "12px 16px",
              color: INK,
              fontSize: 14,
              cursor: "pointer",
              width: "100%",
              marginBottom: 24,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            <Plus size={16} /> Add a payment
          </motion.button>
        )}
      </AnimatePresence>

      <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 12, fontFamily: "'Fraunces', serif" }}>
        Who owes whom
      </div>

      {debts.length === 0 && (
        <div style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>
          Everyone's even — no payments needed.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
        <AnimatePresence initial={false}>
          {debts.map((d) => {
            const key = debtKey(d);
            const isCleared = !!(event.cleared || {})[key];
            return (
              <motion.div
                key={key}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{
                  background: CARD,
                  border: `1px solid ${isCleared ? "#CFE0D8" : LINE}`,
                  borderRadius: 8,
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: isCleared ? 0.7 : 1,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, color: INK }}>
                    <span style={{ fontWeight: 600, color: OWES }}>{d.from}</span> owes{" "}
                    <span style={{ fontWeight: 600, color: OWED }}>{d.to}</span>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, color: GOLD, marginTop: 4 }}>
                    <AnimatedNumber value={d.amount} />
                  </div>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  {isCleared ? (
                    <motion.div
                      key="cleared"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 5, color: OWED, fontSize: 13, fontWeight: 600 }}>
                        <Check size={15} /> Payment cleared
                      </span>
                      <motion.button
                        onClick={() => toggleCleared(key)}
                        whileHover={HOVER_FEEDBACK}
                        whileTap={TAP_FEEDBACK}
                        transition={FEEDBACK_TRANSITION}
                        style={{ background: "transparent", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                      >
                        undo
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="not-cleared"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      style={{ display: "flex", gap: 8 }}
                    >
                      <motion.button
                        onClick={() => toggleCleared(key)}
                        whileHover={HOVER_FEEDBACK}
                        whileTap={TAP_FEEDBACK}
                        transition={FEEDBACK_TRANSITION}
                        style={{
                          border: `1px solid ${OWED}`,
                          background: "#fff",
                          color: OWED,
                          borderRadius: 6,
                          padding: "7px 14px",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Cleared
                      </motion.button>
                      <button
                        disabled
                        style={{
                          border: `1px solid ${LINE}`,
                          background: "#fff",
                          color: MUTED,
                          borderRadius: 6,
                          padding: "7px 14px",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "default",
                        }}
                      >
                        Not cleared
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event list (home)
// ---------------------------------------------------------------------------
function EventCard({ event, onOpen }) {
  const balances = useMemo(() => computeBalances(event), [event]);
  const debts = useMemo(() => simplifyDebts(balances), [balances]);
  const pending = debts.filter((d) => !(event.cleared || {})[`${d.from}__${d.to}`]).length;
  const total = event.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <motion.div
      onClick={onOpen}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={FEEDBACK_TRANSITION}
      style={{
        background: CARD,
        border: `1px solid ${LINE}`,
        borderRadius: 8,
        padding: "16px 18px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 15, color: INK, fontWeight: 600, fontFamily: "'Fraunces', serif" }}>
          {CATEGORY_ICON[event.category]} {event.name}
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4, display: "flex", gap: 12 }}>
          <span>
            <Users size={12} style={{ verticalAlign: -2 }} /> {event.participants.length}
          </span>
          <span>
            <Receipt size={12} style={{ verticalAlign: -2 }} /> {event.expenses.length} payments
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            <AnimatedNumber value={total} />
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {debts.length === 0 ? (
          <span style={{ fontSize: 12, color: OWED }}>Settled</span>
        ) : pending === 0 ? (
          <span style={{ fontSize: 12, color: OWED }}>All cleared</span>
        ) : (
          <span style={{ fontSize: 12, color: OWES }}>
            {pending} pending
          </span>
        )}
        <ChevronRight size={16} color={MUTED} />
      </div>
    </motion.div>
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
    setEvents([
      ...events,
      { id: uid(), name, category, participants, expenses: [], cleared: {} },
    ]);
    setShowNewEvent(false);
  };

  const updateEvent = (updated) => {
    setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
  };

  const openEvent = events.find((e) => e.id === openEventId);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAPER,
        fontFamily: "'IBM Plex Sans', sans-serif",
        padding: "32px 20px",
      }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      `}</style>

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {!openEvent && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 600, color: INK, fontFamily: "'Fraunces', serif" }}>
                  Ledger
                </div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
                  Track shared expenses, event by event.
                </div>
              </div>
              {!showNewEvent && (
                <PrimaryButton onClick={() => setShowNewEvent(true)}>
                  <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                  New event
                </PrimaryButton>
              )}
            </div>

            <AnimatePresence initial={false}>
              {showNewEvent && (
                <NewEventForm key="new-event-form" onCreate={createEvent} onCancel={() => setShowNewEvent(false)} />
              )}
            </AnimatePresence>

            {events.length === 0 && !showNewEvent && (
              <div
                style={{
                  border: `1px dashed ${LINE}`,
                  borderRadius: 8,
                  padding: "40px 20px",
                  textAlign: "center",
                  color: MUTED,
                  fontSize: 14,
                }}
              >
                No events yet. Start with a dinner, a trip, or a hotel stay.
              </div>
            )}

            <AnimatePresence initial={false}>
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <EventCard event={event} onOpen={() => setOpenEventId(event.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}

        {openEvent && (
          <EventDetail event={openEvent} onBack={() => setOpenEventId(null)} onUpdate={updateEvent} />
        )}
      </div>
    </div>
  );
}