import { cpSync, existsSync, mkdirSync, rmSync, lstatSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const sourceDir = resolve(rootDir, '..', 'data', 'audits')
const targetDir = resolve(rootDir, 'public', 'data', 'audits')

console.log('Copying audit data to public folder...')

if (!existsSync(sourceDir)) {
  // Check if data already exists in public (e.g., on Vercel where source won't exist)
  if (existsSync(targetDir)) {
    console.log('Source not found, but data already exists in public folder. Skipping copy.')
    process.exit(0)
  }
  console.warn('Warning: Source directory does not exist:', sourceDir)
  console.warn('Run the audit script first to generate data.')
  process.exit(0)
}

// Remove existing target (symlink or directory)
if (existsSync(targetDir) || lstatSync(targetDir, { throwIfNoEntry: false })) {
  try {
    const stats = lstatSync(targetDir)
    if (stats.isSymbolicLink()) {
      rmSync(targetDir)
    } else {
      rmSync(targetDir, { recursive: true })
    }
  } catch {
    // Ignore if doesn't exist
  }
}

mkdirSync(targetDir, { recursive: true })

cpSync(sourceDir, targetDir, { recursive: true, dereference: true })

console.log('Audit data copied successfully!')
console.log(`  From: ${sourceDir}`)
console.log(`  To:   ${targetDir}`)
