import React, { useMemo, useState } from 'react'
import {
  Shield,
  Zap,
  CheckCircle,
  FileText,
  BarChart3,
  Wrench,
  Info,
  Copy,
  Check,
} from 'lucide-react'

import { EMPTY_COMPOSE, SAMPLE_VULNERABLE_COMPOSE } from '../constants'
import { analyzeCompose, groupBySeverity } from '../utils/securityAnalyzer'
import { applyAllPatches, generateDiff } from '../utils/patcher'

import InputTab from './InputTab'
import AnalysisTab from './AnalysisTab'
import PatchedTab from './PatchedTab'

export default function ContainerSecurityAnalyzer() {
  const [composeFile, setComposeFile] = useState(EMPTY_COMPOSE)
  const [activeTab, setActiveTab] = useState('input')
  const [openKey, setOpenKey] = useState(null)
  const [resultsSubtab, setResultsSubtab] = useState(null)
  const [copied, setCopied] = useState(false)

  // Analysis
  const analysis = useMemo(() => analyzeCompose(composeFile), [composeFile])
  const issues = analysis.issues
  const issuesBySeverity = useMemo(() => groupBySeverity(issues), [issues])

  const availableSeverities = useMemo(() => {
    const order = ['critical', 'high', 'medium', 'low']
    return order.filter((s) => issuesBySeverity[s]?.length > 0)
  }, [issuesBySeverity])

  const counts = useMemo(
    () => ({
      critical: issuesBySeverity.critical.length,
      high: issuesBySeverity.high.length,
      medium: issuesBySeverity.medium.length,
      low: issuesBySeverity.low.length,
    }),
    [issuesBySeverity]
  )

  const score = useMemo(() => {
    const risk = counts.critical * 20 + counts.high * 10 + counts.medium * 5 + counts.low * 2
    return Math.max(0, 100 - risk)
  }, [counts])

  // Patching
  const patched = useMemo(() => {
    console.log('Running applyAllPatches...')
    const result = applyAllPatches(composeFile, analysis.parsedObj)
    console.log('Patch result:', result)
    return result
  }, [composeFile, analysis.parsedObj])

  // Diff
  const diffData = useMemo(() => {
    if (!patched.patchedText) {
      console.log('No patched text available')
      return []
    }
    return generateDiff(composeFile, patched.patchedText, patched.changes)
  }, [composeFile, patched.patchedText, patched.changes])

  // Auto-select first severity tab
  useMemo(() => {
    if (!resultsSubtab || !availableSeverities.includes(resultsSubtab)) {
      setResultsSubtab(availableSeverities[0] || 'critical')
      setOpenKey(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSeverities.join('|')])

  const currentIssues = useMemo(() => {
    if (!resultsSubtab) return []
    return issuesBySeverity[resultsSubtab] || []
  }, [issuesBySeverity, resultsSubtab])

  const copyPatchedOutput = () => {
    const textToCopy = patched.patchedText || composeFile
    navigator.clipboard?.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasAnalysis = composeFile.trim().length > 0

  // Load sample file
  const loadSample = () => {
    setComposeFile(SAMPLE_VULNERABLE_COMPOSE)
    setActiveTab('results')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center gap-4">
          <div className="p-2.5 bg-blue-600 rounded-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Container Security Analyzer</h1>
            <p className="text-gray-600 text-base mt-0.5">
              Analyze docker-compose files for security vulnerabilities
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setActiveTab('input')}
              className={`flex-1 px-6 py-4 font-medium text-base flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'input'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-5 h-5" /> Input
            </button>

            {hasAnalysis && (
              <>
                <button
                  onClick={() => setActiveTab('results')}
                  className={`flex-1 px-6 py-4 font-medium text-base flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'results'
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" /> Analysis
                  {issues.length > 0 && (
                    <span className="ml-1 px-2.5 py-0.5 bg-red-600 text-white text-sm rounded-full font-semibold">
                      {issues.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('secure')}
                  className={`flex-1 px-6 py-4 font-medium text-base flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'secure'
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Wrench className="w-5 h-5" /> Patched Output
                </button>
              </>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'input' && (
            <InputTab
              composeFile={composeFile}
              setComposeFile={setComposeFile}
              parseError={analysis.parseError}
              hasAnalysis={hasAnalysis}
              onAnalyze={() => setActiveTab('results')}
              onLoadSample={loadSample}
            />
          )}

          {activeTab === 'results' && (
            <AnalysisTab
              score={score}
              counts={counts}
              issues={issues}
              issuesBySeverity={issuesBySeverity}
              onViewPatch={() => setActiveTab('secure')}
            />
          )}

          {activeTab === 'secure' && (
            <PatchedTab
              diffData={diffData}
              patchedText={patched.patchedText || composeFile}
              copied={copied}
              onCopy={copyPatchedOutput}
            />
          )}
        </div>
      </div>
    </div>
  )
}
