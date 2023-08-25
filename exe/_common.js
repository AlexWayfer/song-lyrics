const fs = require('fs')
const path = require('path')

exports.packageRoot = path.resolve(__dirname, '..')

exports.manifestPath = path.resolve(exports.packageRoot, 'manifest.json')
exports.manifestRaw = fs.readFileSync(exports.manifestPath).toString()
exports.manifest = JSON.parse(exports.manifestRaw)

exports.packageVersion = exports.manifest.version
