import { FastAverageColor } from 'fast-average-color'

document.addEventListener('DOMContentLoaded', async _event => {
	const
		FAC = new FastAverageColor(),
		currentSettings = (await chrome.storage.sync.get('settings')).settings

	document.body.classList.add(`${currentSettings.theme}-theme`)

	const
		loadingNotice = document.querySelector('body > .loading'),
		loadingQueryText = loadingNotice.querySelector('.query'),
		captchaNotice = document.querySelector('body > .captcha'),
		lyricsContainer = document.querySelector('body > .lyrics'),
		otherSearchResultsLink = lyricsContainer.querySelector('.other-search-results'),
		notFoundNotice = document.querySelector('body > .not-found'),
		notSupportedNotice = document.querySelector('body > .not-supported'),
		otherSearchResultsContainer = document.querySelector('body > .other-search-results'),
		otherSearchResultsList = otherSearchResultsContainer.querySelector('ul'),
		otherSearchResultTemplate = otherSearchResultsList.querySelector('template'),
		loadForm = document.querySelector('body > form.load'),
		queryInput = loadForm.querySelector('input[name="query"]')

	loadForm.addEventListener('submit', event => {
		event.preventDefault()

		captchaNotice.classList.add('hidden')
		notFoundNotice.classList.add('hidden')
		notSupportedNotice.classList.add('hidden')
		lyricsContainer.classList.add('hidden')
		otherSearchResultsContainer.classList.add('hidden')

		loadForm.classList.remove('hidden')
		loadingNotice.classList.remove('hidden')

		searchLyrics(queryInput.value)
	})

	const setColors = colors => {
		document.documentElement.style.setProperty('--site-background-color', colors.background)
		document.documentElement.style.setProperty('--site-text-color', colors.text)
		document.documentElement.style.setProperty('--site-link-color', colors.link)
		document.documentElement.style.setProperty('--site-border-color', colors.border)
	}

	const displayLyrics = (songData, lyricsHTML) => {
		lyricsContainer.querySelector('.title').innerText = songData.full_title
		lyricsContainer.querySelector('.link').href = songData.url

		const songArtImage = lyricsContainer.querySelector('img.song-art')

		if (currentSettings.displaySongArt) {
			songArtImage.src = songData.song_art_image_thumbnail_url
			songArtImage.classList.remove('hidden')

			FAC.getColorAsync(songArtImage)
				.then(color => {
					document.documentElement.style.setProperty('--song-art-color', color.rgb)
				})
		} else {
			songArtImage.classList.add('hidden')
		}

		//// Fill with lyrics
		lyricsContainer.querySelector('.text').innerHTML = lyricsHTML

		//// Display elements
		loadingNotice.classList.add('hidden')
		captchaNotice.classList.add('hidden')
		notFoundNotice.classList.add('hidden')
		notSupportedNotice.classList.add('hidden')

		lyricsContainer.classList.remove('hidden')
		otherSearchResultsContainer.classList.remove('hidden')
		loadForm.classList.remove('hidden')
	}

	const getCache = async () => {
		return (await chrome.storage.local.get({ cache: { searches: {}, songs: {} } })).cache
	}

	const readCache = async type => {
		const
			cache = await getCache(),
			cachedType = cache[type],
			cacheTTL = 24 * 60 * 60 * 1000 //// 24 hours

		for (const key in cachedType) {
			//// https://bugs.chromium.org/p/chromium/issues/detail?id=1472588
			if (new Date(new Date(cachedType[key].createdAt).getTime() + cacheTTL) < new Date()) {
				delete cachedType[key]
			}
		}

		chrome.storage.local.set({ cache })

		return cachedType
	}

	const writeCache = async (type, key, value) => {
		const cache = await getCache()

		// console.debug('cache = ', cache)
		// console.debug('type = ', type)
		// console.debug('cache[type] = ', cache[type])
		// console.debug('key = ', key)
		// console.debug('cache[type][key] = ', cache[type][key])
		// console.debug('value = ', value)

		//// Write to cache
		//// https://bugs.chromium.org/p/chromium/issues/detail?id=1472588
		cache[type][key] = { ...value, createdAt: (new Date()).toString() }

		chrome.storage.local.set({ cache })
	}

	const parseLyricsPage = lyricsPage => {
		const
			parser = new DOMParser(),
			lyricsDocument = parser.parseFromString(lyricsPage, 'text/html')

		// console.debug(lyricsDocument)
		// console.debug(lyricsDocument.querySelectorAll('[class^="LyricsPlaceholder__Message"]'))

		let
			lyricsElements = Array.from(lyricsDocument.querySelectorAll('[data-lyrics-container="true"]'))

		if (lyricsElements.length == 0) {
			lyricsElements =
				Array.from(lyricsDocument.querySelectorAll('[class^="LyricsPlaceholder__Message"]'))
		}

		// console.debug(lyricsElements)

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

		const lyricsHTML = lyricsElements.reduce((acc, val) => `${acc}${val.outerHTML}`, '')

		// console.debug('lyricsHTML = ', lyricsHTML)

		return lyricsHTML
	}

	const loadLyrics = async songId => {
		loadingNotice.classList.remove('hidden')

		const
			songsCache = await readCache('songs'),
			cachedSong = songsCache[songId]

		// console.debug('songsCache = ', songsCache)
		// console.debug('cachedSong = ', cachedSong)

		if (cachedSong) {
			return displayLyrics(cachedSong.data, cachedSong.lyricsHTML)
		}

		const
			songData =
				(await (await fetch(`https://genius.com/api/songs/${songId}`)).json())
					.response.song,
			lyricsPage = await (await fetch(songData.description_annotation.url)).text(),
			lyricsHTML = parseLyricsPage(lyricsPage)

		await writeCache('songs', songId, { data: songData, lyricsHTML })

		displayLyrics(songData, lyricsHTML)
	}

	const displaySearchResults = async songHits => {
		if (songHits.length > 0) {
			await loadLyrics(songHits[0].result.id)

			if (songHits.length > 1) {
				const otherSearchResultsElements = songHits.slice(0, 5).map((songHit, index) => {
					const otherSearchElement =
						otherSearchResultTemplate.content.firstElementChild.cloneNode(true)

					if (index == 0) otherSearchElement.classList.add('hidden')

					otherSearchElement.querySelector('.title').innerText = songHit.result.title
					otherSearchElement.querySelector('.artist').innerText = songHit.result.artist_names
					otherSearchElement.querySelector('img.song-art').src =
						songHit.result.song_art_image_thumbnail_url

					otherSearchElement.addEventListener('click', async _event => {
						lyricsContainer.classList.add('hidden')
						otherSearchResultsContainer.classList.add('hidden')
						loadForm.classList.add('hidden')

						otherSearchResultsList.querySelector('li.hidden').classList.remove('hidden')
						otherSearchElement.classList.add('hidden')

						loadingQueryText.innerText = songHit.result.full_title

						await loadLyrics(songHit.result.id)
					})

					return otherSearchElement
				})

				otherSearchResultsList.replaceChildren(...otherSearchResultsElements)

				otherSearchResultsContainer.classList.remove('hidden')

				otherSearchResultsLink.classList.remove('hidden')
			} else {
				otherSearchResultsContainer.classList.add('hidden')
				otherSearchResultsLink.classList.add('hidden')
			}
		} else {
			loadingNotice.classList.add('hidden')
			captchaNotice.classList.add('hidden')
			lyricsContainer.classList.add('hidden')
			otherSearchResultsContainer.classList.add('hidden')
			notSupportedNotice.classList.add('hidden')

			notFoundNotice.classList.remove('hidden')
			loadForm.classList.remove('hidden')
		}
	}

	const searchLyrics = async query => {
		query = query.trim()

		queryInput.value = query
		loadingQueryText.innerText = query

		const
			searchesCache = await readCache('searches'),
			cachedSearch = searchesCache[query]

		// console.debug('searchesCache = ', searchesCache)
		// console.debug('cachedSearch = ', cachedSearch)

		if (cachedSearch) {
			return displaySearchResults(cachedSearch.songHits)
		}

		const
			searchURL = `https://genius.com/api/search?q=${encodeURIComponent(query)}`,
			searchResponse = await fetch(searchURL)

		if (searchResponse.ok) {
			const songHits = (await searchResponse.json()).response.hits.filter(hit => hit.type == 'song')

			await writeCache('searches', query, { songHits })

			displaySearchResults(songHits)
		} else {
			const searchResponseText = await searchResponse.text()

			// console.debug(searchResponse.status)
			// console.debug(searchResponseText)

			if (
				searchResponse.status == 403 &&
				searchResponseText.includes("we have to make sure you're a human")
			) {
				loadingNotice.classList.add('hidden')
				captchaNotice.classList.remove('hidden')
			}

			// const problemWindow =
			window.open('https://genius.com/', '_blank', 'popup=true')

			// console.debug('problemWindow = ', problemWindow)

			//// It will not work due to security policies (CORS).
			//// Even via Facebook's `setInterval` hack (`.open` always returns `true`).
			//
			// problemWindow.addEventListener('beforeunload', event => {
			// 	console.debug('problemWindow before unload', event)
			// 	searchLyrics(query)
			// })
		}
	}

	const
		currentTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0],
		currentTabHostname = (new URL(currentTab.url)).hostname,
		featuringRegexp = / \(?(?:f(ea)?t|prod)\.? [^()]+\)?/

	switch (currentTabHostname) {
		case 'deezer.com':
		case 'www.deezer.com':
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const
						documentStyle = getComputedStyle(document.documentElement),
						pagePlayer = document.querySelector('#page_player')

					return {
						songTitle: pagePlayer.querySelector('[data-testid="item_title"]').innerText,
						songArtists: pagePlayer.querySelector('[data-testid="item_subtitle"]').innerText,
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
					{ songTitle, songArtists, colors } = injectionResult[0].result

				console.debug('songTitle = ', songTitle)
				console.debug('songArtists = ', songArtists)

				songTitle = songTitle.replace(featuringRegexp, '')
				//// Take only the first artist, second can be from the featuring
				let songArtist = songArtists.split(', ', 2)[0]

				const query = `${songTitle} ${songArtist}`
				console.debug('query = ', query)

				setColors(colors)

				searchLyrics(query)
			})

			break
		case 'music.yandex.ru':
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const
						decoPaneStyle = getComputedStyle(document.querySelector('.deco-pane')),
						playerControls = document.querySelector('.player-controls__track-container')

					return {
						songTitle: playerControls.querySelector('.track__title').innerText,
						songArtists: playerControls.querySelector('.track__artists').innerText,
						colors: {
							background: decoPaneStyle.backgroundColor,
							text: decoPaneStyle.color,
							link: getComputedStyle(document.querySelector('.deco-link_muted')).color,
							border: decoPaneStyle.borderColor
						}
					}
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let
					{ songTitle, songArtists, colors } = injectionResult[0].result

				console.debug('songTitle = ', songTitle)
				console.debug('songArtists = ', songArtists)

				songTitle = songTitle.replace(featuringRegexp, '')

				const query = `${songTitle} ${songArtists}`
				console.debug('query = ', query)

				setColors(colors)

				searchLyrics(query)
			})

			break
		case 'soundcloud.com':
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const
						playbackTitleContainer =
							document.querySelector('.playbackSoundBadge__titleContextContainer')

					return {
						songTitle:
							playbackTitleContainer
								.querySelector('.playbackSoundBadge__title > a > span:not(.sc-visuallyhidden)')
								.innerText,
						songArtists:
							playbackTitleContainer
								.querySelector(':scope > a')
								.innerText,
						colors: {
							background: getComputedStyle(document.querySelector('body')).backgroundColor,
							text: getComputedStyle(document.querySelector('.sc-text')).color,
							link: getComputedStyle(document.querySelector('.playButton')).backgroundColor,
							border: getComputedStyle(document.querySelector('.sc-border-light-top')).borderColor
						}
					}
				}
			}, injectionResult => {
				//// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let
					{ songTitle, songArtists, colors } = injectionResult[0].result

				console.debug('songTitle = ', songTitle)
				console.debug('songArtists = ', songArtists)

				songTitle = songTitle.replace(featuringRegexp, '')

				const query = `${songTitle} ${songArtists}`
				console.debug('query = ', query)

				setColors(colors)

				searchLyrics(query)
			})

			break
		case 'youtube.com':
		case 'www.youtube.com':
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const documentStyle = getComputedStyle(document.documentElement)

					return {
						videoTitle: document.querySelector('#below #title h1').innerText,
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
				query =
					query
						.replace(/\((?:(?:\w+ )*(?:Video(?: HD)?|Soundtrack)|From .*|Lyrics|OUT NOW)\)/i, '')
						.replace(featuringRegexp, '')

				console.debug('query = ', query)

				setColors(colors)

				searchLyrics(query)
			})

			break
		case 'genius.com':
		case 'www.genius.com':
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => {
					const
						lyricsStyle = getComputedStyle(
							document.querySelector(
								// Regular lyrics
								'[data-lyrics-container="true"],' +
								// Lyrics for this song have yet to be released
								'[class^="LyricsPlaceholder__Container-"]'
							)
						),
						contributorsCreditStyle = getComputedStyle(
							document.querySelector('[class^="ContributorsCreditSong__Label"]')
						),
						stickyContributorToolbarStyle = getComputedStyle(
							document.querySelector('[class*=" StickyContributorToolbar__Container"]')
						)

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
							link: contributorsCreditStyle.color,
							border: stickyContributorToolbarStyle.borderBottomColor
						}
					}
				}
			}, injectionResult => {
				console.debug('injectionResult = ', injectionResult)

				// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let { songTitle, songArtist, colors } = injectionResult[0].result

				console.debug('songTitle = ', songTitle)
				console.debug('songArtist = ', songArtist)

				setColors(colors)

				searchLyrics(`${songTitle} ${songArtist}`)
			})

			break
		case 'shazam.com':
		case 'www.shazam.com':
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => ({
					songTitle: document.querySelector('h1.title').innerText,
					songArtist: document.querySelector('h2.artist').innerText,
					colors: {
						background: getComputedStyle(document.querySelector('body')).backgroundColor,
						text: getComputedStyle(document.querySelector('h2.section-title')).color,
						link: getComputedStyle(document.querySelector('.shz-text-btn')).backgroundColor,
						border: getComputedStyle(document.querySelector('.shz-partial-tracklist')).borderColor
					}
				})
			}, injectionResult => {
				// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let { songTitle, songArtist, colors } = injectionResult[0].result

				console.debug('songTitle = ', songTitle)
				console.debug('songArtist = ', songArtist)

				songTitle = songTitle.replace(featuringRegexp, '')
				songArtist = songArtist.trim()

				setColors(colors)

				searchLyrics(`${songTitle} ${songArtist}`)
			})

			break
		case 'song.link':
			chrome.scripting.executeScript({
				target: { tabId: currentTab.id },
				func: () => ({
					songTitle: document.querySelector('.e12n0mv61').innerText,
					songArtist: document.querySelector('.e12n0mv60').innerText,
					colors: {
						background: getComputedStyle(document.querySelector('.css-1lcypyy')).backgroundColor,
						text: getComputedStyle(document.querySelector('.css-1lcypyy')).color,
						link: getComputedStyle(document.querySelector('.css-12zt9a8')).color,
						border: getComputedStyle(document.querySelector('.css-1lcypyy')).borderColor
					}
				})
			}, injectionResult => {
				// https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult
				let { songTitle, songArtist, colors } = injectionResult[0].result

				console.debug('songTitle = ', songTitle)
				console.debug('songArtist = ', songArtist)

				songTitle = songTitle.replace(featuringRegexp, '')

				setColors(colors)

				searchLyrics(`${songTitle} ${songArtist}`)
			})

			break
		default:
			loadingNotice.classList.add('hidden')
			lyricsContainer.classList.add('hidden')
			otherSearchResultsContainer.classList.add('hidden')
			notFoundNotice.classList.add('hidden')
			loadForm.classList.add('hidden')

			notSupportedNotice.classList.remove('hidden')
	}
})
