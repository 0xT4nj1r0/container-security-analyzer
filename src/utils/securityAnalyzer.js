import { tryParseCompose } from './yamlParser'

export function analyzeCompose(composeText) {
  const parsed = tryParseCompose(composeText)
  if (!parsed.ok) {
    return { issues: [], parseError: parsed.error, parsedObj: null }
  }
  const issues = analyzeFromObj(parsed.obj)
  return { issues, parseError: null, parsedObj: parsed.obj }
}

function analyzeFromObj(composeObj) {
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
        impact: 'Container runs with full root capabilities on the host, effectively disabling container isolation.',
        exploitDetails: 'An attacker can access host devices, mount filesystems, and potentially escape to the host with full privileges.',
        fix: 'Avoid privileged containers. Prefer narrowly scoped capabilities, read-only mounts, and tighter runtime profiles.',
        fixedCode: `# Prefer removing privileged. If needed, switch to minimal caps:\ncap_drop:\n  - ALL\ncap_add:\n  - NET_BIND_SERVICE`,
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
        impact: 'Mounting the Docker socket effectively grants root-equivalent control of the host via the Docker daemon.',
        exploitDetails: 'An attacker can start privileged containers, mount the host filesystem, and obtain a host root shell.',
        fix: 'Avoid mounting the Docker socket. If you must, isolate to a dedicated host, limit who can reach it, and consider proxying with authentication.',
        fixedCode: `# Remove this mount:\n# - /var/run/docker.sock:/var/run/docker.sock`,
        priority: 1,
      })
    }

    if (volumes.some((v) => String(v).trim().match(/^\s*\/:\//))) {
      issues.push({
        service: svcName,
        severity: 'critical',
        title: 'Host Root Mounted',
        location: loc('volumes'),
        impact: 'Mounting the host root filesystem allows reading/writing any host file (SSH keys, configs, binaries).',
        exploitDetails: 'An attacker can modify /etc, add persistence, read secrets, or backdoor the host.',
        fix: 'Mount only the specific directory you need and prefer read-only. Avoid host-root mounts entirely for app containers.',
        fixedCode: `# Prefer narrow, read-only mounts:\nvolumes:\n  - ./app-data:/data:ro\n  - ./config:/config:ro`,
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
        impact: 'Container shares the host network stack, removing network isolation and exposing host-local services.',
        exploitDetails: 'An attacker may access localhost-only services and bind to ports directly on the host.',
        fix: 'Prefer bridge networking with explicit port mappings.',
        fixedCode: `# Remove network_mode: host\nports:\n  - "8080:80"`,
        priority: 2,
      })
    }

    if (String(svc.pid || '').toLowerCase() === 'host') {
      issues.push({
        service: svcName,
        severity: 'high',
        title: 'Host PID Namespace Shared',
        location: loc('pid'),
        impact: 'Container can see and potentially interact with host processes via /proc.',
        exploitDetails: 'An attacker may enumerate host processes and attempt attacks against them.',
        fix: 'Remove PID namespace sharing unless you are running a dedicated monitoring agent that explicitly requires it.',
        fixedCode: `# Remove:\n# pid: host`,
        priority: 2,
      })
    }

    if (String(svc.ipc || '').toLowerCase() === 'host') {
      issues.push({
        service: svcName,
        severity: 'medium',
        title: 'Host IPC Namespace Shared',
        location: loc('ipc'),
        impact: 'Container shares IPC with the host, increasing risk of shared-memory and IPC-based information exposure.',
        exploitDetails: 'An attacker may access shared memory segments or message queues used by host processes.',
        fix: 'Remove IPC namespace sharing unless explicitly required for your workload.',
        fixedCode: `# Remove:\n# ipc: host`,
        priority: 3,
      })
    }

    if (String(svc.uts || '').toLowerCase() === 'host') {
      issues.push({
        service: svcName,
        severity: 'low',
        title: 'Host UTS Namespace Shared',
        location: loc('uts'),
        impact: 'Container shares hostname/domain with the host (minor information disclosure / tampering risk).',
        exploitDetails: 'In some configurations, hostname changes may affect the host namespace.',
        fix: 'Remove UTS namespace sharing unless required.',
        fixedCode: `# Remove:\n# uts: host`,
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
        impact: 'Syscall filtering is disabled, allowing a wider set of dangerous system calls.',
        exploitDetails: 'An attacker may leverage expanded syscall access to escalate privileges or bypass controls in some environments.',
        fix: 'Remove seccomp:unconfined to use the default profile or an approved custom one.',
        fixedCode: `# Remove:\n# - seccomp:unconfined`,
        priority: 3,
      })
    }

    if (securityOpt.some((o) => String(o).toLowerCase().replace(/\s+/g, '') === 'apparmor:unconfined')) {
      issues.push({
        service: svcName,
        severity: 'medium',
        title: 'AppArmor Disabled',
        location: loc('security_opt'),
        impact: 'Mandatory Access Control policy is disabled, removing an important hardening layer.',
        exploitDetails: 'An attacker may perform actions that would normally be constrained by policy.',
        fix: 'Remove apparmor:unconfined to use the default profile or an approved custom one.',
        fixedCode: `# Remove:\n# - apparmor:unconfined`,
        priority: 3,
      })
    }

    // Check user configuration
    if (!('user' in svc)) {
      issues.push({
        service: svcName,
        severity: 'medium',
        title: 'Running as Root (No User Set)',
        location: loc('user'),
        impact: 'If the container is compromised, attacker gets root inside the container by default.',
        exploitDetails: 'Root inside the container often makes breakout chains easier when combined with misconfigurations.',
        fix: 'Set a non-root user that matches your image/app requirements (avoid breaking writes/permissions).',
        fixedCode: `# Example (choose a user that exists in your image):\nuser: "1000:1000"`,
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
        impact: 'Writable filesystem makes persistence and tool installation easier after compromise.',
        exploitDetails: 'An attacker can drop binaries, modify configs, or stash payloads on disk.',
        fix: 'Set read_only: true and mount necessary write paths using tmpfs or explicit volumes.',
        fixedCode: `read_only: true\ntmpfs:\n  - /tmp`,
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
