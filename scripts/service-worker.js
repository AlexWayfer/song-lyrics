chrome.contextMenus.onClicked.addListener(info => {
	switch (info.menuItemId) {
		case 'clear-cache':
			chrome.storage.local.remove('cache')
			break
		default:
			console.error('Unknown context menu clicked', info)
	}
})

chrome.runtime.onInstalled.addListener(_details => {
	console.debug('context menu create')

	chrome.contextMenus.create({
		title: 'Clear lyrics cache',
		contexts: ['action'],
		id: 'clear-cache'
	})
})
