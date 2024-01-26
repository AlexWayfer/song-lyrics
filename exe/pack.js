const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

const common = require('./_common')

const packageName = path.basename(common.packageRoot)
// console.debug(`packageName = ${packageName}`)

const
	packageDir = path.resolve(common.packageRoot, 'pkg'),
	packagePath = path.resolve(packageDir, `${packageName}-${common.packageVersion}.zip`)
// console.debug(`packagePath = ${packagePath}`)

if (!fs.existsSync(packageDir)) {
	fs.mkdirSync(packageDir)
}

// create a file to stream archive data to.
const output = fs.createWriteStream(packagePath)
const archive = archiver('zip', {
	zlib: { level: 9 } // Sets the compression level.
})

// listen for all archive data to be written
// 'close' event is fired only when a file descriptor is involved
output.on('close', () => {
	console.info(`${archive.pointer()} total bytes`)
	console.info('archiver has been finalized and the output file descriptor has closed.')
})

// This event is fired when the data source is drained no matter what was the data source.
// It is not part of this library but rather from the NodeJS Stream API.
// @see: https://nodejs.org/api/stream.html#stream_event_end
output.on('end', () => {
	console.info('Data has been drained')
})

// good practice to catch warnings (ie stat failures and other non-blocking errors)
archive.on('warning', err => {
	if (err.code === 'ENOENT') {
		// log warning
		console.warning(err)
	} else {
		// throw error
		throw err
	}
})

// good practice to catch this error explicitly
archive.on('error', err => {
	throw err
})

// pipe archive data to the file
archive.pipe(output)

console.info('Packing...')

archive.directory('images/')
archive.directory('pages/')
archive.directory('scripts/compiled/')
archive.directory('styles/')

archive.file('manifest.json')
archive.file('README.md')

// finalize the archive (ie we are done appending files but streams have to finish yet)
// 'close', 'end' or 'finish' may be fired right after calling this method
// so register to them beforehand
archive.finalize()
