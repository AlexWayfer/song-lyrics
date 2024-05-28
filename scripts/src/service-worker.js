chrome.action.onClicked.addListener(async tab => {
	// console.debug('chrome.action.onClicked')

	//// We can't do it right now
	// chrome.action.openPopup()

	//// https://stackoverflow.com/a/73586624/2630849
	chrome.scripting.executeScript(
		{
			target: { tabId: tab.id },
			files: ['./scripts/compiled/popup_container.js']
		},
		() => {
			chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: () => {
					// console.debug('chrome.scripting PopupContainer = ', PopupContainer)

					const popupContainer = new PopupContainer({ window })

					if (popupContainer.alreadyExist) {
						popupContainer.remove()
					} else {
						popupContainer.append()
					}
				}
			})
		}
	)
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
