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
				iframe = document.createElement('iframe')

			container.style = `
				display: flex;
				resize: both;
				overflow: auto;
				position: fixed;
				top: 50px;
				left: calc(100vw - ${containerWidth} - 50px);
				width: ${containerWidth};
				height: 600px;
				border: 3px solid var(--border-color);
				user-select: none;
				z-index: 999999999;
			`

			container.id = 'song-lyrics-container'

			iframe.style = 'flex-grow: 1; border: none;'
			// iframe.setAttribute('allow', '')
			iframe.src = chrome.runtime.getURL('pages/popup.html')

			// console.debug('window = ', window)

			window.popupMessageListener = event => {
				// console.debug('message event = ', event)
				// console.debug('chrome.runtime.id = ', chrome.runtime.id)

				if (event.origin != `chrome-extension://${chrome.runtime.id}`) return

				container.style.setProperty('--border-color', event.data.colors.border)
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
