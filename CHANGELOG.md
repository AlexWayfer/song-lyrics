# Changelog

## Unreleased

## 4.0 (2024-06-05)

*   Make popup window as iframe.
    Resizable and movable.
    Position and size are saving per site.
*   Pass colors from popup iframe even when site is unsupported.
*   Add music platforms for popup iframe on non-supported sites.
*   Add query form for unsupported sites.
*   Add an error notice when site doesn't work as expected.
    With a link to contact the developer.
*   Write usage instructions.
*   Remove trash in square parentheses from YouTube requests.
*   Add CHANGELOG.
*   Fix warning about third-party cookies in extension errors.
*   Use `npm-run-all` for development simplification.

## 3.1.0 (2024-05-14)

*   Add YouTube Music support as a music platform.
    I couldn't check the light theme if it's there.

*   Update (fix) Shazam pages.

*   Add link to a search page on Genius.
    Even if not found.
    Remove `()` because they're breaking (redirecting) search page.

*   Include YouTube channel name in search query.
    Still basing on `-` containment, but now not only for the chapters.

*   Use kind of system theme (light/dark) if site is not supported.

*   Add link to contact the developer if site is not supported.

## 3.0.1 (2024-05-09)

*   Add missing supported platforms into README.

## 3.0 (2024-05-09)

*   Add Spotify support as a music platform.
*   Add Apple Music support as a music platform.
*   Add Last.fm support as a music platform.
*   Remove a lot of new trash text from YouTube query.
*   Update development dependencies.

## 2.0 (2024-03-07)

*   Display other search results and allow to switch between them.
*   Add SoundCloud support as a music platform.
*   Add Yandex.Music support as a music platform.
*   Add Odesli support as a music platform.
*   Add query text (or other search result full title) into loading notice.
*   Remove a lot of trash from YouTube query.
*   Fix featuring regexp, when there are other parentheses.
*   Clear "(prod.)" as well as featuring.
*   Fix permissions in manifest for Genius images.
*   Fix popup height for loading screen.
*   Align "Not found" and "Loading" notices to the center.
*   Remake cache system to searches and songs.
*   Update development dependencies.

## 1.9 (2024-02-21)

*   Improve removing text like "(Premier Video)" for YouTube requests.

*   Add song art color gradient background.

*   Support lyrics placeholder on Genius.

*   Encode query, fix problems with chars like `&`.

*   Remove "(Lyrics)" for requests from YouTube.

*   Clear old cache entries on every loading.
    We still have `QUOTA_BYTES` problem, but it'll help.

*   Clear cache on every extension update.

*   Remake lyrics cache from the whole document to the essence.
    It should reduce the cache size dramatically.

*   Add linters for development (docs, styles, scripts) and resolve offenses.

*   Add Cirrus CI.

*   Improve README, add badges.

## 1.8 (2023-12-18)

*   Add support for Shazam.
*   Fix incompatibility on YouTube with scrabbler (to Last.fm).
*   Improve removing "it's a video"-note from the title for YouTube.
*   Trim all queries for loading lyrics.
*   Fix colors for Genius pages.
*   Remove border for popup window.

## 1.7 (2023-11-14)

*   Add notice about Genius CAPTCHA.
*   Improve README.

## 1.6 (2023-08-31)

*   Fix error when there is only one lyrics container.
*   Increase line height for lyrics text.
*   Add song art (album cover) displaying, with an ability to disable in options.

## 1.5 (2023-08-31)

*   Add context menu item to clear the cache.

*   Fix lyrics text when page have multiple containers.

*   Add options for extension.
    Just theme selection for now, default (light) or site.

*   Add dark theme.

## 1.4 (2023-08-31)

*   Add link to external lyrics page.
*   Fix height of popup when site is not supported.
*   Add parsing of colors (theme) from sites.
*   Fix caching songs data.

## 1.3 (2023-08-30)

*   Add support for YouTube chapters.

## 1.2 (2023-08-30)

*   Change current song title getting algorithm.
    Not from the tab title, but from the page content.
    It'll help with other services, like YouTube (with chapters).

*   Support instrumental and non-published lyrics.

*   Remove "trash" parts from the song titles
    It helps with YouTube, but can be dangerous.

*   Remove links from lyrics: they're not working.

*   Add YouTube support as a music platform.
    Just video title for now.

*   Improve and fix search query for Deezer.

*   Add caching of lyrics.

*   Add Genius as a music platform.
    Generally for testing purpose.

*   Add a form to refine search query.

## 1.1 (2023-08-25)

*   Catch Genius error, like "Verify you're human".
*   Add scripts for packing and releasing.

## 1.0 (2023-08-25)

*   Initial release.
*   Add Deezer support as a music platform.
*   Add Genius support as a lyrics platform.
*   Add popup.
*   Add icon.
