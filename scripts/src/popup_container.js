window.PopupContainer = class {
	static #elementId = 'song-lyrics-container'

	constructor({ window, width = '500px' } = {}) {
		this.window = window

		this.element = this.window.document.getElementById(this.constructor.#elementId)

		if (this.element) {
			this.alreadyExist = true

			this.header = this.element.querySelector('h1')
		} else {
			this.alreadyExist = false

			this.element = this.#elementConstructor(width)

			this.header = this.#headerConstructor()
			this.element.appendChild(this.header)

			this.element.appendChild(this.#iframeConstructor())

			this.#windowMessagesConstructor()
		}
	}

	append() {
		this.window.document.body.appendChild(this.element)
	}

	remove() {
		this.element.remove()
		this.window.removeEventListener('message', this.window.popupMessageListener)
		return
	}

	#elementConstructor(width) {
		const element = document.createElement('div')

		element.id = this.constructor.#elementId

		element.style = `
			display: flex;
			flex-direction: column;
			resize: both;
			overflow: auto;
			position: fixed;
			top: 50px;
			left: calc(100vw - ${width} - 50px);
			width: ${width};
			height: 600px;
			border-width: 3px;
			border-style: solid;
			border-color: transparent;
			user-select: none;
			z-index: 999999999;
		`
		element.draggingEvent = event => {
			const
				elementRect = element.getBoundingClientRect(),
				newLeft = elementRect.left + event.clientX - element.lastPosition.left,
				newTop = elementRect.top + event.clientY - element.lastPosition.top

			element.style.left = `${newLeft}px`
			element.style.top = `${newTop}px`

			element.lastPosition = { left: event.clientX, top: event.clientY }
		}

		return element
	}

	#headerConstructor() {
		const header = document.createElement('h1')

		header.innerText = 'Song Lyrics'

		header.style = `
			font-size: 16px;
			font-weight: bold;
			padding: 0.1em 0.4em 0.4em;
			cursor: move;
		`

		header.addEventListener('mousedown', event => {
			this.element.lastPosition = { left: event.clientX, top: event.clientY }

			header.addEventListener('mousemove', this.element.draggingEvent)
		})

		header.addEventListener('mouseup', _event => {
			// console.debug('header mouseup')

			this.element.lastPosition = null
			header.removeEventListener('mousemove', this.element.draggingEvent)
		})

		header.addEventListener('mouseout', _event => {
			// console.debug('header mouseout')

			// this.element.draggingEvent(event)

			this.element.lastPosition = null
			header.removeEventListener('mousemove', this.element.draggingEvent)
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
		this.window.popupMessageListener = event => {
			// console.debug('message event = ', event)
			// console.debug('chrome.runtime.id = ', chrome.runtime.id)

			if (event.origin != `chrome-extension://${chrome.runtime.id}`) return

			this.element.style.borderColor = event.data.colors.border
			this.header.style.background = this.element.style.borderColor
		}
		this.window.addEventListener('message', this.window.popupMessageListener)
	}
}
