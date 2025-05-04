const express = require('express');
const axios = require('axios');
const crypto = require('crypto'); // For generating random strings and SHA-256

const app = express();
const port = 3000;

const config = {
    grant_type: 'authorization_code',
    client_id: '3MVG9nfjjfLf_Qre3jnLyWHBANNXBZJA87CT0bW3xmwl4vu52nnI8XXN95_Hbt2fAnXseO_8ToiOcia6inDx7',
    client_secret: '941710C4892DF2D2598782FCD3E748E24590A750E455C5758B67934550039EBB',
    redirect_uri: 'http://localhost:3000/callback',
    login_url: 'https://computing-computing-8077-dev-ed.scratch.my.salesforce.com'
};

// Global variables to store tokens
let accessToken;
let refreshToken;

// Function to generate a random code verifier
function generateCodeVerifier(length) {
    return crypto.randomBytes(length).toString('base64url').substring(0, length);
}

// Function to generate the code challenge from the code verifier
function generateCodeChallenge(codeVerifier) {
    return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

let codeVerifier;

// Route to initiate the authorization flow with PKCE
app.get('/auth', (req, res) => {
    codeVerifier = generateCodeVerifier(128); // Recommended length is 43-128 characters
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const authorizationUrl = `${config.login_url}/services/oauth2/authorize?response_type=code&client_id=${config.client_id}&redirect_uri=${encodeURIComponent(config.redirect_uri)}&scope=refresh_token%20api&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    res.redirect(authorizationUrl);
});

// Callback route to handle the authorization code and exchange it for tokens
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (code) {
        try {
            const tokenResponse = await axios.post(`${config.login_url}/services/oauth2/token`, new URLSearchParams({
                grant_type: config.grant_type,
                client_id: config.client_id,
                client_secret: config.client_secret,
                redirect_uri: config.redirect_uri,
                code: code,
                code_verifier: codeVerifier
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            accessToken = tokenResponse.data.access_token;
            refreshToken = tokenResponse.data.refresh_token;

            console.log('✅ Access Token:', accessToken);
            console.log('🔄 Refresh Token:', refreshToken);
            console.log('🌍 Instance URL:', tokenResponse.data.instance_url);

            res.send('Successfully obtained access and refresh tokens! Check the console.');
        } catch (error) {
            console.error('❌ Error exchanging code for token:', error.response?.data || error.message);
            res.status(500).send('Failed to obtain access token.');
        }
    } else if (req.query.error) {
        console.error('❌ Authorization Error:', req.query.error_description || req.query.error);
        res.status(400).send(`Authorization failed: ${req.query.error_description || req.query.error}`);
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log('Automatically initiating authorization flow...');
    // Simulate a redirect to /auth when the server starts.  This will only work if a browser is open.
    const authUrl = `http://localhost:${port}/auth`;
    console.log(`Open this URL in your browser to authorize: ${authUrl}`);

});

// Simulate a redirect to /auth when the server starts.
// This will only work if a browser is open.
const { exec } = require('child_process');
exec(`open http://localhost:${port}/auth`);