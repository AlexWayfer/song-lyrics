window.PopupContainer = class {
	static #elementId = 'song-lyrics-container'

	static #borderWidth = '3px'

	constructor() {
		this.element = document.getElementById(this.constructor.#elementId)

		if (this.element) {
			this.alreadyExist = true

			this.header = this.element.querySelector('h1')
		} else {
			this.alreadyExist = false

			// You should call `asyncConstructor` method
		}
	}

	async asyncConstructor() {
		this.element = await this.#elementConstructor()

		this.header = this.#headerConstructor()
		this.element.appendChild(this.header)

		this.iframe = this.#iframeConstructor()
		this.element.appendChild(this.iframe)

		this.resizeCorner = this.#resizeCornerConstructor()
		this.element.appendChild(this.resizeCorner)

		this.#windowMessagesConstructor()
	}

	append() {
		document.body.appendChild(this.element)
	}

	remove() {
		this.element.remove()
		window.removeEventListener('message', window.popupMessageListener)
		return
	}

	get #settings() {
		return (async () => {
			const popupSettings = (await chrome.storage.local.get({ popupSettings: {} })).popupSettings

			// console.debug('popupSettings = ', popupSettings)
			// console.debug('window.location.host = ', window.location.host)

			return popupSettings
		})()
	}

	get #settingsPerHost() {
		return (async () => {
			const settings = await this.#settings

			// console.debug('settings = ', settings)
			// console.debug('window.location.host = ', window.location.host)

			const settingsPerHost = settings[window.location.host] ??= {}

			return settingsPerHost
		})()
	}

	set #settings(newValues) {
		(async () => {
			const settings = await this.#settings

			// console.debug('settings = ', settings)
			// console.debug('newValues = ', newValues)
			// console.debug('Object.assign(settings, newValues) = ', Object.assign(settings, newValues))

			chrome.storage.local.set({ popupSettings: Object.assign(settings, newValues) })
		})()
	}

	set #settingsPerHost(newValues) {
		(async () => {
			const settingsPerHost = await this.#settingsPerHost

			// console.debug('settings = ', settings)
			// console.debug('newValues = ', newValues)
			// console.debug('Object.assign(settings, newValues) = ', Object.assign(settings, newValues))

			this.#settings = { [window.location.host]: Object.assign(settingsPerHost, newValues) }
		})()
	}

	async #elementConstructor() {
		const element = document.createElement('div')

		element.id = this.constructor.#elementId

		const
			settingsPerHost = await this.#settingsPerHost,
			width = `${settingsPerHost.width || 500}px`,
			height = `${settingsPerHost.height || 600}px`,
			top = settingsPerHost.top || '50px',
			left = settingsPerHost.left || `calc(100vw - ${width} - 50px)`

		// console.debug('settingsPerHost = ', settingsPerHost)

		element.style = `
			display: flex;
			flex-direction: column;
			position: fixed;
			min-width: 400px;
			min-height: 200px;
			top: ${top};
			left: ${left};
			width: ${width};
			height: ${height};
			border-width: ${this.constructor.#borderWidth};
			border-style: solid;
			border-color: transparent;
			user-select: none;
			z-index: 999999999;
		`

		element.movingEvent = event => {
			const
				newLeft = event.clientX - element.moveScreenPosition.x,
				newTop = event.clientY - element.moveScreenPosition.y

			// console.debug('newLeft = ', newLeft)
			// console.debug('newTop = ', newTop)

			element.style.left = `${newLeft}px`
			element.style.top = `${newTop}px`

			this.#settingsPerHost = { left: element.style.left, top: element.style.top }
		}

		element.resizingEvent = event => {
			// console.debug('resizingEvent')

			const
				newWidth = event.clientX - element.resizeScreenPosition.x,
				newHeight = event.clientY - element.resizeScreenPosition.y

			element.style.width = `${newWidth}px`
			element.style.height = `${newHeight}px`

			this.#settingsPerHost = { width: newWidth, height: newHeight }
		}

		return element
	}

	#headerConstructor() {
		const header = document.createElement('div')

		header.style = `
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding:
				calc(0.2em - ${this.constructor.#borderWidth}) 0.2em 0.2em 0.4em;
			cursor: move;
		`

		const title = document.createElement('h1')

		title.innerText = 'Song Lyrics'

		title.style = `
			font-size: 16px;
			font-weight: bold;
			margin: 0;
			padding-bottom: 0.2em;
			color: inherit;
		`

		header.appendChild(title)

		const closeButton = document.createElement('button')

		closeButton.style = `
			line-height: 1em;
			padding: 0.4em;
			color: inherit;
			background: transparent;
			border: none;
			cursor: pointer;
		`

		closeButton.addEventListener('click', _event => {
			this.remove()
		})

		const closeIconSize = '18'

		//// https://www.iconfinder.com/icons/293668/close_icon
		closeButton.innerHTML = `
			<svg
				width="${closeIconSize}"
				height="${closeIconSize}"
				viewBox="0 0 32 32"
				fill="currentColor"
				style="vertical-align: middle;"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M4 8 L8 4 L16 12 L24 4 L28 8 L20 16 L28 24 L24 28 L16 20 L8 28 L4 24 L12 16 z"/>
			</svg>
		`
		// closeButton.appendChild(closeIcon)

		header.appendChild(closeButton)

		header.addEventListener('mousedown', event => {
			// console.debug('header mousedown event = ', event)

			const rect = this.element.getBoundingClientRect()

			this.element.moveScreenPosition = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			}

			// console.debug('this.element.moveScreenPosition = ', this.element.moveScreenPosition)
			// console.debug('this.element.style.left = ', this.element.style.left)
			// console.debug('this.element.style.top = ', this.element.style.top)
			// console.debug('this.element.offsetLeft = ', this.element.offsetLeft)
			// console.debug('this.element.offsetTop = ', this.element.offsetTop)

			this.iframe.style.setProperty('pointer-events', 'none')

			document.addEventListener('mousemove', this.element.movingEvent)
		})

		header.addEventListener('mouseup', _event => {
			// console.debug('header mouseup')

			this.element.moveScreenPosition = null

			this.iframe.style.removeProperty('pointer-events')

			document.removeEventListener('mousemove', this.element.movingEvent)
		})

		return header
	}

	#iframeConstructor() {
		const iframe = document.createElement('iframe')

		iframe.style = `
			flex-grow: 1;
			border: none;
		`

		// iframe.setAttribute('allow', '')
		iframe.src = chrome.runtime.getURL('pages/popup.html')

		return iframe
	}

	#resizeCornerConstructor() {
		const resizeCorner = document.createElement('div')

		resizeCorner.style = `
			position: absolute;
			bottom: -${this.constructor.#borderWidth};
			right: -${this.constructor.#borderWidth};
			--size: 24px;
			width: var(--size);
			height: var(--size);
			padding: 4px;
			opacity: 0.8;
			cursor: nwse-resize;
		`

		resizeCorner.innerHTML = `
			<svg
				fill="currentColor"
				viewBox="0 0 79.124 78.876"
				style="transform: rotate(90deg);"
			>
				<path d="M47.624,0l12.021,9.73L44.5,24.376l10,10l14.661-15.161L79.124,31.5V0H47.624z M24.5,44.376L9.847,59.529L0,47.376v31.5  h31.5l-12.153-9.847L34.5,54.376L24.5,44.376z"/>
			</svg>
		`

		resizeCorner.addEventListener('mousedown', event => {
			// console.debug('resizeCorner mousedown event = ', event)

			const rect = this.element.getBoundingClientRect()

			this.element.resizeScreenPosition = {
				x: event.clientX - rect.width,
				y: event.clientY - rect.height
			}

			this.iframe.style.setProperty('pointer-events', 'none')

			document.addEventListener('mousemove', this.element.resizingEvent)
		})

		resizeCorner.addEventListener('mouseup', _event => {
			// console.debug('resizeCorner mouseup')

			this.element.resizeScreenPosition = null

			this.iframe.style.removeProperty('pointer-events')

			document.removeEventListener('mousemove', this.element.resizingEvent)
		})

		return resizeCorner
	}

	#windowMessagesConstructor() {
		window.popupMessageListener = event => {
			// console.debug('message event = ', event)
			// console.debug('chrome.runtime.id = ', chrome.runtime.id)

			if (event.origin != `chrome-extension://${chrome.runtime.id}`) return

			switch (event.data.name) {
				case 'setColors':
					this.element.style.borderColor =
						this.resizeCorner.style.backgroundColor =
							event.data.colors.border
					this.header.style.background = this.element.style.borderColor
					this.header.style.color = event.data.colors.text

					break
				default:
					console.error('Undefined window message recieved: ', event)
			}
		}
		window.addEventListener('message', window.popupMessageListener)
	}
}
