import React, { useState, useMemo } from 'react'
import { CheckCircle, Flame, ShieldAlert, BadgeInfo, AlertTriangle } from 'lucide-react'
import { severityMeta } from '../constants'

export default function AnalysisTab({
  score,
  counts,
  issues,
  issuesBySeverity,
  onViewPatch
}) {
  const iconMap = {
    critical: Flame,
    high: ShieldAlert,
    medium: BadgeInfo,
    low: AlertTriangle,
  }

  // Determine which severity levels have issues
  const availableSeverities = useMemo(() => {
    const order = ['critical', 'high', 'medium', 'low']
    return order.filter(sev => counts[sev] > 0)
  }, [counts])

  // Default to first available severity
  const [activeSubtab, setActiveSubtab] = useState(availableSeverities[0] || 'critical')

  // Get current issues for active subtab
  const currentIssues = useMemo(() => {
    return issuesBySeverity[activeSubtab] || []
  }, [issuesBySeverity, activeSubtab])

  // Update active subtab if it becomes unavailable
  useMemo(() => {
    if (!availableSeverities.includes(activeSubtab)) {
      setActiveSubtab(availableSeverities[0] || 'critical')
    }
  }, [availableSeverities, activeSubtab])

  return (
    <div className="p-8 space-y-6">
      {/* Score Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-[260px]">
            <div className="text-sm text-gray-600 mb-1 font-medium">Overall Security Score</div>
            <div className="text-5xl font-bold text-gray-900 mb-2">{score}/100</div>
            <div className="text-gray-700 text-base">
              <span className="text-red-600 font-semibold">{counts.critical}</span> Critical • 
              <span className="text-orange-600 font-semibold ml-1.5">{counts.high}</span> High • 
              <span className="text-amber-600 font-semibold ml-1.5">{counts.medium}</span> Medium • 
              <span className="text-gray-600 font-semibold ml-1.5">{counts.low}</span> Low
            </div>
          </div>

          <button
            onClick={onViewPatch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold text-base transition-colors"
          >
            View Patched Config
          </button>
        </div>
      </div>

      {/* Issues Section */}
      {issues.length === 0 ? (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-8 flex items-start gap-4">
          <CheckCircle className="w-8 h-8 text-green-600 mt-1 flex-shrink-0" />
          <div>
            <div className="font-bold text-green-900 text-xl mb-2">All Clear!</div>
            <div className="text-green-800 text-base">
              No security vulnerabilities detected in your docker-compose configuration.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Severity Sub-tabs */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex flex-wrap gap-2">
            {availableSeverities.map((sev) => {
              const meta = severityMeta[sev]
              const Icon = iconMap[sev]
              const active = activeSubtab === sev
              
              return (
                <button
                  key={sev}
                  onClick={() => setActiveSubtab(sev)}
                  className={`px-4 py-2.5 rounded-lg text-base font-semibold flex items-center gap-2 transition-all ${
                    active
                      ? 'bg-white border-2 border-gray-300 shadow-sm text-gray-900'
                      : 'text-gray-700 hover:bg-white border-2 border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {meta.label}
                  <span className={`ml-1 text-base font-bold ${active ? meta.countText : 'text-gray-500'}`}>
                    {counts[sev]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Issues List for Active Subtab */}
          <div className="space-y-3">
            {currentIssues.map((issue, idx) => {
              const meta = severityMeta[issue.severity] || severityMeta.low
              const Icon = iconMap[issue.severity]

              return (
                <div key={idx} className={`border-2 rounded-lg p-5 ${meta.panel}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`w-6 h-6 mt-0.5 flex-shrink-0 ${
                      issue.severity === 'critical' ? 'text-red-600' :
                      issue.severity === 'high' ? 'text-orange-600' :
                      issue.severity === 'medium' ? 'text-amber-600' :
                      'text-gray-600'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-gray-900 text-base">
                          {issue.service ? `${issue.service}: ` : ''}
                          {issue.title}
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${meta.chip}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <div className="text-gray-700 text-sm mt-2">{issue.impact}</div>
                      <div className="text-gray-600 text-xs mt-2">
                        Location: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{issue.location}</code>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
