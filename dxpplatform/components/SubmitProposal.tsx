"use client";

import { CheckCircle, CheckCircle2, FileText, Users, Video } from "lucide-react";

interface ProposalSummary {
  status: string;
  ai_score: number | null;
  submitted_at: string;
  proposal_pdf_url: string | null;
}

interface SubmitProposalProps {
  proposal?: ProposalSummary | null;
  isOpen?: boolean;
  pdfUrl?: string;
  videoUrl?: string;
  submitting?: boolean;
  submitted?: boolean;
  onPdfUrlChange?: (value: string) => void;
  onVideoUrlChange?: (value: string) => void;
  onSubmit?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  selected: "Selected",
  confirmed: "Confirmed",
  rejected: "Not Selected",
  interview_scheduled: "Interview Scheduled",
  interviewed: "Interviewed",
};

export default function SubmitProposal({
  proposal,
  isOpen = true,
  pdfUrl = "",
  videoUrl = "",
  submitting = false,
  submitted = false,
  onPdfUrlChange,
  onVideoUrlChange,
  onSubmit,
}: SubmitProposalProps) {
  const hasApplied = Boolean(proposal);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6">
      <h2 className="text-[15px] font-medium text-gray-900 mb-1">
        {hasApplied ? "Your Proposal" : "Submit Your Proposal"}
      </h2>
      <p className="text-[13px] text-gray-500 mb-4">
        {hasApplied
          ? "Track the status of your submitted proposal."
          : "Ready to apply? Submit your proposal with a PDF document and pitch video."}
      </p>

      {hasApplied && proposal ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-[12px] font-medium text-indigo-700">
              {STATUS_LABELS[proposal.status] ?? proposal.status}
            </span>
            {proposal.ai_score !== null && (
              <span className="text-[12px] text-gray-500">
                AI Score: <span className="font-medium text-gray-900">{proposal.ai_score}/100</span>
              </span>
            )}
          </div>

          <p className="text-[13px] text-gray-500">
            Submitted on{" "}
            {new Date(proposal.submitted_at).toLocaleDateString("en-MY", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>

          {proposal.proposal_pdf_url && (
            <a
              href={
                proposal.proposal_pdf_url.startsWith("http")
                  ? proposal.proposal_pdf_url
                  : `/${proposal.proposal_pdf_url}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-indigo-700 hover:text-indigo-900"
            >
              <FileText size={15} strokeWidth={1.7} />
              View Proposal PDF
            </a>
          )}
        </div>
      ) : submitted ? (
        <div className="bg-green-50 border border-green-100 rounded-lg p-5 text-center">
          <CheckCircle2 className="mx-auto mb-2 text-green-600" size={28} strokeWidth={1.8} />
          <p className="text-[13px] font-medium text-green-800">Proposal Submitted</p>
          <p className="text-[12px] text-green-600 mt-1">Your proposal is now waiting for review.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-[12px] text-gray-400 pb-4 border-b border-gray-100 mb-5">
            <span>Want to apply as a team?</span>
            <button className="text-indigo-600 hover:text-indigo-800 transition-colors font-medium">
              Create Group
            </button>
          </div>

          <div className="mb-5">
            <h3 className="text-[13px] font-medium text-gray-900 mb-1">Submission Type</h3>
            <p className="text-[12px] text-gray-400 mb-3">Are you applying as an individual or as a group?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border-2 border-indigo-600 rounded-lg p-3 md:p-3.5 bg-indigo-50/40 flex items-center gap-2.5 cursor-pointer">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <Users size={15} strokeWidth={1.5} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-gray-900">Individual</div>
                  <div className="text-[11px] text-gray-400">Apply on your own for this project</div>
                </div>
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={12} className="text-white" strokeWidth={2.5} />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 md:p-3.5 opacity-45 flex items-center gap-2.5 cursor-not-allowed">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Users size={15} strokeWidth={1.5} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-gray-500">Group</div>
                  <div className="text-[11px] text-gray-400">Create a group first to apply as a team</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <h3 className="text-[13px] font-medium text-gray-900 mb-1">Proposal Files</h3>
            <p className="text-[12px] text-gray-400 mb-3">Upload your proposal document and pitch video</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {[
                {
                  label: "Proposal PDF",
                  icon: FileText,
                  title: "Upload PDF Document",
                  hint: "Upload your proposal document (max 10MB)",
                },
                {
                  label: "Pitch Video",
                  icon: Video,
                  title: "Upload Video",
                  hint: "Upload your pitch video (max 200MB)",
                },
              ].map(({ label, icon: Icon, title, hint }) => (
                <div key={label}>
                  <div className="text-[12px] font-medium text-gray-400 mb-2">{label}</div>
                  <div className="border border-dashed border-gray-300 rounded-lg p-5 md:p-7 flex flex-col items-center gap-1.5 hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors group">
                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                      <Icon size={16} strokeWidth={1.5} className="text-indigo-600" />
                    </div>
                    <div className="text-[12px] font-medium text-gray-700">{title}</div>
                    <div className="text-[11px] text-gray-400 text-center">{hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {onSubmit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-5">
              <div>
                <label className="text-[12px] font-medium text-gray-400 mb-2 block">Proposal PDF URL</label>
                <input
                  type="url"
                  value={pdfUrl}
                  onChange={(event) => onPdfUrlChange?.(event.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-gray-400 mb-2 block">Pitch Video URL</label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(event) => onVideoUrlChange?.(event.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          )}

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-5">
            <h4 className="text-[12px] font-medium text-indigo-700 mb-2">Submission Guidelines</h4>
            {[
              "Your proposal PDF should outline your approach to solving the problem statement",
              "Your pitch video should be 3-5 minutes explaining your solution",
              "Once submitted, you can withdraw your proposal before the deadline",
            ].map((item) => (
              <div key={item} className="flex items-start gap-1.5 mb-1 last:mb-0">
                <CheckCircle size={13} strokeWidth={1.5} className="text-indigo-500 mt-0.5 shrink-0" />
                <span className="text-[12px] text-indigo-600 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded-lg border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!isOpen || submitting || (Boolean(onSubmit) && !pdfUrl.trim())}
              className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded-lg bg-indigo-700 text-white text-[13px] font-medium hover:bg-indigo-800 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : isOpen ? "Submit Proposal" : "Applications Closed"}
              <svg width="11" height="11" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 12 12">
                <path d="M2 10L10 2M10 2H5M10 2v5" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
