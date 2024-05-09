import * as fs from 'fs'
import * as path from 'path'
import { zip } from 'zip-a-folder'

import * as common from './_common.js'

const packageName = path.basename(common.packageRoot)
// console.debug(`packageName = ${packageName}`)

const
	packageDir = path.resolve(common.packageRoot, 'pkg'),
	packagePath = path.resolve(packageDir, `${packageName}-${common.packageVersion}.zip`)
// console.debug(`packagePath = ${packagePath}`)

if (!fs.existsSync(packageDir)) {
	fs.mkdirSync(packageDir)
}

console.info('Packing...')

await zip(
	'images/**/*, pages/**/*, scripts/compiled/**/*, styles/**/*, manifest.json, README.md',
	packagePath
)

console.info('Packed.')
