interface MissionSectionProps {
  projectScope?: string | null;
  requirements?: string | null;
}

const DEFAULT_MISSION = [
  "Consolidates all HOD budget submissions into a single source of truth",
  "Establishes a structured pipeline: draft to submitted to under review to approved",
  "Provides structured input templates covering opex, capex, and headcount costs",
  "Pre-populates relevant data including prior-year actuals and headcount figures where available",
  "Flags budget gaps or overruns early by comparing submissions against prior-year actuals and approved spending envelopes",
  "Delivers a dashboard showing submission status, plan vs. actual comparison, and consolidated spend by department",
];

const DEFAULT_ROLES = [
  "IT / Computer Science - for building the budget input interface and consolidation logic",
  "Information Systems / Business IT - for handling data from multiple sources (HR and finance records)",
  "Accounting / Finance / Business - for understanding opex, capex, headcount budgeting, and plan vs. actual logic",
];

const DEFAULT_SKILLS = [
  "Intermediate web or app development (frontend + backend)",
  "Database design (handling structured financial data across departments)",
  "Basic data aggregation and consolidation logic",
  "Dashboard and data visualisation (plan vs. actual, spend breakdowns)",
  "Familiarity with working with imported or pre-populated data (CSV, Excel, or API-fed inputs)",
];

function splitItems(value: string | null | undefined, fallback: string[]) {
  if (!value) return fallback;

  const items = value
    .split(/\n|,/)
    .map((item) =>
      item
        .replace(/^\s*[-*]\s*/, "")
        .replace(/^\d+\.\s*/, "")
        .trim()
    )
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
}

export default function MissionSection({ projectScope, requirements }: MissionSectionProps) {
  const missionItems = splitItems(projectScope, DEFAULT_MISSION);
  const skills = splitItems(requirements, DEFAULT_SKILLS);

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6">
        <h2 className="text-[15px] font-medium text-gray-900 mb-3">Your Mission</h2>
        <p className="text-[13px] text-gray-500 mb-3">
          Build a concept solution that outlines a centralised budget planning workflow that:
        </p>
        <ol className="space-y-2">
          {missionItems.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2 text-[13px] text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-700 shrink-0">{index + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6">
        <h2 className="text-[15px] font-medium text-gray-900 mb-3">Technical Requirements</h2>
        <p className="text-[13px] text-gray-400 mb-3">Ideal but not limited to:</p>
        <ol className="space-y-2 mb-4">
          {DEFAULT_ROLES.map((role, index) => (
            <li key={role} className="flex gap-2 text-[13px] text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-700 shrink-0">{index + 1}.</span>
              <span>{role}</span>
            </li>
          ))}
        </ol>
        <div className="space-y-1.5">
          {skills.map((skill, index) => (
            <div key={`${skill}-${index}`} className="text-[13px] text-gray-500">
              - {skill}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
