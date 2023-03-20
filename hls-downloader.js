const axios = require('axios');
const stream = require('stream');
const ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
const tmp = require('tmp');

class HLSDownloader {
    async start(playlistUrl) {
        const segmentUrls = await this.getSegmentUrls(playlistUrl);
        const outputFilename = 'output.mp4';
        return await this.downloadAndConvertSegments(segmentUrls);
        // console.log('Done!');
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

    async downloadAndConvertSegments(segmentUrls) {
        const concatStream = new stream.PassThrough();

        const downloadNextSegment = async (index) => {
            if (index < segmentUrls.length) {
                const response = await axios.get(segmentUrls[index], { responseType: 'stream' });
                response.data.pipe(concatStream, { end: false });
                response.data.on('end', () => downloadNextSegment(index + 1));
            } else {
                concatStream.end();
            }
        };

        await downloadNextSegment(0);

        const outputStream = stream.PassThrough();
        const converter = ffmpeg(concatStream)
            .addOutputOptions([
                '-c:a aac', // Set audio codec to AAC
                '-c:v libx264', // Set video codec to H.264
                '-movflags +frag_keyframe+separate_moof+omit_tfhd_offset+empty_moov'
            ])
            .format('mp4')
            .pipe(outputStream);

        return outputStream;
    }






}

module.exports = HLSDownloader;
