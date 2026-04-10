"use client";

import { useState, useCallback } from "react";
import {
  submitNews,
  verifyNews,
  getNews,
  getNewsCount,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-.55.45-1 1-1h3l3 3h6a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function VerifyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Status Config ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; variant: "success" | "warning" | "info" }> = {
  pending: { color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10", border: "border-[#fbbf24]/20", dot: "bg-[#fbbf24]", variant: "warning" },
  verified: { color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", dot: "bg-[#34d399]", variant: "success" },
  rejected: { color: "text-[#f87171]", bg: "bg-[#f87171]/10", border: "border-[#f87171]/20", dot: "bg-[#f87171]", variant: "info" },
};

// ── Main Component ───────────────────────────────────────────

type Tab = "browse" | "submit" | "verify";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

interface NewsData {
  headline: string;
  source: string;
  content_hash: string;
  status: string;
  submitter: string;
  verifier: string | null;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Submit state
  const [headline, setHeadline] = useState("");
  const [source, setSource] = useState("");
  const [contentHash, setContentHash] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verify state
  const [verifyId, setVerifyId] = useState("");
  const [verifyStatus, setVerifyStatus] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Browse state
  const [browseId, setBrowseId] = useState("");
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [newsCount, setNewsCount] = useState<number>(0);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const loadNewsCount = useCallback(async () => {
    try {
      const count = await getNewsCount();
      setNewsCount(Number(count) || 0);
    } catch {
      // ignore
    }
  }, []);

  const handleSubmitNews = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!headline.trim() || !source.trim() || !contentHash.trim()) return setError("Fill in all fields");
    setError(null);
    setIsSubmitting(true);
    setTxStatus("Awaiting signature...");
    try {
      await submitNews(walletAddress, headline.trim(), source.trim(), contentHash.trim());
      setTxStatus("News submitted for verification!");
      setHeadline("");
      setSource("");
      setContentHash("");
      await loadNewsCount();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [walletAddress, headline, source, contentHash, loadNewsCount]);

  const handleVerifyNews = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!verifyId.trim() || !verifyStatus.trim()) return setError("Fill in all fields");
    const newsId = parseInt(verifyId.trim(), 10);
    if (isNaN(newsId)) return setError("Invalid news ID");
    setError(null);
    setIsVerifying(true);
    setTxStatus("Awaiting signature...");
    try {
      await verifyNews(walletAddress, newsId, verifyStatus.trim());
      setTxStatus("News verified on-chain!");
      setVerifyId("");
      setVerifyStatus("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsVerifying(false);
    }
  }, [walletAddress, verifyId, verifyStatus]);

  const handleBrowseNews = useCallback(async () => {
    if (!browseId.trim()) return setError("Enter a news ID");
    const newsId = parseInt(browseId.trim(), 10);
    if (isNaN(newsId)) return setError("Invalid news ID");
    setError(null);
    setIsBrowsing(true);
    setNewsData(null);
    try {
      const result = await getNews(newsId);
      if (result && typeof result === "object") {
        const mapped: NewsData = {
          headline: String((result as Record<string, unknown>).headline || ""),
          source: String((result as Record<string, unknown>).source || ""),
          content_hash: String((result as Record<string, unknown>).content_hash || ""),
          status: String((result as Record<string, unknown>).status || ""),
          submitter: String((result as Record<string, unknown>).submitter || ""),
          verifier: (result as Record<string, unknown>).verifier ? String((result as Record<string, unknown>).verifier) : null,
        };
        setNewsData(mapped);
      } else {
        setError("News not found");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsBrowsing(false);
    }
  }, [browseId]);

  // Load news count on mount and tab change
  useState(() => {
    if (activeTab === "browse") {
      loadNewsCount();
    }
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "browse", label: "Browse", icon: <SearchIcon />, color: "#4fc3f7" },
    { key: "submit", label: "Submit", icon: <NewsIcon />, color: "#7c6cf0" },
    { key: "verify", label: "Verify", icon: <VerifyIcon />, color: "#34d399" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") || txStatus.includes("verified") || txStatus.includes("submitted") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#4fc3f7]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c6cf0]">
                  <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-.55.45-1 1-1h3l3 3h6a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">News Verifier</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setNewsData(null); if (t.key === "browse") loadNewsCount(); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Browse */}
            {activeTab === "browse" && (
              <div className="space-y-5">
                <MethodSignature name="get_news" params="(news_id: u32)" returns="-> News" color="#4fc3f7" />
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                  <p className="text-xs text-white/40">
                    Total news submitted: <span className="font-mono text-white/70">{newsCount}</span>
                  </p>
                </div>
                <Input label="News ID" value={browseId} onChange={(e) => setBrowseId(e.target.value)} placeholder="e.g. 0" />
                <ShimmerButton onClick={handleBrowseNews} disabled={isBrowsing} shimmerColor="#4fc3f7" className="w-full">
                  {isBrowsing ? <><SpinnerIcon /> Querying...</> : <><SearchIcon /> Get News</>}
                </ShimmerButton>

                {newsData && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">News Details</span>
                      {(() => {
                        const status = newsData.status || "Unknown";
                        const cfg = STATUS_CONFIG[status];
                        return cfg ? (
                          <Badge variant={cfg.variant}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                            {status}
                          </Badge>
                        ) : (
                          <Badge>{status}</Badge>
                        );
                      })()}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Headline</span>
                        <span className="font-mono text-sm text-white/80 max-w-[60%] text-right truncate">{newsData.headline}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Source</span>
                        <span className="font-mono text-sm text-white/80">{newsData.source}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Content Hash</span>
                        <span className="font-mono text-xs text-white/60 max-w-[50%] truncate">{newsData.content_hash}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Submitter</span>
                        <span className="font-mono text-xs text-white/60">{truncate(newsData.submitter)}</span>
                      </div>
                      {newsData.verifier && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/35">Verifier</span>
                          <span className="font-mono text-xs text-white/60">{truncate(newsData.verifier)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            {activeTab === "submit" && (
              <div className="space-y-5">
                <MethodSignature name="submit_news" params="(headline: String, source: String, content_hash: String)" color="#7c6cf0" />
                <Input label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Breaking: Major event happened" />
                <Input label="Source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Reuters, CNN, etc." />
                <Input label="Content Hash" value={contentHash} onChange={(e) => setContentHash(e.target.value)} placeholder="SHA-256 hash of content" />
                {walletAddress ? (
                  <ShimmerButton onClick={handleSubmitNews} disabled={isSubmitting} shimmerColor="#7c6cf0" className="w-full">
                    {isSubmitting ? <><SpinnerIcon /> Submitting...</> : <><NewsIcon /> Submit News</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to submit news
                  </button>
                )}
              </div>
            )}

            {/* Verify */}
            {activeTab === "verify" && (
              <div className="space-y-5">
                <MethodSignature name="verify_news" params="(news_id: u32, status: String)" color="#34d399" />
                <Input label="News ID" value={verifyId} onChange={(e) => setVerifyId(e.target.value)} placeholder="e.g. 0" />

                <div className="space-y-2">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">Verification Status</label>
                  <div className="flex gap-2">
                    {(["verified", "rejected"] as const).map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      const active = verifyStatus === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setVerifyStatus(s)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all active:scale-95",
                            active
                              ? `${cfg.border} ${cfg.bg} ${cfg.color}`
                              : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:text-white/55 hover:border-white/[0.1]"
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full transition-colors", active ? cfg.dot : "bg-white/20")} />
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#34d399]/30 focus-within:shadow-[0_0_20px_rgba(52,211,153,0.08)]">
                    <input
                      value={verifyStatus}
                      onChange={(e) => setVerifyStatus(e.target.value)}
                      placeholder="Or type a custom status..."
                      className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
                    />
                  </div>
                </div>

                {walletAddress ? (
                  <ShimmerButton onClick={handleVerifyNews} disabled={isVerifying} shimmerColor="#34d399" className="w-full">
                    {isVerifying ? <><SpinnerIcon /> Verifying...</> : <><VerifyIcon /> Verify News</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to verify news
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">News Verifier &middot; Soroban</p>
            <div className="flex items-center gap-2">
              {["pending", "verified", "rejected"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={cn("h-1 w-1 rounded-full", STATUS_CONFIG[s]?.dot ?? "bg-white/20")} />
                  <span className="font-mono text-[9px] text-white/15 capitalize">{s}</span>
                  {i < 2 && <span className="text-white/10 text-[8px]">&rarr;</span>}
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
