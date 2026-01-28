import { tryParseCompose } from './yamlParser'

export function analyzeCompose(composeText) {
  const parsed = tryParseCompose(composeText)
  if (!parsed.ok) {
    return { issues: [], parseError: parsed.error, parsedObj: null }
  }
  const issues = analyzeFromObj(parsed.obj, composeText)
  const groupedIssues = groupIssuesByType(issues)
  return { issues: groupedIssues, parseError: null, parsedObj: parsed.obj }
}

function getLineNumber(composeText, serviceName, searchString) {
  const lines = composeText.split('\n')
  let inService = false
  let serviceIndent = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const indent = line.search(/\S|$/)
    
    // Found the service
    if (trimmed === `${serviceName}:`) {
      inService = true
      serviceIndent = indent
      continue
    }
    
    // Exited the service (found another service or lower indent level)
    if (inService && indent <= serviceIndent && trimmed.endsWith(':') && !trimmed.startsWith('#')) {
      inService = false
    }
    
    // Search within the service
    if (inService && line.includes(searchString)) {
      return i + 1
    }
  }
  
  return null
}

function groupIssuesByType(issues) {
  const grouped = {}
  
  for (const issue of issues) {
    const key = issue.title
    
    if (!grouped[key]) {
      grouped[key] = {
        severity: issue.severity,
        title: issue.title,
        impact: issue.impact,
        exploit: issue.exploit,
        reference: issue.reference,
        locations: [],
        priority: issue.priority,
      }
    }
    
    grouped[key].locations.push({
      service: issue.service,
      location: issue.location,
      lineNumber: issue.lineNumber,
    })
  }
  
  return Object.values(grouped)
}

