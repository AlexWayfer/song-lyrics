import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const packageRoot = path.resolve(__dirname, '..')
export const manifestPath = path.resolve(packageRoot, 'manifest.json')
export const manifestRaw = fs.readFileSync(manifestPath).toString()
export const manifest = JSON.parse(manifestRaw)
export const packageVersion = manifest.version
