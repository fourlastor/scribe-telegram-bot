import * as functions from 'firebase-functions'
import fetch from 'node-fetch'
import { recognizeAudio } from './cloud-api';
import * as utf8 from 'utf8';

const token: string = functions.config()['telegram']['token'];
const apiUrl = (path: string) => `https://api.telegram.org/bot${token}/${path}`;
const fileUrl = (filePath: string) => `https://api.telegram.org/file/bot${token}/${filePath}`
const json = (url: string) => fetch(url).then(response => response.json());

const audioMessageFilePath = (voice: Voice) => json(`${apiUrl('getFile')}?file_id=${voice.file_id}`)
    .then(it => it.result as File)

const downloadAudio = (audioFile: File) => fetch(`${fileUrl(audioFile.file_path)}`)
    .then(response => response.buffer())

export const onMessage = functions.https.onRequest((request, response) => {
    const message = request.body.message as Message
    if (!message || !message.voice) {
        response.send(200)
        return
    }

    const chatId = message.chat.id
    const messageId = message.message_id

    fetch(`${apiUrl('sendChatAction')}?chat_id=${chatId}&action=typing`)
        .then(() => audioMessageFilePath(message.voice))
        .then(downloadAudio)
        .then(recognizeAudio)
        .then(result => json(`${apiUrl('sendMessage')}?chat_id=${chatId}&text=${utf8.encode(result)}&reply_to_message_id=${messageId}`))
        .then(result => console.log(result))
        .then(() => response.send(200))
        .catch(error => console.error(error))
});

const region = process.env.FUNCTION_REGION
const gcpProject = process.env.GCP_PROJECT

const webHookUrl = `https://${region}-${gcpProject}.cloudfunctions.net/onMessage`

export const register = functions.https.onRequest((_, response) => {
    json(`${apiUrl('setWebhook')}?url=${webHookUrl}`)
        .then(result => response.json(result))
        .catch(error => response.status(500).send(error))
})

interface Message {
    readonly voice: Voice | null
    readonly chat: Chat
    readonly message_id: number
}

interface Chat {
    readonly id: number
}

interface Voice {
    readonly file_id: string
}

interface File {
    readonly file_path: string
}
