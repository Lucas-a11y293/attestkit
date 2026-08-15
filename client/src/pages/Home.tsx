/** Room of Evidence design: editorial documentary layout, warm paper surface, navy ink, seal-green verification, and no generic dashboard chrome. */
import { useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Github,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import ReceiptCard from "@/components/ReceiptCard";
import { demoReceipt, parseAndVerifyReceipt } from "../lib/receipt";
import type { Receipt } from "../../../packages/core/src/index";

const evidenceSteps = [
  {
    number: "01",
    title: "Capture the run",
    text: "Record an explicit argv command, bounded output, source state, and only the artifacts you name.",
  },
  {
    number: "02",
    title: "Seal the payload",
    text: "Canonical JSON and SHA-256 make the receipt legible to people and checkable by tools.",
  },
  {
    number: "03",
    title: "Review the boundary",
    text: "Verify without replaying a command. See what is known, redacted, absent, or still human judgment.",
  },
];

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [receipt, setReceipt] = useState<Receipt>(demoReceipt);
  const [integrity, setIntegrity] = useState<"verified" | "demo">("demo");
  const [fileName, setFileName] = useState("Built-in specimen");
  const loadReceipt = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await parseAndVerifyReceipt(file);
      setReceipt(parsed.receipt);
      setIntegrity("verified");
      setFileName(file.name);
      toast.success("Receipt loaded and integrity verified");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not validate this receipt"
      );
    }
  };
  const scrollToProtocol = () =>
    document.getElementById("protocol")?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F5F2EB] text-[#10233A]">
      <header className="border-b border-[#D8D1C5] bg-[#F5F2EB]/90 backdrop-blur-md">
        <div className="page-shell flex h-20 items-center justify-between">
          <a
            href="#top"
            className="brand-signature"
            aria-label="AttestKit home"
          >
            <span className="brand-seal">
              <img
                src="/manus-storage/attestkit-mark_a6f411c6.png"
                alt="AttestKit seal-and-hash symbol"
              />
              <small>SHA</small>
            </span>
            <span className="brand-lockup">
              <strong>AttestKit</strong>
              <em>seal · hash</em>
            </span>
          </a>
          <nav
            className="hidden items-center gap-7 text-sm font-semibold text-[#455A70] md:flex"
            aria-label="Main navigation"
          >
            <a className="nav-link" href="#protocol">
              Protocol
            </a>
            <a className="nav-link" href="#workflow">
              Workflow
            </a>
            <a className="nav-link" href="#boundaries">
              Boundaries
            </a>
          </nav>
          <a
            className="header-link"
            href="https://github.com/Lucas-a11y293/attestkit"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={16} /> Source <ArrowUpRight size={14} />
          </a>
        </div>
      </header>
      <main id="top">
        <section className="hero-grid page-shell relative grid gap-12 py-16 lg:grid-cols-[minmax(0,1.03fr)_minmax(420px,.97fr)] lg:py-24">
          <div className="relative z-10 max-w-2xl pt-3">
            <p className="eyebrow eyebrow--proof mb-7">
              EVIDENCE · LOCAL · VERIFIABLE
            </p>
            <h1 className="font-display text-5xl leading-[0.94] tracking-[-0.045em] text-[#10233A] sm:text-6xl lg:text-7xl">
              Don’t ask for trust.
              <br />
              <em className="text-[#16876A]">Attach</em> the proof.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#4D6074]">
              AttestKit creates compact execution receipts for software changes.
              Capture what ran, the source it ran against, selected artifacts,
              and the precise edge of what can be verified.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button
                className="primary-action"
                onClick={() => inputRef.current?.click()}
              >
                <Upload size={17} /> Inspect a receipt
              </button>
              <button className="secondary-action" onClick={scrollToProtocol}>
                Read the protocol <ChevronRight size={17} />
              </button>
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept="application/json,.json"
                onChange={event => void loadReceipt(event.target.files?.[0])}
              />
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-[#D8D1C5] pt-6 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-[#657789]">
              <span>SHA-256 integrity</span>
              <span>no telemetry</span>
              <span>no shell replay</span>
            </div>
          </div>
          <div className="relative min-h-[510px] lg:pt-1">
            <img
              src="/manus-storage/attestkit-hero_37aa234d.jpg"
              alt="Abstract AttestKit evidence workspace"
              className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-multiply"
            />
            <div className="relative mx-auto max-w-md pt-4 lg:pt-8">
              <ReceiptCard receipt={receipt} integrity={integrity} />
            </div>
            <p className="absolute -bottom-1 left-0 bg-[#F5F2EB] px-3 py-1 font-mono text-[0.68rem] tracking-wider text-[#617285]">
              LOADED: {fileName.toUpperCase()}
            </p>
          </div>
        </section>
        <section className="marquee-strip border-y border-[#10233A] bg-[#10233A] py-3 text-[#E8E1D6]">
          <div className="page-shell flex items-center justify-between gap-8 overflow-hidden font-mono text-[0.72rem] uppercase tracking-[0.16em]">
            <span>Command boundary</span>
            <span className="text-[#A6B1B8]">●</span>
            <span>Source context</span>
            <span className="text-[#A6B1B8]">●</span>
            <span>Artifact hashes</span>
            <span className="text-[#A6B1B8]">●</span>
            <span>Human judgment stays human</span>
          </div>
        </section>
        <section
          id="protocol"
          className="page-shell grid gap-12 py-24 lg:grid-cols-[.85fr_1.15fr]"
        >
          <div>
            <p className="eyebrow">THE RECEIPT PROTOCOL</p>
            <h2 className="mt-5 max-w-md font-display text-4xl leading-tight tracking-tight">
              A document of evidence, not a score.
            </h2>
            <p className="mt-6 max-w-md leading-7 text-[#536477]">
              AttestKit intentionally separates deterministic measurement from
              reviewer judgment. It tells you what exists and how to check it;
              it never pretends to decide whether a patch deserves to merge.
            </p>
            <a
              href="https://github.com/Lucas-a11y293/attestkit/blob/main/ARCHITECTURE.md"
              className="inline-link mt-8"
              target="_blank"
              rel="noreferrer"
            >
              Inspect the architecture <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="protocol-lines">
            {evidenceSteps.map(step => (
              <article key={step.number} className="protocol-line">
                <span className="font-mono text-xs text-[#16876A]">
                  {step.number}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                <ArrowDownRight className="protocol-arrow" size={20} />
              </article>
            ))}
          </div>
        </section>
        <section
          id="workflow"
          className="relative overflow-hidden bg-[#EAE4D9] py-24"
        >
          <div className="page-shell">
            <p className="section-file-tab">FILE 02 · RECEIPT TRANSIT</p>
            <div className="mt-9 grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
              <div className="relative order-2 lg:order-1">
                <img
                  className="w-full object-cover shadow-[0_24px_60px_rgba(16,35,58,.14)]"
                  src="/manus-storage/attestkit-evidence-stack_dab57a33.jpg"
                  alt="Layered conceptual execution evidence"
                />
                <div className="absolute -bottom-5 right-5 bg-[#10233A] px-5 py-4 font-mono text-xs text-[#EDE7DC] shadow-xl">
                  attestkit verify receipt.json
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <p className="eyebrow">A SMALLER REVIEW SURFACE</p>
                <h2 className="mt-5 font-display text-4xl leading-tight tracking-tight">
                  Evidence travels with the change.
                </h2>
                <p className="mt-6 leading-7 text-[#526376]">
                  The CLI produces one versioned receipt. CI can upload it as an
                  artifact. A reviewer can inspect it locally or in this static
                  verifier without executing a contributor’s command.
                </p>
                <div className="mt-8 space-y-3">
                  {[
                    "Explicit argv, never a shell string",
                    "Canonical payload digest",
                    "Bounded output and redaction before persistence",
                    "Artifact hashing without source uploads",
                  ].map(item => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm font-semibold"
                    >
                      <Check className="text-[#10233A]" size={18} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        <section
          id="boundaries"
          className="page-shell grid gap-12 py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-start"
        >
          <div>
            <p className="eyebrow">WHAT IT DOES / DOES NOT DO</p>
            <div className="evidence-ledger mt-7">
              <article className="ledger-entry ledger-entry--verified">
                <div className="ledger-meta">
                  <span>AK-01 / INTEGRITY</span>
                  <span>MEASURED</span>
                </div>
                <h3 className="mt-7 font-display text-2xl">
                  It verifies structure.
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#5B6C7D]">
                  Hash integrity, artifact consistency, path safety, and policy
                  requirements are deterministic checks.
                </p>
                <p className="ledger-note">
                  payload hash · artifact map · path boundary
                </p>
              </article>
              <article className="ledger-entry ledger-entry--verified">
                <div className="ledger-meta">
                  <span>AK-02 / CONTEXT</span>
                  <span>RECORDED</span>
                </div>
                <h3 className="mt-7 font-display text-2xl">
                  It preserves context.
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#5B6C7D]">
                  Revision, workspace condition, command argv, bounded outputs,
                  and redaction counts remain visible.
                </p>
                <p className="ledger-note">
                  revision · argv · truncation · redaction
                </p>
              </article>
              <article className="ledger-entry">
                <div className="ledger-meta">
                  <span>AK-03 / BOUNDARY</span>
                  <span>NOT A VERDICT</span>
                </div>
                <h3 className="mt-7 font-display text-2xl">
                  It does not approve code.
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#5B6C7D]">
                  A valid receipt is evidence of a run, not proof of semantic
                  correctness, security, or intent.
                </p>
                <p className="ledger-note">review decision remains human</p>
              </article>
              <article className="ledger-entry">
                <div className="ledger-meta">
                  <span>AK-04 / REPLAY</span>
                  <span>REFUSED</span>
                </div>
                <h3 className="mt-7 font-display text-2xl">
                  It does not replay untrusted work.
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#5B6C7D]">
                  Inspection and verification are non-executing paths. Replay
                  remains outside the MVP boundary.
                </p>
                <p className="ledger-note">
                  inspect · hash · compare — no replay
                </p>
              </article>
            </div>
          </div>
          <img
            className="mt-6 w-full object-cover shadow-[0_24px_60px_rgba(16,35,58,.12)] lg:mt-12"
            src="/manus-storage/attestkit-protocol-map_130159f0.jpg"
            alt="Abstract tamper-evident evidence chain"
          />
        </section>
      </main>
      <footer className="border-t border-[#D8D1C5] bg-[#F5F2EB] py-8">
        <div className="page-shell flex flex-col justify-between gap-5 text-sm text-[#607285] sm:flex-row sm:items-center">
          <span className="font-mono text-[0.7rem] uppercase tracking-[.14em]">
            AttestKit · evidence-first delivery
          </span>
          <span>Local-first. Deterministic. Human-reviewed.</span>
        </div>
      </footer>
    </div>
  );
}
