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
let instanceUrl;

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
            instanceUrl = tokenResponse.data.instance_url;

            console.log('✅ Access Token:', accessToken);
            console.log('🔄 Refresh Token:', refreshToken);
            console.log('🌍 Instance URL:', instanceUrl);

            res.send('Successfully obtained access and refresh tokens! Check the console.  You can now access /data');
        } catch (error) {
            console.error('❌ Error exchanging code for token:', error.response?.data || error.message);
            res.status(500).send('Failed to obtain access token.');
        }
    } else if (req.query.error) {
        console.error('❌ Authorization Error:', req.query.error_description || req.query.error);
        res.status(400).send(`Authorization failed: ${req.query.error_description || req.query.error}`);
    }
});

// Route to get data from Salesforce
app.get('/data', async (req, res) => {
    if (!accessToken) {
        return res.status(401).send('Error: Access token not available. Please visit /auth to authorize.');
    }

    try {
        const query = `
            SELECT Id,
                Name
            FROM Account
            LIMIT 10
        `;  //  example query

        const encodedQuery = encodeURIComponent(query);
        const url = `${instanceUrl}/services/data/v59.0/query/?q=${encodedQuery}`; //  adjust the API version

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.data && response.data.records) {
            console.log('✅ Successfully retrieved data from Salesforce:');
            console.log(response.data.records);
            res.json(response.data.records); // Send the data as JSON
        } else {
            console.log('⚠️ No records found.');
            res.status(404).send('No records found.');
        }
    } catch (error) {
        console.error('❌ Error querying Salesforce:', error.response?.data || error.message);
        res.status(500).send('Failed to query Salesforce: ' + error.message);
    }
});



app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log('Open your browser to authorize: http://localhost:3000/auth');

});
// Simulate a redirect to /auth when the server starts.
// const { exec } = require('child_process');
// exec(`open http://localhost:${port}/auth`); // Removed auto open.