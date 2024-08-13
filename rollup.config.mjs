import { globSync } from 'glob'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import notify from 'rollup-plugin-notify'

export default {
	//// https://rollupjs.org/configuration-options/#input
	input: Object.fromEntries(
		globSync('scripts/src/**/*.js').map(file => [
			// This remove `src/` as well as the file extension from each
			// file, so e.g. src/nested/foo.js becomes nested/foo
			path.relative(
				'scripts/src',
				file.slice(0, file.length - path.extname(file).length)
			),
			// This expands the relative paths to absolute paths, so e.g.
			// src/nested/foo becomes /project/src/nested/foo.js
			fileURLToPath(new URL(file, import.meta.url))
		])
	),
	output: {
		format: 'es',
		dir: 'scripts/compiled/'
	},
	plugins: [
		commonjs(),
		resolve({
			browser: true,
			// It doesn't allow to require `punycode`
			preferBuiltins: false,
			isRequire: true
		}),
		notify()
	]
}
