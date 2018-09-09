import speech from '@google-cloud/speech'

export const recognizeAudio = (buffer: Buffer): Promise<string> => {
    const client = new speech.SpeechClient();

    const asRequest = (audioBuffer) => ({
        audio: {
            content: audioBuffer.toString('base64')
        },
        config: {
            encoding: 'OGG_OPUS',
            sampleRateHertz: 16000,
            languageCode: 'it-IT',
        }
    });

    const request = asRequest(buffer)

    return client.recognize(request)
        .then(data => {
            const response = data[0];
            return response.results
                .map(result => result.alternatives[0].transcript)
                .join('\n');
        })
}
