document.addEventListener('DOMContentLoaded', async event => {
	const
		loadingNotice = document.querySelector('.loading'),
		lyricsContainer = document.querySelector('.lyrics'),
		notFoundNotice = document.querySelector('.not-found'),
		notSupportedNotice = document.querySelector('.not-supported')

	const loadLyrics = async query => {
		const
			searchURL = `https://genius.com/api/search?q=${query}`,
			searchResponse = await fetch(searchURL)

		if (searchResponse.ok) {
			const firstHit = (await searchResponse.json()).response.hits[0]

			if (firstHit && firstHit.type == 'song') {
				const
					songData =
						(await (await fetch(`https://genius.com/api/songs/${firstHit.result.id}`)).json())
							.response.song,
					lyricsPage = await (await fetch(songData.description_annotation.url)).text(),
					parser = new DOMParser(),
					lyricsDocument = parser.parseFromString(lyricsPage, 'text/html')

				lyricsContainer.querySelector('.title').innerText = songData.full_title

				const
					lyricsElements =
						lyricsDocument.querySelector('[data-lyrics-container="true"]') ||
							lyricsDocument.querySelector('[class^="LyricsPlaceholder__Message"]')

				lyricsContainer.querySelector('.text').replaceChildren(lyricsElements)

				loadingNotice.classList.add('hidden')
				notFoundNotice.classList.add('hidden')
				notSupportedNotice.classList.add('hidden')

				lyricsContainer.classList.remove('hidden')
			} else {
				loadingNotice.classList.add('hidden')
				lyricsContainer.classList.add('hidden')
				notSupportedNotice.classList.add('hidden')

				notFoundNotice.classList.remove('hidden')
			}
		} else {
			const problemWindow = open(searchURL, '_blank', 'popup=true')
			problemWindow.addEventListener('beforeunload', event => {
				loadLyrics(query)
			})
		}
	}

	const
		currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0],
		currentTabHostname = (new URL(currentTab.url)).hostname

	switch(currentTabHostname) {
		case 'deezer.com':
		case 'www.deezer.com':
			chrome.scripting.executeScript({
				target: { tabId : currentTab.id },
				func: () => {
					return document.querySelector('#page_player .track-title').innerText
				}
			}, injectionResult => {
				// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				const songTitle = injectionResult[0].result
				// console.debug('songTitle = ', songTitle)
				loadLyrics(songTitle)
			})

			break
		default:
			loadingNotice.classList.add('hidden')
			lyricsContainer.classList.add('hidden')
			notFoundNotice.classList.add('hidden')

			notSupportedNotice.classList.remove('hidden')
	}
})
