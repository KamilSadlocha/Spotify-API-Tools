const SpotifyWebApi = require("spotify-web-api-node");
const opn = require("opn");
const express = require("express");
const fs = require("fs");

// Function to shuffle an tracksArray
function shuffleTracks(tracksArray) {
  for (let i = tracksArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tracksArray[i], tracksArray[j]] = [tracksArray[j], tracksArray[i]];
  }
  return tracksArray;
}

// Function for Spotify authorization
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

  // Open the browser for authorization
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

// Function to read track URIs from a file, shuffle, and create a new playlist
async function createRandomPlaylist(
  filename,
  targetPlaylistName,
  numberOfTracks
) {
  const spotifyApi = await authorizeSpotify();

  try {
    // Read track URIs from the file
    const trackUris = JSON.parse(fs.readFileSync(filename, "utf-8"));
    console.log("Read track URIs from file:", trackUris.length);

    // Shuffle track URIs
    const shuffledUris = shuffleTracks(trackUris).slice(0, numberOfTracks);
    console.log("Shuffled track URIs:", shuffledUris.length);

    // Create a new playlist
    const createdPlaylist = await spotifyApi.createPlaylist(
      targetPlaylistName,
      {
        public: false,
      }
    );
    const targetPlaylistId = createdPlaylist.body.id;

    // Add all tracks to the new playlist in a single request
    await spotifyApi.addTracksToPlaylist(targetPlaylistId, shuffledUris);

    console.log(
      `Created a new playlist with random tracks: ${createdPlaylist.body.name} (ID: ${targetPlaylistId})`
    );
  } catch (err) {
    console.error("Error creating a new playlist:", err);
  }
}


createRandomPlaylist("trackUris.json", "PLAYLIST_NAME", 80);
