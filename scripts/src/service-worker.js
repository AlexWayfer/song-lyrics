chrome.action.onClicked.addListener(async tab => {
	// console.debug('chrome.action.onClicked')

	//// We can't do it right now
	// chrome.action.openPopup()

	chrome.scripting.executeScript({
		target: { tabId: tab.id },
		func: () => {
			const oldIframeContainer = document.getElementById('song-lyrics-container')

			if (oldIframeContainer) {
				oldIframeContainer.remove()
				window.removeEventListener('message', window.popupMessageListener)
				return
			}

			const
				container = document.createElement('div'),
				containerWidth = '500px',
				containerHeader = document.createElement('h1'),
				iframe = document.createElement('iframe')

			container.style = `
				display: flex;
				flex-direction: column;
				resize: both;
				overflow: auto;
				position: fixed;
				top: 50px;
				left: calc(100vw - ${containerWidth} - 50px);
				width: ${containerWidth};
				height: 600px;
				border-width: 3px;
				border-style: solid;
				border-color: transparent;
				user-select: none;
				z-index: 999999999;
			`

			container.id = 'song-lyrics-container'

			containerHeader.innerText = 'Song Lyrics'
			containerHeader.style.fontSize = '16px'
			containerHeader.style.fontWeight = 'bold'
			containerHeader.style.padding = '0.1em 0.4em 0.4em'
			containerHeader.style.cursor = 'move'

			container.draggingEvent = event => {
				const
					containerRect = container.getBoundingClientRect(),
					newLeft = containerRect.left + event.clientX - container.lastPosition.left,
					newTop = containerRect.top + event.clientY - container.lastPosition.top

				container.style.left = `${newLeft}px`
				container.style.top = `${newTop}px`

				container.lastPosition = { left: event.clientX, top: event.clientY }
			}

			containerHeader.addEventListener('mousedown', event => {
				container.lastPosition = { left: event.clientX, top: event.clientY }

				containerHeader.addEventListener('mousemove', container.draggingEvent)
			})

			containerHeader.addEventListener('mouseup', _event => {
				// console.debug('containerHeader mouseup')

				container.lastPosition = null

				container.removeEventListener('mousemove', container.draggingEvent)
			})

			containerHeader.addEventListener('mouseout', event => {
				// console.debug('containerHeader mouseout')

				// container.lastPosition = null
				container.draggingEvent(event)

				container.removeEventListener('mousemove', container.draggingEvent)
			})

			container.appendChild(containerHeader)

			iframe.style = 'flex-grow: 1; border: none;'
			// iframe.setAttribute('allow', '')
			iframe.src = chrome.runtime.getURL('pages/popup.html')

			window.popupMessageListener = event => {
				// console.debug('message event = ', event)
				// console.debug('chrome.runtime.id = ', chrome.runtime.id)

				if (event.origin != `chrome-extension://${chrome.runtime.id}`) return

				container.style.borderColor = event.data.colors.border
				containerHeader.style.background = container.style.borderColor
			}
			window.addEventListener('message', window.popupMessageListener)

			container.appendChild(iframe)
			document.body.appendChild(container)
		}
	})
})

chrome.contextMenus.onClicked.addListener(info => {
	switch (info.menuItemId) {
		case 'clear-cache':
			chrome.storage.local.remove('cache')
			break
		default:
			console.error('Unknown context menu clicked', info)
	}
})

chrome.runtime.onInstalled.addListener(async _details => {
	chrome.storage.local.remove('cache')

	chrome.contextMenus.create({
		title: 'Clear lyrics cache',
		contexts: ['action'],
		id: 'clear-cache'
	})

	const currentSettings = (await chrome.storage.sync.get({ settings: {} })).settings
	currentSettings.theme ??= 'site'
	currentSettings.displaySongArt ??= true
	chrome.storage.sync.set({ settings: currentSettings })
})
