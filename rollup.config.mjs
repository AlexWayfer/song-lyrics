import multiInput from 'rollup-plugin-multi-input'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import notify from 'rollup-plugin-notify'

export default {
	input: ['scripts/src/**/*.js'],
	output: {
		format: 'es',
		dir: 'scripts/compiled/'
	},
	plugins: [
		// https://github.com/alfredosalzillo/rollup-plugin-multi-input/issues/61
		multiInput.default({ relative: 'scripts/src/' }),
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
