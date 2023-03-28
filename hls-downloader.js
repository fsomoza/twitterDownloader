const m3u8stream = require("m3u8stream");

class HLSDownloader {
    async start(playlistUrl) {
        return await this.getStream(playlistUrl);
    }

    async getStream(playlistUrl) {
        const baseUrl = "https://video.twimg.com";
        const stream = m3u8stream(playlistUrl, {
            requestOptions: {
                headers: {
                    "Referer": baseUrl,
                },
            },
        });



        return stream;
    }
}

module.exports = HLSDownloader;

