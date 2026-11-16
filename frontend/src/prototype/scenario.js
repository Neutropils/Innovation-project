// Prototype data scenario, so a presenter can show each page's states on demand:
//   normal - demo data   empty - no records   offline - no connection   error - the server fails
// Stored per browser tab; DemoScenarioBar switches it.

const KEY = 'elev8_demo_scenario'
export const SCENARIOS = ['normal', 'empty', 'offline', 'error']

export function getScenario() {
  try {
    const value = sessionStorage.getItem(KEY)
    return SCENARIOS.includes(value) ? value : 'normal'
  } catch {
    return 'normal'
  }
}

export function setScenario(value) {
  sessionStorage.setItem(KEY, value)
  window.dispatchEvent(new Event('elev8-scenario'))
}
