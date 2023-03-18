const axios = require('axios');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');




class HLSDownloader {
    async start(playlistUrl) {
        // const playlistUrl = 'https://video.twimg.com/ext_tw_video/1633588662142156800/pu/pl/320x568/zC_wn-1O7Oo502vM.m3u8?container=fmp4';
        const segmentUrls = await this.getSegmentUrls(playlistUrl);
        const outputFilename = 'output.ts';
        const finalOutputFilename = 'output.mp4';
        await this.concatenateSegments(segmentUrls, outputFilename);
        await this.convertToMP4(outputFilename, finalOutputFilename);
        console.log('Done!');
    }

    async getSegmentUrls(playlistUrl) {
        const response = await axios.get(playlistUrl);
        const lines = response.data.split('\n');
        const segmentUrls = [];

        for (let line of lines) {
            if (line.includes('.mp4') || line.includes('.m4s')) {

                if (line.startsWith("#")) {
                    line = line.substring(line.indexOf('"') + 1, line.lastIndexOf('"'));
                }


                const segmentUrl = 'https://video.twimg.com' + line;
                segmentUrls.push(segmentUrl);
            }
        }

        return segmentUrls;
    }

    async concatenateSegments(segmentUrls, outputFilename) {
        const outputStream = fs.createWriteStream(outputFilename);

        for (const segmentUrl of segmentUrls) {
            const response = await axios.get(segmentUrl, { responseType: 'stream' });
            await new Promise((resolve, reject) => {
                response.data.pipe(outputStream, { end: false });
                response.data.on('end', resolve);
                response.data.on('error', reject);
            });
        }

        outputStream.end();
    }

    async convertToMP4(inputFilename, outputFilename) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputFilename)
                .outputOptions('-c:v', 'libx264', '-c:a', 'aac', '-strict', '-2', '-movflags', 'faststart')
                .save(outputFilename)
                .on('end', resolve)
                .on('error', reject);
        });
    }



}


// (async () => {
//     try {
//         const downloader = new HLSDownloader();
//         await downloader.start();
//     } catch (error) {
//         console.error(error);
//     }
// })();


module.exports = HLSDownloader;
