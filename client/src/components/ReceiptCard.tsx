/** Room of Evidence design: a receipt should feel inspectable, calm, and more like a document than a dashboard card. */
import {
  CheckCircle2,
  Copy,
  FileKey2,
  ShieldAlert,
  TerminalSquare,
} from "lucide-react";
import { toast } from "sonner";
import type { Receipt } from "../../../packages/core/src/index";

type ReceiptCardProps = { receipt: Receipt; integrity: "verified" | "demo" };
function fingerprint(value: string): string {
  return value.length > 26
    ? `${value.slice(0, 13)}…${value.slice(-11)}`
    : value;
}

export default function ReceiptCard({ receipt, integrity }: ReceiptCardProps) {
  const successful = receipt.payload.status === "passed";
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };
  return (
    <section
      className="receipt-card group relative overflow-hidden"
      aria-label="AttestKit receipt preview"
    >
      <div className="receipt-card__rail" />
      <div className="relative z-10 p-6 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#D8D1C5] pb-5">
          <div>
            <p className="eyebrow">ATTESTKIT / RECEIPT</p>
            <h2 className="mt-1 font-display text-[1.65rem] leading-none text-[#10233A]">
              Verification record
            </h2>
          </div>
          <div
            className={`seal ${integrity === "verified" ? "seal--verified" : "seal--demo"}`}
            aria-label={
              integrity === "verified"
                ? "Integrity verified"
                : "Demonstration receipt"
            }
          >
            {integrity === "verified" ? (
              <CheckCircle2 size={18} />
            ) : (
              <FileKey2 size={18} />
            )}
          </div>
        </div>
        <div className="space-y-5">
          <div className="receipt-row">
            <span>STATUS</span>
            <strong
              className={successful ? "text-[#16876A]" : "text-[#AF553C]"}
            >
              {receipt.payload.status.toUpperCase()}
            </strong>
          </div>
          <div className="receipt-row receipt-row--stack">
            <span>COMMAND</span>
            <button
              onClick={() =>
                void copy(receipt.payload.command.argv.join(" "), "Command")
              }
              className="code-token text-left"
              title="Copy command"
            >
              <TerminalSquare size={14} />{" "}
              {receipt.payload.command.argv.join(" ")} <Copy size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 border-y border-[#E7E0D5] py-5">
            <div>
              <span className="receipt-label">SOURCE</span>
              <p className="mt-1 font-mono text-xs text-[#27405B]">
                {receipt.payload.source.head ?? "unavailable"}
              </p>
            </div>
            <div>
              <span className="receipt-label">DURATION</span>
              <p className="mt-1 font-mono text-xs text-[#27405B]">
                {(receipt.payload.command.durationMs / 1000).toFixed(2)}s
              </p>
            </div>
          </div>
          <div className="receipt-row receipt-row--stack">
            <span>PAYLOAD SHA-256</span>
            <button
              onClick={() =>
                void copy(receipt.integrity.payloadSha256, "Digest")
              }
              className="fingerprint"
              title="Copy payload digest"
            >
              <span>{fingerprint(receipt.integrity.payloadSha256)}</span>
              <Copy size={12} />
            </button>
          </div>
          <div className="rounded-sm bg-[#F1EEE7] px-4 py-3 text-xs leading-relaxed text-[#536273]">
            {integrity === "verified" ? (
              <CheckCircle2 className="mr-2 inline text-[#16876A]" size={14} />
            ) : (
              <ShieldAlert className="mr-2 inline text-[#8A6A29]" size={14} />
            )}
            {integrity === "verified"
              ? "The manifest hash was checked in this browser. Artifact paths remain local evidence."
              : "A shaped example. Load a real receipt to verify its manifest in this browser."}
          </div>
        </div>
      </div>
    </section>
  );
}
