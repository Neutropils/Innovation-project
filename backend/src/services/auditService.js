// Owner: Kwan - defect history / audit log (F02.10, F03.10, F07.3)
//
// CONTRACT (agreed in the skeleton PR - don't change the signature without telling the team):
//   logEvent({ defectId, actorId, action, fromStatus, toStatus, note }, { transaction })
//     defectId    required
//     actorId     users.id of who did it, or null for a system action
//     action      short verb: 'created', 'status_change', 'reassigned', 'update_posted', ...
//     fromStatus / toStatus   for status changes, otherwise omit
//     note        free text, e.g. a rejection reason
//   Returns the created DefectEvent.
//
// Pass the caller's transaction so the event is rolled back with the change it records.
const { DefectEvent } = require('../models')

async function logEvent({ defectId, actorId = null, action, fromStatus = null, toStatus = null, note = null }, { transaction } = {}) {
  return DefectEvent.create({ defectId, actorId, action, fromStatus, toStatus, note }, { transaction })
}

module.exports = { logEvent }
