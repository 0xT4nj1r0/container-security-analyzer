import React from 'react'
import { Zap, CheckCircle, Info, AlertTriangle } from 'lucide-react'

export default function InputTab({ 
  composeFile, 
  setComposeFile, 
  parseError, 
  hasAnalysis, 
  onAnalyze,
  onLoadSample 
}) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <label className="block text-gray-900 font-semibold text-lg">Docker Compose File</label>
        <div className="flex gap-2">
          {composeFile && (
            <button
              onClick={() => setComposeFile('')}
              className="text-gray-500 hover:text-red-600 text-sm font-medium transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={onLoadSample}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            Load Sample
          </button>
        </div>
      </div>
      
      <textarea
        className="w-full h-96 bg-gray-900 text-green-400 rounded-lg p-5 font-mono text-base border-2 border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
        value={composeFile}
        onChange={(e) => setComposeFile(e.target.value)}
        placeholder={`Paste your docker-compose.yml here...

Example:
version: "3.8"
services:
  web:
    image: nginx:latest
    privileged: true
    volumes:
      - /:/host`}
        spellCheck={false}
      />

      {parseError && composeFile.trim().length > 0 && (
        <div className="mt-4 rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-800 font-semibold text-base">
            <AlertTriangle className="w-5 h-5" /> YAML Parse Error
          </div>
          <div className="text-sm text-red-700 mt-2">{parseError}</div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        {hasAnalysis ? (
          <>
            <button
              onClick={onAnalyze}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg font-semibold text-base flex items-center gap-2 shadow-sm transition-colors"
            >
              <Zap className="w-5 h-5" /> Analyze Security
            </button>
            <div className="flex items-center gap-2 text-green-600 text-base font-medium">
              <CheckCircle className="w-5 h-5" />
              <span>Ready to analyze</span>
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-base flex items-center gap-2">
            <Info className="w-5 h-5" />
            Paste your docker-compose.yml to begin security analysis
          </div>
        )}
      </div>
    </div>
  )
}
