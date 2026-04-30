export default function ProblemOverview() {
  const problems = [
    "High reconciliation effort — Finance and HR manually combine budget inputs from multiple sources and formats each planning cycle",
    "Data fragmentation — Headcount costs, prior-year actuals, and new budget proposals live in separate systems with no automatic linkage",
    "No guardrails for HODs — Budgets are submitted without visibility into prior-year actuals or approved spending limits, leading to unrealistic proposals",
    "Late gap identification — Overruns or underfunding are only surfaced late in the cycle, leaving little room for correction",
    "Poor HR-Finance coordination — Without a shared interface, both teams are often working from different versions of the same data",
  ];

  return (
    <div className="grid grid-cols-[1fr_240px] gap-4">
      {/* Problem card */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="text-[15px] font-medium text-gray-900 mb-4">Problem Overview</h2>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-3">
          A company&apos;s budget planning process is currently managed through disconnected spreadsheets across HR,
          Finance, and individual departments, with no central system to consolidate HOD submissions, link to
          existing financial data, or provide a unified view of planned vs. actual spend.
        </p>
        <p className="text-[13px] text-gray-500 mb-3">This leads to:</p>
        <ol className="space-y-2">
          {problems.map((p, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-700 shrink-0">{i + 1}.</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Timeline card */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 h-fit">
        <h2 className="text-[15px] font-medium text-gray-900 mb-4">Timeline</h2>
        <div className="space-y-4">
          <div>
            <div className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">Submission Deadline</div>
            <div className="text-[14px] font-medium text-gray-900">Thursday, 30 April 2026</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">Estimated Project Start</div>
            <div className="text-[14px] font-medium text-gray-900">Monday, 11 May 2026</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">Duration</div>
            <div className="text-[14px] font-medium text-gray-900">8 weeks</div>
          </div>
        </div>
      </div>
    </div>
  );
}
