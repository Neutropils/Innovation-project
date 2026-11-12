// Owner: Jerald - photo storage for inspection photos (F01.7) and repair evidence (F03.6)
//
// CONTRACT (agreed in the skeleton PR - don't change signatures without telling the team):
//   storePhoto({ buffer, originalName, mimeType }) -> { url }
//     Saves the file and returns where it can be fetched from.
//   createAttachment({ url, mimeType, uploadedBy, inspectionResultId, defectUpdateId }, { transaction })
//     Records it. Exactly one of inspectionResultId / defectUpdateId should be set.
//
// STUB: storePhoto returns a placeholder URL and stores nothing. Jerald replaces it once the
// team picks Supabase Storage or local disk (flag 3 in design/feature-dependencies.md).
// Receiving files over HTTP needs multer - a new dependency Jerald adds with his route.
const { Attachment } = require('../models')

async function storePhoto({ originalName = 'photo.jpg' } = {}) {
  return { url: `https://placehold.co/600x400?text=${encodeURIComponent(originalName)}` }
}

async function createAttachment({ url, mimeType = null, uploadedBy, inspectionResultId = null, defectUpdateId = null }, { transaction } = {}) {
  return Attachment.create({ url, mimeType, uploadedBy, inspectionResultId, defectUpdateId }, { transaction })
}

module.exports = { storePhoto, createAttachment }
