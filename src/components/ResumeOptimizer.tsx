import { useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";

const MCGILL_RED = "#ED1B2F";

interface BreakdownScore {
  keyword_match: number;
  impact: number;
  ats_format: number;
  relevance: number;
}

interface ImprovedBullet {
  original: string;
  improved: string;
}

interface AnalysisResult {
  overall_score: number;
  breakdown: BreakdownScore;
  missing_keywords: string[];
  improved_bullets: ImprovedBullet[];
  top_suggestions: string[];
}

const BREAKDOWN_LABELS: Record<keyof BreakdownScore, string> = {
  keyword_match: "Keyword Match",
  impact: "Impact & Results",
  ats_format: "ATS Format",
  relevance: "Role Relevance",
};

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 75 ? "#22C55E" : score >= 50 ? "#F59E0B" : MCGILL_RED;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="112" height="112" className="-rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#F1F1F3" strokeWidth="10" />
        <circle
          cx="56" cy="56" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-extrabold text-black leading-none">{score}</div>
        <div className="text-[10px] font-semibold text-black/40 mt-0.5">/ 100</div>
      </div>
    </div>
  );
}

function CategoryBar({ label, score }: { label: string; score: number }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-black/70">{label}</span>
        <span className="font-bold text-black">{score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-black/8">
        <div
          className={`h-1.5 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function ResumeOptimizer() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedBullet, setExpandedBullet] = useState<number | null>(null);

  async function handleAnalyze() {
    if (!resumeText.trim() || !jobDescription.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedBullet(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-resume", {
        body: { resumeText, jobDescription },
      });

      if (fnError) throw new Error(fnError.message ?? "Analysis failed");
      if (data?.error) throw new Error(data.error);
      setResult(data as AnalysisResult);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 pb-8">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Inputs */}
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-bold text-black mb-3">Paste your resume</h2>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your full resume text here..."
            rows={8}
            className="w-full resize-none rounded-xl border border-black/10 bg-[#F6F7F9] px-3 py-2.5 text-sm text-black outline-none placeholder:text-black/30 focus:border-black/20 focus:bg-white transition"
          />
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-bold text-black mb-3">Paste the job description</h2>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job posting here..."
            rows={6}
            className="w-full resize-none rounded-xl border border-black/10 bg-[#F6F7F9] px-3 py-2.5 text-sm text-black outline-none placeholder:text-black/30 focus:border-black/20 focus:bg-white transition"
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !resumeText.trim() || !jobDescription.trim()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: MCGILL_RED }}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Analyze Resume
            </>
          )}
        </button>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">

            {/* Score + breakdown */}
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-5">
                <ScoreRing score={result.overall_score} />
                <div className="flex-1 space-y-3">
                  <p className="text-sm font-bold text-black">Overall ATS Score</p>
                  {(Object.keys(result.breakdown) as (keyof BreakdownScore)[]).map((key) => (
                    <CategoryBar key={key} label={BREAKDOWN_LABELS[key]} score={result.breakdown[key]} />
                  ))}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            {result.top_suggestions?.length > 0 && (
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
                <h3 className="text-sm font-bold text-black mb-3">Top suggestions</h3>
                <div className="space-y-2">
                  {result.top_suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-black/70">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing keywords */}
            {result.missing_keywords?.length > 0 && (
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
                <h3 className="text-sm font-bold text-black mb-3">Missing keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {result.missing_keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-black/40">Add these naturally to your resume where they apply.</p>
              </div>
            )}

            {/* Improved bullets */}
            {result.improved_bullets?.length > 0 && (
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
                <h3 className="text-sm font-bold text-black mb-3">Stronger bullet points</h3>
                <div className="space-y-3">
                  {result.improved_bullets.map((b, i) => (
                    <div key={i} className="rounded-xl border border-black/8 overflow-hidden">
                      <button
                        onClick={() => setExpandedBullet(expandedBullet === i ? null : i)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-black/[0.02] transition"
                      >
                        <span className="text-xs text-black/50 line-clamp-1 flex-1">{b.original}</span>
                        {expandedBullet === i
                          ? <ChevronUp className="h-4 w-4 shrink-0 text-black/30" />
                          : <ChevronDown className="h-4 w-4 shrink-0 text-black/30" />
                        }
                      </button>
                      {expandedBullet === i && (
                        <div className="border-t border-black/8 px-4 py-3 space-y-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-black/30 mb-1">Before</p>
                            <p className="text-sm text-black/55">{b.original}</p>
                          </div>
                          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">After</p>
                            </div>
                            <p className="text-sm text-emerald-800">{b.improved}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
