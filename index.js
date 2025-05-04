const express = require('express');
const axios = require('axios');
const open = require('open');
const qs = require('querystring');

const config = {
    grant_type: 'authorization_code',
    client_id: '3MVG9nfjjfLf_Qre3jnLyWHBANNXBZJA87CT0bW3xmwl4vu52nnI8XXN95_Hbt2fAnXseO_8ToiOcia6inDx7',
    client_secret: '941710C4892DF2D2598782FCD3E748E24590A750E455C5758B67934550039EBB',
    redirect_uri: 'http://localhost:3000/callback',
    login_url: 'https://computing-computing-8077-dev-ed.scratch.my.salesforce.com'


    //?response_type=code&client_id=3MHbt2fAnXseO_8ToiOcia6inDx7&redirect_uri=http://localhost:3000/callback&scope=refresh_token%20api


};



const app = express();
const port = 3000;

let access_token = '';
let refresh_token = '';
let instance_url = '';

app.get('/auth', (req, res) => {
    const authUrl = `${config.login_url}/services/oauth2/authorize?` +
        `response_type=code&client_id=${config.client_id}&redirect_uri=${encodeURIComponent(config.redirect_uri)}&scope=refresh_token%20api`;

    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const response = await axios.post(`${config.login_url}/services/oauth2/token`,
            qs.stringify({
                grant_type: 'authorization_code',
                code: code,
                client_id: config.client_id,
                client_secret: config.client_secret,
                redirect_uri: config.redirect_uri,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        access_token = response.data.access_token;
        refresh_token = response.data.refresh_token;
        instance_url = response.data.instance_url;

        res.send('✅ Successfully authenticated! You can close this tab.');

        console.log('Access Token:', access_token);
        console.log('Refresh Token:', refresh_token);
        console.log('Instance URL:', instance_url);

        // Make a sample API call
        const result = await axios.get(`${instance_url}/services/data/v60.0/sobjects/Account/`, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        console.log('📄 Sample Account Data:', result.data);

    } catch (err) {

        console.error('❌ Error exchanging code:', err.response?.data || err.message);
        res.send('Error during callback: ' + JSON.stringify(err.response?.data || err.message));

    }
});

app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    open(`http://localhost:${port}/auth`);
});
