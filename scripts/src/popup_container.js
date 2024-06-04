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
		return (async () => (await chrome.storage.local.get({ popupSettings: {} })).popupSettings)()
	}

	set #settings(newValues) {
		return (async () => {
			const settings = await this.#settings

			// console.debug('settings = ', settings)
			// console.debug('newValues = ', newValues)
			// console.debug('Object.assign(settings, newValues) = ', Object.assign(settings, newValues))

			chrome.storage.local.set({ popupSettings: Object.assign(settings, newValues) })
		})()
	}

	async #elementConstructor() {
		const element = document.createElement('div')

		element.id = this.constructor.#elementId

		const
			settings = await this.#settings,
			width = `${settings.width || 500}px`,
			height = `${settings.height || 600}px`,
			top = settings.top || '50px',
			left = settings.left || `calc(100vw - ${width} - 50px)`

		// console.debug('settings = ', settings)

		element.style = `
			display: flex;
			flex-direction: column;
			resize: both;
			overflow: auto;
			position: fixed;
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

		const resizeObserver = new ResizeObserver(entries => {
			// console.debug('entries = ', entries)

			if (this.resizeEvent) clearTimeout(this.resizeEvent)

			this.resizeEvent = setTimeout(() => {
				const { width, height } = entries[0].contentRect

				// console.debug('width = ', width)
				// console.debug('height = ', height)

				if (width == 0 && height == 0) return

				// console.debug('rewrite sizes')

				this.#settings = { width, height }
			}, 200)
		})
		resizeObserver.observe(element)

		element.movingEvent = event => {
			const
				newLeft = event.screenX - element.moveScreenPosition.x,
				newTop = event.screenY - element.moveScreenPosition.y

			element.style.left = `${newLeft}px`
			element.style.top = `${newTop}px`

			this.#settings = { left: element.style.left, top: element.style.top }
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
			padding-bottom: 0.2em;
		`

		header.appendChild(title)

		const closeButton = document.createElement('button')

		closeButton.style = `
			line-height: 1em;
			padding: 0.4em;
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

			this.element.moveScreenPosition = {
				x: event.screenX - this.element.offsetLeft,
				y: event.screenY - this.element.offsetTop
			}

			document.addEventListener('mousemove', this.element.movingEvent)
		})

		header.addEventListener('mouseup', _event => {
			// console.debug('header mouseup')

			this.element.moveScreenPosition = null
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

	#windowMessagesConstructor() {
		window.popupMessageListener = event => {
			// console.debug('message event = ', event)
			// console.debug('chrome.runtime.id = ', chrome.runtime.id)

			if (event.origin != `chrome-extension://${chrome.runtime.id}`) return

			switch (event.data.name) {
				case 'setColors':
					this.element.style.borderColor = event.data.colors.border
					this.header.style.background = this.element.style.borderColor

					break
				case 'mousemove':
					if (!this.element.moveScreenPosition) return

					this.element.movingEvent(event.data.coordinates)

					break
				default:
					console.error('Undefined window message recieved: ', event)
			}
		}
		window.addEventListener('message', window.popupMessageListener)
	}
}
