import querystring from 'querystring'
import axios from 'axios'
import axiosCookieJarSupport  from 'axios-cookiejar-support'
import tough from 'tough-cookie'
import userAgents from 'user-agents'
import { getVideoDurationInSeconds } from 'get-video-duration'
import VideoUploadEmitter from './video-upload-emitter'

class StreamablePrivateAPI {
  constructor () {
    Object.defineProperty(this, 'auth', {
      enumerable: false,
      writable: true
    })
    Object.defineProperty(this, 'axios', {
      enumerable: false,
      writable: true,
      value: axios.create({
        withCredentials: true,
        headers: {
          'user-agent': (new userAgents()).toString()
        }
      })
    })
    axiosCookieJarSupport(this.axios)
    this.axios.defaults.jar = new tough.CookieJar()
  }

  async login (username, password) {
    return new Promise((resolve, reject) => {
      try {
        this
          .axios
          .post(
            'https://ajax.streamable.com/check',
            {
              username,
              password
            }
          )
          .then((res) => {
            this.auth = res.data
            resolve(this)
          })
          .catch(reject)
      } catch (e) {
        reject(e)
      }
    })
  }

  upload (url, title) {
    const emitter = new VideoUploadEmitter()
    const query = querystring.stringify({
      url
    })
    title = title === undefined ? '' : title
    this
      .axios
      .get(`https://ajax.streamable.com/extract?${query}`)
      .then((res) => {
        const videosData = {
          extract_id: res.data.id,
          extractor: res.data.extractor,
          source: res.data.source_url,
          status: 1,
          title,
          upload_source: 'clip',
        }
        emitter.emit('extract', { response: res.data, data: videosData })
        this
          .axios
          .post(
            'https://ajax.streamable.com/videos',
            videosData
          )
          .then(async (res2) => {
            const length = await getVideoDurationInSeconds(res.data.source_url)
              .then((duration) => parseFloat(duration))
              .catch(() => 0)
            const transcodeData = {
              extractor: res.data.extractor,
              headers: res.data.headers,
              length,
              mute: false,
              shortcode: res2.data.shortcode,
              source: res.data.source_url,
              thumb_offset: null,
              title: res2.data.title,
              upload_source: res2.data.upload_source,
              url,
            }
            emitter.emit('setup', { response: res2.data, data: transcodeData })
            this
              .axios
              .post(
                `https://ajax.streamable.com/transcode/${res2.data.shortcode}`,
                transcodeData
              )
              .then(async (res3) => {
                const poll2Data = [
                  {
                    shortcode: res3.data.shortcode,
                    version: res3.data.version
                  }
                ]
                emitter.emit('transcode', { response: res3.data, data: poll2Data })
                let percent = 0
                let video
                do {
                  this
                    .axios
                    .post(
                      'https://ajax.streamable.com/poll2',
                      poll2Data
                    )
                    .then((res4) => {
                      video = res4.data[0]
                      if (video.percent) {
                        percent = video.percent
                        emitter.emit('progress', video)
                      }
                    })
                    .catch((e4) => {
                      emitter.emit('error', e4)
                    })
                  await new Promise((resolve) => {
                    setTimeout(() => {
                      resolve()
                    }, 5000)
                  })
                } while (percent < 100)
                emitter.emit('completed', video)
              })
              .catch((e3) => {
                emitter.emit('error', e3)
              })
          })
          .catch((e2) => {
            emitter.emit('error', e2)
          })
      })
      .catch((e) => {
        emitter.emit('error', e)
      })
    return emitter
  }
}

export default StreamablePrivateAPI
