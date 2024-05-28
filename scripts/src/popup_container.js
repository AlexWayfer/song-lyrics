window.PopupContainer = class {
	static #elementId = 'song-lyrics-container'
	static #borderWidth = '3px'

	constructor({ width = '500px' } = {}) {
		this.element = document.getElementById(this.constructor.#elementId)

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
		document.body.appendChild(this.element)
	}

	remove() {
		this.element.remove()
		window.removeEventListener('message', window.popupMessageListener)
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
			border-width: ${this.constructor.#borderWidth};
			border-style: solid;
			border-color: transparent;
			user-select: none;
			z-index: 999999999;
		`
		element.draggingEvent = event => {
			const
				elementRect = element.getBoundingClientRect()

			// console.debug('elementRect.left = ', elementRect.left)
			// console.debug('event.clientX = ', event.clientX)
			// console.debug('element.lastPosition.left = ', element.lastPosition.left)

			const
				newLeft = elementRect.left + event.clientX - element.lastPosition.left,
				newTop = elementRect.top + event.clientY - element.lastPosition.top

			element.style.left = `${newLeft}px`
			element.style.top = `${newTop}px`

			element.lastPosition = { left: event.clientX, top: event.clientY }
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
		window.popupMessageListener = event => {
			// console.debug('message event = ', event)
			// console.debug('chrome.runtime.id = ', chrome.runtime.id)

			if (event.origin != `chrome-extension://${chrome.runtime.id}`) return

			this.element.style.borderColor = event.data.colors.border
			this.header.style.background = this.element.style.borderColor
		}
		window.addEventListener('message', window.popupMessageListener)
	}
}
