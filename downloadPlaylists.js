const xlsx = require("xlsx");
const SpotifyWebApi = require("spotify-web-api-node");
const express = require("express");
const opn = require("opn");

async function downloadAndSavePlaylists(userId, outputFile) {
	// Authentication settings
	const clientId = "YOUR_CLIENT_ID";
	const clientSecret = "YOUR_CLIENT_SECRET";
	const redirectUri = "http://localhost:3000/callback";

	// Create a SpotifyWebApi object
	const spotifyApi = new SpotifyWebApi({
		clientId,
		clientSecret,
		redirectUri,
	});

	// Get the authorization URL
	const authorizeURL = spotifyApi.createAuthorizeURL(
		["playlist-read-private", "playlist-read-collaborative"],
		null,
		true
	);
	console.log(`Please log in at: ${authorizeURL}`);

	// Open a browser for user login
	opn(authorizeURL);

	// Function to get user playlists
	async function getUserPlaylists(userId) {
		try {
			// Get access token
			const data = await spotifyApi.clientCredentialsGrant();
			const accessToken = data.body["access_token"];
			spotifyApi.setAccessToken(accessToken);

			// Get user playlists
			const limit = 50; // Maximum number of playlists to retrieve at once
			let offset = 0;
			let totalPlaylists = 0;
			const playlistsData = [];

			do {
				const userPlaylists = await spotifyApi.getUserPlaylists(userId, {
					limit,
					offset,
				});
				totalPlaylists = userPlaylists.body.total;

				userPlaylists.body.items.forEach((playlist) => {
					const rowData = [
						playlist.name,
						playlist.id,
						playlist.tracks.total,
						`https://open.spotify.com/playlist/${playlist.id} `,
					];
					playlistsData.push(rowData);
				});

				offset += limit;
			} while (offset < totalPlaylists);

			return playlistsData;
		} catch (err) {
			console.error("Error while retrieving playlists:", err);
			throw err;
		}
	}

	// Function to save playlist information to an Excel file
	function savePlaylistsToExcel(playlistsData) {
		const ws = xlsx.utils.aoa_to_sheet([
			["Name", "ID", "Number of Tracks", "Link"],
			...playlistsData,
		]);
		const wb = xlsx.utils.book_new();
		xlsx.utils.book_append_sheet(wb, ws, "Playlists");
		xlsx.writeFile(wb, outputFile);
		console.log(
			`Playlist information has been saved to the file ${outputFile}.`
		);
	}

	// Wait for the authorization code from the user
	const app = express();
	const port = 3000;

	app.get("/callback", async (req, res) => {
		const { code } = req.query;

		try {
			// Get access token using the authorization code
			const data = await spotifyApi.authorizationCodeGrant(code);
			console.log("Access token obtained");

			// Set access token
			spotifyApi.setAccessToken(data.body["access_token"]);
			spotifyApi.setRefreshToken(data.body["refresh_token"]);

			// Get user playlists
			const playlistsData = await getUserPlaylists(userId);

			// Save playlist information to a file
			savePlaylistsToExcel(playlistsData);

			res.send(
				`Playlist information has been saved to the file ${outputFile}.`
			);
		} catch (err) {
			console.error("Authentication error:", err);
			res.status(500).send("Authentication error. Please try again.");
		} finally {
			// Close the server after processing
			server.close();
		}
	});

	// Start the server
	const server = app.listen(port, () => {
		console.log(`Server is listening on port ${port}`);
	});
}

downloadAndSavePlaylists("SPOTIFY_USER_ID", "RA.xlsx");
