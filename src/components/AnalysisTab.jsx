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
                          {issue.title}
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${meta.chip}`}>
                          {issue.severity}
                        </span>
                      </div>
                      
                      {/* Impact */}
                      <div className="text-gray-700 text-sm mt-2">
                        <strong>Impact:</strong> {issue.impact}
                      </div>
                      
                      {/* Exploitation Scenario */}
                      <div className="text-red-700 text-sm mt-2 bg-red-50 p-2 rounded border border-red-200">
                        <strong>Exploitation:</strong> {issue.exploit}
                      </div>
                      
                      {/* Locations */}
                      <div className="text-gray-600 text-xs mt-3">
                        <strong>Affected Services:</strong>
                        <div className="mt-1 space-y-1">
                          {issue.locations.map((loc, locIdx) => (
                            <div key={locIdx} className="flex items-center gap-2">
                              <code className="bg-gray-100 px-2 py-0.5 rounded">
                                {loc.location}
                              </code>
                              {loc.lineNumber && (
                                <span className="text-gray-500">[Line {loc.lineNumber}]</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Reference Link */}
                      {issue.reference && (
                        <div className="mt-3">
                          <a 
                            href={issue.reference} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium underline flex items-center gap-1"
                          >
                            📚 Learn More
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
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
