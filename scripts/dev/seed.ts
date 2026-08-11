import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFile } from 'node:fs/promises'
import {
  assertDevProjectId,
  buildBootstrapDataset,
  seedEntries,
} from './bootstrapData.js'

const dryRun = process.argv.includes('--dry-run')
const projectId = process.env.DEV_FIREBASE_PROJECT_ID
const uid = process.env.DEV_AUTH_UID
const email = process.env.DEV_AUTH_EMAIL

assertDevProjectId(projectId)
if (!uid || !email) {
  throw new Error('DEV_AUTH_UID et DEV_AUTH_EMAIL sont obligatoires.')
}

const dataset = buildBootstrapDataset(uid, email)
const entries = seedEntries(dataset)

if (dryRun) {
  console.log(`[DRY RUN] Projet validé : ${projectId}`)
  for (const entry of entries)
    console.log(`[DRY RUN] UPSERT ${entry.collection}/${entry.id}`)
  console.log(`[DRY RUN] ${entries.length} documents validés, aucune écriture.`)
  process.exit(0)
}

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
const credential = serviceAccountPath
  ? cert(JSON.parse(await readFile(serviceAccountPath, 'utf8')))
  : applicationDefault()
const app = getApps()[0] ?? initializeApp({ projectId, credential })

const authUser = await getAuth(app).getUser(uid)
if (authUser.email?.toLowerCase() !== email.toLowerCase()) {
  throw new Error(
    'DEV_AUTH_EMAIL ne correspond pas au compte Firebase Auth indiqué.',
  )
}

const firestore = getFirestore(app)
const writer = firestore.bulkWriter()
writer.onWriteError((error) => {
  console.error(
    `Échec ${error.documentRef.path} (tentative ${error.failedAttempts}).`,
  )
  return error.failedAttempts < 3
})
for (const entry of entries) {
  writer.set(firestore.collection(entry.collection).doc(entry.id), entry.data, {
    merge: true,
  })
  console.log(`UPSERT ${entry.collection}/${entry.id}`)
}
await writer.close()
console.log(
  `Seed DEV terminé : ${entries.length} documents créés ou mis à jour.`,
)
