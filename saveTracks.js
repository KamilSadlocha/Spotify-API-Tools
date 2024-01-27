const SpotifyWebApi = require("spotify-web-api-node");
const express = require("express");
const opn = require("opn");

// Playlist IDs
const playlistIds = ["PLAYLIST_ID_1", "PLAYLIST_ID_2", "PLAYLIST_ID_3"];

// Spotify authorization function
async function authorizeSpotify() {
	const clientId = "YOUR_CLIENT_ID";
	const clientSecret = "YOUR_CLIENT_SECRET";
	const redirectUri = "http://localhost:3000/callback";

	const spotifyApi = new SpotifyWebApi({
		clientId,
		clientSecret,
		redirectUri,
	});

	const authorizeURL = spotifyApi.createAuthorizeURL(
		["playlist-modify-public", "playlist-modify-private"],
		null,
		true
	);
	console.log(`Please log in at: ${authorizeURL}`);

	opn(authorizeURL);

	const authorizationCode = await new Promise((resolve) => {
		const app = express();
		const port = 3000;

		app.get("/callback", (req, res) => {
			const { code } = req.query;
			res.send("Authentication completed. You can close this window.");
			resolve(code);
			server.close();
		});

		const server = app.listen(port, () => {
			console.log(`Server is listening on port ${port}`);
		});
	});

	const data = await spotifyApi.authorizationCodeGrant(authorizationCode);
	console.log("Access token obtained");
	console.log("Authentication data:", data.body);

	spotifyApi.setAccessToken(data.body["access_token"]);
	spotifyApi.setRefreshToken(data.body["refresh_token"]);

	return spotifyApi;
}

// Delay function
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch and save tracks to a JSON file with delay
async function fetchAndSaveTracksWithDelay(playlistIds, filename) {
	const spotifyApi = await authorizeSpotify();

	try {
		let allTrackUris = [];

		for (const playlistId of playlistIds) {
			let offset = 0;
			let playlistTracks;

			do {
				playlistTracks = await spotifyApi.getPlaylistTracks(playlistId, {
					offset: offset,
					limit: 100,
				});

				if (
					!playlistTracks ||
					!playlistTracks.body ||
					!playlistTracks.body.items
				) {
					throw new Error(`Error fetching tracks from playlist ${playlistId}`);
				}

				const trackUris = playlistTracks.body.items.map(
					(track) => track.track && track.track.uri
				);
				allTrackUris = allTrackUris.concat(trackUris);
				offset += trackUris.length;

				console.log(`Fetched ${allTrackUris.length} tracks...`);

				// Delay before the next request
				await delay(500); // 0.5 seconds delay (you can adjust the value)
			} while (offset < playlistTracks.body.total);
		}

		console.log(`Total fetched tracks: ${allTrackUris.length}`);

		// Read existing URIs from the file
		const existingData = require(`./${filename}`);

		// Add only the tracks that are not already in the file
		const newTrackUris = allTrackUris.filter(
			(uri) => !existingData.includes(uri)
		);

		console.log(`New tracks: ${newTrackUris.length}`);

		// Add new URIs to the existing data
		const updatedTrackUris = existingData
			? [...existingData, ...newTrackUris]
			: newTrackUris;

		// Save the updated data to the file
		require("fs").writeFileSync(
			filename,
			JSON.stringify(updatedTrackUris, null, 2)
		);

		console.log(`Fetched and saved track URIs from playlists to ${filename}`);

		console.log(`Total tracks: ${updatedTrackUris.length}`);
	} catch (err) {
		console.error("Error fetching and saving track URIs:", err);
	}
}

// Call the function for multiple playlists
fetchAndSaveTracksWithDelay(playlistIds, "trackUris.json");