function analyzeFromObj(composeObj, composeText) {
  const issues = []
  const services = composeObj?.services && typeof composeObj.services === 'object' ? composeObj.services : null
  if (!services) return issues

  for (const [svcName, svc] of Object.entries(services)) {
    if (!svc || typeof svc !== 'object') continue
    const loc = (field) => `services.${svcName}.${field}`

    // Check for privileged mode
    if (svc.privileged === true) {
      issues.push({
        service: svcName,
        severity: 'critical',
        title: 'Privileged Mode Enabled',
        location: loc('privileged'),
        lineNumber: getLineNumber(composeText, svcName, 'privileged:'),
        impact: 'Container runs with full root capabilities on the host, effectively disabling container isolation.',
        exploit: 'Attacker can access /dev, load kernel modules, and break out to host with full root privileges.',
        reference: 'https://owasp.org/www-community/vulnerabilities/Insecure_Dockerfile',
        priority: 1,
      })
    }

    // Check volumes for dangerous mounts
    const volumes = Array.isArray(svc.volumes) ? svc.volumes : []
    
    if (volumes.some((v) => String(v).includes('/var/run/docker.sock'))) {
      issues.push({
        service: svcName,
        severity: 'critical',
        title: 'Docker Socket Exposed',
        location: loc('volumes'),
        lineNumber: getLineNumber(composeText, svcName, '/var/run/docker.sock'),
        impact: 'Mounting the Docker socket effectively grants root-equivalent control of the host via the Docker daemon.',
        exploit: 'Attacker spawns a privileged container with host filesystem mounted, executes commands as root on the host.',
        reference: 'https://docs.docker.com/engine/security/#docker-daemon-attack-surface',
        priority: 1,
      })
    }

    if (volumes.some((v) => String(v).trim().match(/^\s*\/:\//))) {
      issues.push({
        service: svcName,
        severity: 'critical',
        title: 'Host Root Mounted',
        location: loc('volumes'),
        lineNumber: getLineNumber(composeText, svcName, '/:/'),
        impact: 'Mounting the host root filesystem allows reading/writing any host file (SSH keys, configs, binaries).',
        exploit: 'Attacker modifies /etc/passwd, adds SSH keys to /root/.ssh, or replaces system binaries for persistence.',
        reference: 'https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html#rule-4-avoid-privileged-containers',
        priority: 1,
      })
    }

    // Check namespace sharing
    if (String(svc.network_mode || '').toLowerCase() === 'host') {
      issues.push({
        service: svcName,
        severity: 'high',
        title: 'Host Network Mode',
        location: loc('network_mode'),
        lineNumber: getLineNumber(composeText, svcName, 'network_mode:'),
        impact: 'Container shares the host network stack, removing network isolation and exposing host-local services.',
        exploit: 'Attacker binds to privileged ports (80, 443) on the host or intercepts traffic to localhost services.',
        reference: 'https://docs.docker.com/network/drivers/host/',
        priority: 2,
      })
    }

    if (String(svc.pid || '').toLowerCase() === 'host') {
      issues.push({
        service: svcName,
        severity: 'high',
        title: 'Host PID Namespace Shared',
        location: loc('pid'),
        lineNumber: getLineNumber(composeText, svcName, 'pid:'),
        impact: 'Container can see and potentially interact with host processes via /proc.',
        exploit: 'Attacker enumerates host processes, reads environment variables from /proc/PID/environ, or kills critical services.',
        reference: 'https://docs.docker.com/engine/security/#kernel-namespaces',
        priority: 2,
      })
    }

    if (String(svc.ipc || '').toLowerCase() === 'host') {
      issues.push({
        service: svcName,
        severity: 'medium',
        title: 'Host IPC Namespace Shared',
        location: loc('ipc'),
        lineNumber: getLineNumber(composeText, svcName, 'ipc:'),
        impact: 'Container shares IPC with the host, increasing risk of shared-memory and IPC-based information exposure.',
        exploit: 'Attacker reads shared memory segments or message queues containing sensitive data from host processes.',
        reference: 'https://docs.docker.com/engine/security/#kernel-namespaces',
        priority: 3,
      })
    }

    if (String(svc.uts || '').toLowerCase() === 'host') {
      issues.push({
        service: svcName,
        severity: 'low',
        title: 'Host UTS Namespace Shared',
        location: loc('uts'),
        lineNumber: getLineNumber(composeText, svcName, 'uts:'),
        impact: 'Container shares hostname/domain with the host (minor information disclosure / tampering risk).',
        exploit: 'Attacker changes hostname affecting host monitoring systems or deceiving administrators about system identity.',
        reference: 'https://docs.docker.com/engine/security/#kernel-namespaces',
        priority: 4,
      })
    }

    // Check security options
    const securityOpt = Array.isArray(svc.security_opt) ? svc.security_opt : []
    
    if (securityOpt.some((o) => String(o).toLowerCase().replace(/\s+/g, '') === 'seccomp:unconfined')) {
      issues.push({
        service: svcName,
        severity: 'medium',
        title: 'Seccomp Disabled',
        location: loc('security_opt'),
        lineNumber: getLineNumber(composeText, svcName, 'seccomp:unconfined'),
        impact: 'Syscall filtering is disabled, allowing a wider set of dangerous system calls.',
        exploit: 'Attacker uses unrestricted syscalls like ptrace, keyctl, or bpf to escalate privileges or bypass security controls.',
        reference: 'https://docs.docker.com/engine/security/seccomp/',
        priority: 3,
      })
    }

    if (securityOpt.some((o) => String(o).toLowerCase().replace(/\s+/g, '') === 'apparmor:unconfined')) {
      issues.push({
        service: svcName,
        severity: 'medium',
        title: 'AppArmor Disabled',
        location: loc('security_opt'),
        lineNumber: getLineNumber(composeText, svcName, 'apparmor:unconfined'),
        impact: 'Mandatory Access Control policy is disabled, removing an important hardening layer.',
        exploit: 'Attacker performs actions normally blocked by AppArmor policy like accessing unauthorized files or network resources.',
        reference: 'https://docs.docker.com/engine/security/apparmor/',
        priority: 3,
      })
    }

    // Check user configuration
    if (!('user' in svc)) {
      issues.push({
        service: svcName,
        severity: 'medium',
        title: 'Running as Root',
        location: loc('user'),
        lineNumber: getLineNumber(composeText, svcName, `${svcName}:`),
        impact: 'If the container is compromised, attacker gets root inside the container by default.',
        exploit: 'Attacker exploits container escape vulnerability with root privileges, making host compromise easier.',
        reference: 'https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html#rule-2-set-a-user',
        priority: 3,
      })
    }

    // Check read-only filesystem
    if (svc.read_only !== true) {
      issues.push({
        service: svcName,
        severity: 'low',
        title: 'Root Filesystem Not Read-Only',
        location: loc('read_only'),
        lineNumber: getLineNumber(composeText, svcName, `${svcName}:`),
        impact: 'Writable filesystem makes persistence and tool installation easier after compromise.',
        exploit: 'Attacker installs backdoors, modifies configs, or plants malicious binaries that persist across container restarts.',
        reference: 'https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html#rule-8-set-filesystem-and-volumes-to-read-only',
        priority: 4,
      })
    }
  }

  issues.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  return issues
}

export function groupBySeverity(issues) {
  const groups = { critical: [], high: [], medium: [], low: [] }
  for (const i of issues) {
    if (groups[i.severity]) groups[i.severity].push(i)
  }
  return groups
}
