document.addEventListener('DOMContentLoaded', async event => {
	const
		loadingNotice = document.querySelector('.loading'),
		lyricsContainer = document.querySelector('.lyrics'),
		notFoundNotice = document.querySelector('.not-found'),
		notSupportedNotice = document.querySelector('.not-supported')

	const displayLyrics = (songTitle, lyricsHTML) => {
		const
			parser = new DOMParser(),
			lyricsDocument = parser.parseFromString(lyricsHTML, 'text/html')

		lyricsContainer.querySelector('.title').innerText = songTitle

		const
			lyricsElement =
				lyricsDocument.querySelector('[data-lyrics-container="true"]') ||
					lyricsDocument.querySelector('[class^="LyricsPlaceholder__Message"]')

		//// Remove links, they're not working.
		//// I've tried `.innerText`, it returns value with `\n` in console of a regular page,
		//// but it returns without `\n` from `DOMParser`.
		lyricsElement.childNodes.forEach(childNode => {
			if (childNode.tagName == 'A') {
				childNode.replaceWith(...childNode.childNodes)
			}
		})

		//// Fill with lyrics
		lyricsContainer.querySelector('.text').replaceChildren(lyricsElement)

		//// Display elements
		loadingNotice.classList.add('hidden')
		notFoundNotice.classList.add('hidden')
		notSupportedNotice.classList.add('hidden')

		lyricsContainer.classList.remove('hidden')
	}

	const loadLyrics = async query => {
		const
			cache = await chrome.storage.local.get('cache'),
			cached = cache[query],
			cacheTTL = 24 * 60 * 60 * 1000 //// 24 hours

		//// https://bugs.chromium.org/p/chromium/issues/detail?id=1472588
		if (cached && new Date(new Date(cached.createdAt).getTime() + cacheTTL) > new Date()) {
			return displayLyrics(cached.songTitle, cached.lyricsHTML)
		}

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
					songTitle = songData.full_title,
					lyricsPage = await (await fetch(songData.description_annotation.url)).text()

				//// Write to cache
				//// https://bugs.chromium.org/p/chromium/issues/detail?id=1472588
				cache[query] = { songTitle, lyricsHTML: lyricsPage, createdAt: (new Date()).toString() }
				chrome.storage.local.set({ cache })

				displayLyrics(songTitle, lyricsPage)
			} else {
				loadingNotice.classList.add('hidden')
				lyricsContainer.classList.add('hidden')
				notSupportedNotice.classList.add('hidden')

				notFoundNotice.classList.remove('hidden')
			}
		} else {
			const problemWindow = open(searchURL, '_blank', 'popup=true')

			problemWindow.addEventListener('load', event => {
				console.debug('load, event =')
				console.debug(event)
			})
			problemWindow.addEventListener('beforeunload', event => {
				loadLyrics(query)
			})
		}
	}

	const
		currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0],
		currentTabHostname = (new URL(currentTab.url)).hostname,
		featuringRegexp = / \(?f(ea)?t\.? .+\)?/

	switch(currentTabHostname) {
		case 'deezer.com':
		case 'www.deezer.com':
			chrome.scripting.executeScript({
				target: { tabId : currentTab.id },
				func: () => {
					return document.querySelector('#page_player .track-title').innerText
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let
					songTitle = injectionResult[0].result,
					[songName, songArtists] = songTitle.split(' · ', 2)

				console.debug('songTitle = ', songTitle)
				console.debug('songName = ', songName)
				console.debug('songArtists = ', songArtists)

				songName = songName.replace(featuringRegexp, '')
				//// Take only the first artist, second can be from the featuring
				songArtist = songArtists.split(', ', 2)[0]

				const query = `${songName} ${songArtist}`
				console.debug('query = ', query)

				loadLyrics(query)
			})

			break
		case 'youtube.com':
		case 'www.youtube.com':
			chrome.scripting.executeScript({
				target: { tabId : currentTab.id },
				func: () => {
					return document.querySelector('#below #title').innerText
				}
			}, injectionResult => {
				// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let songTitle = injectionResult[0].result

				//// Remove additional notes from song title
				songTitle = songTitle.replace('(Video)', '').replace(featuringRegexp, '')

				console.debug('songTitle = ', songTitle)
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
