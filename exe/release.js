import * as fs from 'fs'
import { execSync } from 'child_process'
import * as readline from 'node:readline'

import * as common from './_common.js'

// console.debug(common.packageVersion)

const readlineInterface = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

console.info(`The current version is ${common.packageVersion}.`)

readlineInterface.question('What the new version? ', newVersion => {
	console.info('Updating manifest.json...')

	const newManifestRaw = common.manifestRaw.replace(
		/(?<begin>"version":\s*")(?<version>(?:\d\.)+\d)(?<end>")/i,
		`$<begin>${newVersion}$<end>`
	)

	fs.writeFileSync(common.manifestPath, newManifestRaw)

	console.info('Packing new version...')

	execSync('pnpm run pack')

	console.info('Committing version change...')

	execSync('git add manifest.json')
	execSync(`git commit -m "Update version to ${newVersion}"`)

	console.info('Tagging a new version...')

	execSync(`git tag -a v${newVersion} -m "Version ${newVersion}"`)

	console.info('Pushing commit...')
	execSync('git push')

	console.info('Pushing tags...')
	execSync('git push --tags')

	readlineInterface.close()
})
