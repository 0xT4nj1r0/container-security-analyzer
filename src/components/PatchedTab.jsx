import React from 'react'
import { Wrench, Copy, Check, Info } from 'lucide-react'

export default function PatchedTab({ diffData, patchedText, copied, onCopy }) {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-600" />
            Patched Docker Compose
          </div>
          <div className="text-gray-600 text-base mt-1.5">
            All security fixes have been automatically applied below
          </div>
        </div>

        <button
          onClick={onCopy}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold text-base flex items-center gap-2 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" /> Copied!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" /> Copy Patched Output
            </>
          )}
        </button>
      </div>

      {/* Side by side diff */}
      <div className="rounded-lg border-2 border-gray-300 overflow-hidden bg-white">
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-300">
          <div className="text-base font-semibold text-gray-900">Code Comparison</div>
          <div className="text-sm text-gray-600 mt-1">
            Red highlights in original show vulnerable/problematic lines that were removed
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-gray-300">
          {/* Original Code - HIGHLIGHT PROBLEMATIC LINES */}
          <div className="bg-gray-900">
            <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
              <div className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Original (Vulnerable)</div>
            </div>
            <div className="p-4 font-mono text-sm overflow-x-auto max-h-[600px] overflow-y-auto">
              {diffData.map((line, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 leading-relaxed ${
                    line.isProblematic ? 'bg-red-900/40 border-l-4 border-red-500' : ''
                  }`}
                >
                  <span className="text-gray-600 select-none w-10 text-right shrink-0 pr-2">
                    {line.lineNum}
                  </span>
                  <span className={line.isProblematic ? 'text-red-400 font-semibold' : 'text-green-400'}>
                    {line.original}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Patched Code - NO HIGHLIGHTS, CLEAN OUTPUT */}
          <div className="bg-gray-900">
            <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
              <div className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">Patched (Secure)</div>
            </div>
            <div className="p-4 font-mono text-sm overflow-x-auto max-h-[600px] overflow-y-auto">
              {diffData.map((line, idx) => (
                <div key={idx} className="flex gap-3 leading-relaxed">
                  <span className="text-gray-600 select-none w-10 text-right shrink-0 pr-2">
                    {line.lineNum}
                  </span>
                  <span className="text-green-400">
                    {line.patched}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-gray-100 border-t border-gray-300 px-6 py-4 flex gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded border border-red-400"></div>
            <span className="text-gray-700 font-medium">Vulnerable/removed lines in original</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded border border-green-400"></div>
            <span className="text-gray-700 font-medium">Safe/kept lines</span>
          </div>
        </div>
      </div>

      {/* Warning notice */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-base font-semibold text-amber-900 mb-2">Manual Review Recommended</div>
            <div className="text-base text-amber-800 leading-relaxed">
              Some security fixes (like adding <code className="bg-amber-100 px-1.5 py-0.5 rounded text-sm">user: "1000:1000"</code> or <code className="bg-amber-100 px-1.5 py-0.5 rounded text-sm">read_only: true</code>) may require adjustments based on your application's needs. Review the patched output and test thoroughly before deploying to production.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
