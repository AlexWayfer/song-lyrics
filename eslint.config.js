import globals from 'globals'
import js from '@eslint/js'
import stylisticJs from '@stylistic/eslint-plugin-js'

export default [
	js.configs.recommended,
	stylisticJs.configs['all-flat'],
	{
		// files: ['**/*.js'],
		plugins: {
			'@stylistic/js': stylisticJs
		},
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.webextensions
			}
		},
		rules: {
			'no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_'
				}
			],
			'@stylistic/js/indent': ['error', 'tab', { SwitchCase: 1 }],
			'@stylistic/js/semi': ['error', 'never'],
			'@stylistic/js/quotes': ['warn', 'single', { avoidEscape: true }],
			'@stylistic/js/object-curly-spacing': ['warn', 'always'],
			'@stylistic/js/arrow-parens': ['warn', 'as-needed'],
			'@stylistic/js/padded-blocks': ['warn', 'never'],
			'@stylistic/js/function-call-argument-newline': ['warn', 'consistent'],
			'@stylistic/js/quote-props': ['warn', 'as-needed'],
			'@stylistic/js/dot-location': ['warn', 'property'],
			'@stylistic/js/spaced-comment': ['warn', 'always', { markers: ['//'] }],
			'@stylistic/js/object-property-newline': ['warn', { allowAllPropertiesOnSameLine: true }],
			'@stylistic/js/multiline-comment-style': ['warn', 'separate-lines'],
			'@stylistic/js/multiline-ternary': ['warn', 'never'],
			'@stylistic/js/function-paren-newline': ['warn', 'multiline-arguments'],
			'@stylistic/js/array-element-newline': ['warn', 'consistent']
		}
	},
	{
		files: ['exe/*.js'],
		languageOptions: {
			globals: {
				...globals.node
			}
		}
	},
	{
		ignores: ['scripts/compiled/']
	}
]
