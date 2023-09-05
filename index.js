const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

const {proxy, scriptUrl} = require('rtsp-relay')(app);
// this is an example html page to view the stream
app.get('/', (req, res) => {
        const {url} = req.query;

        const handler = proxy({
            url,
            // if your RTSP stream need credentials, include them in the URL as above
            verbose: true,
        });

// the endpoint our RTSP uses
        app.ws(`/api/stream/${url}`, handler);

        res.send({success: true})
    }
);

app.listen(3003);
