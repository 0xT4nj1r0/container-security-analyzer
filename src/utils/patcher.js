import { normalizeSecurityOptItem } from './yamlParser'

export function applyAllPatches(composeText, parsedObj) {
  const changes = []

  if (!parsedObj || typeof parsedObj !== 'object') {
    return { patchedText: composeText, changes }
  }

  const services = parsedObj.services && typeof parsedObj.services === 'object' ? parsedObj.services : null
  if (!services) {
    return { patchedText: composeText, changes }
  }

  const lines = composeText.split('\n')
  const result = []
  
  let currentService = null
  let serviceIndent = 0
  let inSecurityOpt = false
  let inVolumes = false
  let lastServiceContentLine = -1
  const serviceLastLines = new Map() // Track where to insert user/read_only

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const indent = line.search(/\S|$/)

    // Skip empty lines and comments - always keep them
    if (trimmed === '' || trimmed.startsWith('#')) {
      result.push(line)
      continue
    }

    // Detect service name
    if (indent === 2 && trimmed.endsWith(':') && !trimmed.includes(' ')) {
      const serviceName = trimmed.slice(0, -1)
      if (services[serviceName]) {
        // Save where to add fields for previous service
        if (currentService && lastServiceContentLine >= 0) {
          serviceLastLines.set(currentService, lastServiceContentLine)
        }
        
        currentService = serviceName
        serviceIndent = indent
        lastServiceContentLine = result.length
        inSecurityOpt = false
        inVolumes = false
        result.push(line)
        continue
      }
    }

    // Detect end of services section
    if (indent === 0 && trimmed.endsWith(':')) {
      // Save last service position before leaving services
      if (currentService && lastServiceContentLine >= 0) {
        serviceLastLines.set(currentService, lastServiceContentLine)
      }
      currentService = null
    }

    // If not in a service, just copy the line
    if (!currentService) {
      result.push(line)
      continue
    }

    const svc = services[currentService]

    // Track sections
    if (trimmed.startsWith('security_opt:')) {
      inSecurityOpt = true
      inVolumes = false
    } else if (trimmed.startsWith('volumes:')) {
      inVolumes = true
      inSecurityOpt = false
    } else if (indent === 4 && trimmed.endsWith(':')) {
      inSecurityOpt = false
      inVolumes = false
    }

    let shouldRemove = false

    // Check for fields to remove
    if (indent === 4) {
      if (trimmed.startsWith('privileged:') && svc.privileged === true) {
        shouldRemove = true
        changes.push({ service: currentService, action: 'removed', line: trimmed })
      }
      else if (trimmed.startsWith('network_mode:') && svc.network_mode === 'host') {
        shouldRemove = true
        changes.push({ service: currentService, action: 'removed', line: trimmed })
      }
      else if (trimmed.startsWith('pid:') && svc.pid === 'host') {
        shouldRemove = true
        changes.push({ service: currentService, action: 'removed', line: trimmed })
      }
      else if (trimmed.startsWith('ipc:') && svc.ipc === 'host') {
        shouldRemove = true
        changes.push({ service: currentService, action: 'removed', line: trimmed })
      }
      else if (trimmed.startsWith('uts:') && svc.uts === 'host') {
        shouldRemove = true
        changes.push({ service: currentService, action: 'removed', line: trimmed })
      }
    }

    // Check for security_opt items to remove
    if (inSecurityOpt && indent === 6 && trimmed.startsWith('-')) {
      const secOpt = Array.isArray(svc.security_opt) ? svc.security_opt : []
      if (secOpt.some(o => normalizeSecurityOptItem(o) === 'seccomp:unconfined') && trimmed.includes('seccomp:unconfined')) {
        shouldRemove = true
        changes.push({ service: currentService, action: 'removed', line: trimmed })
      }
      else if (secOpt.some(o => normalizeSecurityOptItem(o) === 'apparmor:unconfined') && trimmed.includes('apparmor:unconfined')) {
        shouldRemove = true
        changes.push({ service: currentService, action: 'removed', line: trimmed })
      }
    }

    // Check for dangerous volumes to remove
    if (inVolumes && indent === 6 && trimmed.startsWith('-')) {
      const volumes = Array.isArray(svc.volumes) ? svc.volumes : []
      const hasDangerous = volumes.some(v => {
        const volStr = String(v).trim()
        return (volStr.includes('/var/run/docker.sock') && trimmed.includes('/var/run/docker.sock')) ||
               (volStr.match(/^\s*\/:\//) && (trimmed.includes('/:/host') || trimmed.includes('/:/') || trimmed.match(/\/:[\/\w-]/)))
      })
      
      if (hasDangerous) {
        shouldRemove = true
        changes.push({ service: currentService, action: 'removed', line: trimmed })
      }
    }

    if (!shouldRemove) {
      result.push(line)
      // Track last actual content line of service (not comment, not empty)
      if (indent >= 4 && !trimmed.startsWith('#')) {
        lastServiceContentLine = result.length - 1
      }
    }
  }

  // Save last service if any
  if (currentService && lastServiceContentLine >= 0) {
    serviceLastLines.set(currentService, lastServiceContentLine)
  }

  // Now insert user and read_only for each service
  const finalResult = []
  for (let i = 0; i < result.length; i++) {
    finalResult.push(result[i])
    
    // Check if this is the last line of a service where we need to add fields
    for (const [serviceName, lastLine] of serviceLastLines.entries()) {
      if (i === lastLine) {
        const svc = services[serviceName]
        const indent = '    ' // 4 spaces
        
        if (!('user' in svc)) {
          finalResult.push(`${indent}user: "1000:1000"`)
          changes.push({ service: serviceName, action: 'added', line: 'user: "1000:1000"' })
        }
        
        if (svc.read_only !== true) {
          finalResult.push(`${indent}read_only: true`)
          changes.push({ service: serviceName, action: 'added', line: 'read_only: true' })
        }
      }
    }
  }

  return { patchedText: finalResult.join('\n'), changes }
}

export function generateDiff(originalText, patchedText, changes) {
  const originalLines = originalText.split('\n')
  const patchedLines = patchedText.split('\n')
  
  // Build a set of problematic line numbers from changes
  const problematicLines = new Set()
  
  // Mark lines that were removed as problematic
  for (let i = 0; i < originalLines.length; i++) {
    const line = originalLines[i].trim()
    
    // Skip blank lines and comments
    if (line === '' || line.startsWith('#')) {
      continue
    }
    
    // Check if this line matches any change that was removed
    for (const change of changes) {
      if (change.action === 'removed') {
        const changeLine = change.line.trim()
        if (line.includes(changeLine) || changeLine.includes(line.split(':')[0])) {
          problematicLines.add(i)
          break
        }
      }
    }
  }
  
  const diff = []
  const maxLen = Math.max(originalLines.length, patchedLines.length)
  
  for (let i = 0; i < maxLen; i++) {
    const origLine = originalLines[i] !== undefined ? originalLines[i] : ''
    const patchLine = patchedLines[i] !== undefined ? patchedLines[i] : ''
    
    const changed = origLine !== patchLine
    const removed = origLine !== '' && patchLine === ''
    const added = origLine === '' && patchLine !== ''
    const isProblematic = problematicLines.has(i)
    
    diff.push({
      original: origLine,
      patched: patchLine,
      changed,
      removed,
      added,
      isProblematic,
      lineNum: i + 1,
    })
  }
  
  return diff
}
