export default function MissionSection() {
  const missionItems = [
    "Consolidates all HOD budget submissions into a single source of truth",
    "Establishes a structured pipeline: draft → submitted → under review → approved",
    "Provides structured input templates covering opex, capex, and headcount costs",
    "Pre-populates relevant data including prior-year actuals and headcount figures where available",
    "Flags budget gaps or overruns early by comparing submissions against prior-year actuals and approved spending envelopes",
    "Delivers a dashboard showing submission status, plan vs. actual comparison, and consolidated spend by department",
  ];

  const techRoles = [
    "IT / Computer Science — for building the budget input interface and consolidation logic",
    "Information Systems / Business IT — for handling data from multiple sources (HR and finance records)",
    "Accounting / Finance / Business — for understanding opex, capex, headcount budgeting, and plan vs. actual logic",
  ];

  const skills = [
    "Intermediate web or app development (frontend + backend)",
    "Database design (handling structured financial data across departments)",
    "Basic data aggregation and consolidation logic",
    "Dashboard and data visualisation (plan vs. actual, spend breakdowns)",
    "Familiarity with working with imported or pre-populated data (CSV, Excel, or API-fed inputs)",
  ];

  return (
    <>
      {/* Your Mission */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="text-[15px] font-medium text-gray-900 mb-3">Your Mission</h2>
        <p className="text-[13px] text-gray-500 mb-3">
          Build a concept solution that outlines a centralised budget planning workflow that:
        </p>
        <ol className="space-y-2">
          {missionItems.map((item, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-700 shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Technical Requirements */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="text-[15px] font-medium text-gray-900 mb-3">Technical Requirements</h2>
        <p className="text-[13px] text-gray-400 mb-3">Ideal but not limited to:</p>
        <ol className="space-y-2 mb-4">
          {techRoles.map((role, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-700 shrink-0">{i + 1}.</span>
              <span>{role}</span>
            </li>
          ))}
        </ol>
        <div className="space-y-1.5">
          {skills.map((skill, i) => (
            <div key={i} className="text-[13px] text-gray-500">
              – {skill}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
