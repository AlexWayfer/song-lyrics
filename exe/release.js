const fs = require('fs')
const execSync = require('child_process').execSync

const common = require('./_common')

// console.debug(common.packageVersion)

const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
})

console.log(`The current version is ${common.packageVersion}.`)

readline.question('What the new version? ', newVersion => {
	console.log('Updating manifest.json...')

	newManifestRaw = common.manifestRaw.replace(
		/(?<begin>"version":\s*")(?<version>(?:\d\.)+\d)(?<end>")/i,
		`$<begin>${newVersion}$<end>`
	)

	fs.writeFileSync(common.manifestPath, newManifestRaw)

	console.log('Packing new version...')

	execSync('pnpm run pack')

	console.log('Committing version change...')

	execSync('git add manifest.json')
	execSync(`git commit -m "Update version to ${newVersion}"`)

	console.log('Tagging a new version...')

	execSync(`git tag -a v${newVersion} -m "Version ${newVersion}"`)

	console.log('Pushing commit...')
	execSync(`git push`)

	console.log('Pushing tags...')
	execSync(`git push --tags`)

	readline.close()
});
