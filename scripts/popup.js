document.addEventListener('DOMContentLoaded', async event => {
	const currentSettings = (await chrome.storage.sync.get({ settings: {} })).settings
	document.body.classList.add(`${currentSettings.theme}-theme`)

	const
		loadingNotice = document.querySelector('.loading'),
		lyricsContainer = document.querySelector('.lyrics'),
		notFoundNotice = document.querySelector('.not-found'),
		notSupportedNotice = document.querySelector('.not-supported'),
		loadForm = document.querySelector('form.load'),
		queryInput = loadForm.querySelector('input[name="query"]')

	loadForm.addEventListener('submit', event => {
		event.preventDefault()

		notFoundNotice.classList.add('hidden')
		notSupportedNotice.classList.add('hidden')
		lyricsContainer.classList.add('hidden')

		loadForm.classList.remove('hidden')
		loadingNotice.classList.remove('hidden')

		loadLyrics(queryInput.value)
	})

	const setColors = (colors) => {
		document.documentElement.style.setProperty('--site-background-color', colors.background);
		document.documentElement.style.setProperty('--site-text-color', colors.text);
		document.documentElement.style.setProperty('--site-link-color', colors.link);
		document.documentElement.style.setProperty('--site-border-color', colors.border);
	}

	const displayLyrics = (songData, lyricsHTML) => {
		const
			parser = new DOMParser(),
			lyricsDocument = parser.parseFromString(lyricsHTML, 'text/html')

		lyricsContainer.querySelector('.title').innerText = songData.full_title
		lyricsContainer.querySelector('.link').href = songData.url

		let
			lyricsElements = Array.from(
				lyricsDocument.querySelectorAll('[data-lyrics-container="true"]') ||
					lyricsDocument.querySelectorAll('[class^="LyricsPlaceholder__Message"]')
			)

		//// Remove links, they're not working.
		//// I've tried `.innerText`, it returns value with `\n` in console of a regular page,
		//// but it returns without `\n` from `DOMParser`.
		lyricsElements.forEach(lyricsElement => {
			lyricsElement.childNodes.forEach(childNode => {
				if (childNode.tagName == 'A') {
					childNode.replaceWith(...childNode.childNodes)
				}
			})
		})

		//// Split different lyrics containers by newlines
		if (lyricsElements.length > 1) {
			lyricsElements =
				lyricsElements.reduce((acc, val) => [].concat(acc, document.createElement('br'), val))
		}

		//// Fill with lyrics
		lyricsContainer.querySelector('.text').replaceChildren(...lyricsElements)

		//// Display elements
		loadingNotice.classList.add('hidden')
		notFoundNotice.classList.add('hidden')
		notSupportedNotice.classList.add('hidden')

		lyricsContainer.classList.remove('hidden')
		loadForm.classList.remove('hidden')
	}

	const loadLyrics = async query => {
		queryInput.value = query

		const
			cache = (await chrome.storage.local.get({ cache: {} })).cache,
			cached = cache[query],
			cacheTTL = 24 * 60 * 60 * 1000 //// 24 hours

		console.debug('cache = ', cache)
		console.debug('cached = ', cached)

		//// https://bugs.chromium.org/p/chromium/issues/detail?id=1472588
		if (cached && new Date(new Date(cached.createdAt).getTime() + cacheTTL) > new Date()) {
			return displayLyrics(cached.songData, cached.lyricsHTML)
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
					lyricsPage = await (await fetch(songData.description_annotation.url)).text()

				//// Write to cache
				//// https://bugs.chromium.org/p/chromium/issues/detail?id=1472588
				cache[query] = { songData, lyricsHTML: lyricsPage, createdAt: (new Date()).toString() }
				chrome.storage.local.set({ cache })

				displayLyrics(songData, lyricsPage)
			} else {
				loadingNotice.classList.add('hidden')
				lyricsContainer.classList.add('hidden')
				notSupportedNotice.classList.add('hidden')

				notFoundNotice.classList.remove('hidden')
				loadForm.classList.remove('hidden')
			}
		} else {
			const problemWindow = open(searchURL, '_blank', 'popup=true')

			problemWindow.addEventListener('load', event => {
				console.debug('problemWindow load, event =')
				console.debug(event)
			})
			problemWindow.addEventListener('beforeunload', event => {
				console.debug('problemWindow before unload', event)
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
					const documentStyle = getComputedStyle(document.documentElement)

					return {
						songTitle: document.querySelector('#page_player .track-title').innerText,
						colors: {
							background: documentStyle.getPropertyValue('--tempo-colors-bg-main'),
							text: documentStyle.getPropertyValue('--tempo-colors-text-main'),
							link: documentStyle.getPropertyValue('--tempo-colors-text-secondary'),
							border: documentStyle.getPropertyValue('--tempo-colors-divider-main')
						}
					}
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let
					{ songTitle, colors } = injectionResult[0].result,
					[songName, songArtists] = songTitle.split(' · ', 2)

				console.debug('songTitle = ', songTitle)
				console.debug('songName = ', songName)
				console.debug('songArtists = ', songArtists)

				songName = songName.replace(featuringRegexp, '')
				//// Take only the first artist, second can be from the featuring
				songArtist = songArtists.split(', ', 2)[0]

				const query = `${songName} ${songArtist}`
				console.debug('query = ', query)

				setColors(colors)

				loadLyrics(query)
			})

			break
		case 'youtube.com':
		case 'www.youtube.com':
			chrome.scripting.executeScript({
				target: { tabId : currentTab.id },
				func: () => {
					const documentStyle = getComputedStyle(document.documentElement)

					return {
						videoTitle: document.querySelector('#below #title').innerText,
						channelName: document.querySelector('#below #channel-name').innerText,
						chapterTitle: document.querySelector('.ytp-chapter-title-content').innerText,
						colors: {
							background: documentStyle.getPropertyValue('--yt-spec-base-background'),
							text: documentStyle.getPropertyValue('--yt-spec-text-primary'),
							link: documentStyle.getPropertyValue('--yt-spec-call-to-action'),
							border: documentStyle.getPropertyValue('--yt-spec-10-percent-layer')
						}
					}
				}
			}, injectionResult => {
				// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let { videoTitle, channelName, chapterTitle, colors } = injectionResult[0].result
				let query

				console.debug('videoTitle = ', videoTitle)
				console.debug('channelName = ', channelName)
				console.debug('chapterTitle = ', chapterTitle)

				if (chapterTitle) {
					query = chapterTitle.includes(' - ') ? chapterTitle : `${chapterTitle} ${channelName}`
				} else {
					query = videoTitle
				}

				//// Remove additional notes from song title
				query = query.replace('(Video)', '').replace(featuringRegexp, '')

				console.debug('query = ', query)

				setColors(colors)

				loadLyrics(query)
			})

			break
		case 'genius.com':
		case 'www.genius.com':
			chrome.scripting.executeScript({
				target: { tabId : currentTab.id },
				func: () => {
					const
						lyricsStyle =
							getComputedStyle(document.querySelector('[data-lyrics-container="true"]')),
						recommendedArtistStyle =
							getComputedStyle(document.querySelector('[class^="RecommendedSong__ArtistName"]')),
						recommendedContainerStyle =
							getComputedStyle(document.querySelector('[class^="RecommendedSongs__Container"]'))

					return {
						songTitle:
							document.querySelector('[class^="SongHeaderdesktop__Title"]')
								.innerText,
						songArtist:
							document.querySelector('[class*="HeaderArtistAndTracklistdesktop__Artist"]')
								.innerText,
						colors: {
							background: lyricsStyle.backgroundColor,
							text: lyricsStyle.color,
							link: recommendedArtistStyle.color,
							border: recommendedContainerStyle.borderColor
						}
					}
				}
			}, injectionResult => {
				// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let { songTitle, songArtist, colors } = injectionResult[0].result

				console.debug('songTitle = ', songTitle)
				console.debug('songArtist = ', songArtist)

				setColors(colors)

				loadLyrics(`${songTitle} ${songArtist}`)
			})

			break
		default:
			loadingNotice.classList.add('hidden')
			lyricsContainer.classList.add('hidden')
			notFoundNotice.classList.add('hidden')
			loadForm.classList.add('hidden')

			notSupportedNotice.classList.remove('hidden')
	}
})
