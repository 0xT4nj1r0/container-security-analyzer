import yaml from 'js-yaml'

export function normalizeSecurityOptItem(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
}

export function tryParseCompose(composeText) {
  if (!composeText || composeText.trim().length === 0) {
    return { ok: true, obj: null }
  }
  
  try {
    const obj = yaml.load(composeText)
    if (!obj || typeof obj !== 'object') {
      return { ok: false, error: 'YAML parsed to non-object.' }
    }
    return { ok: true, obj }
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to parse YAML.' }
  }
}

export function dumpYaml(obj) {
  try {
    return yaml.dump(obj, { 
      lineWidth: 120, 
      noRefs: true, 
      sortKeys: false,
      noCompatMode: true
    })
  } catch (e) {
    console.error('YAML dump error:', e)
    return null
  }
}
