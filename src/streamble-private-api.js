import querystring from 'querystring'
import axios from 'axios'
import axiosCookieJarSupport  from 'axios-cookiejar-support'
import tough from 'tough-cookie'
import userAgents from 'user-agents'
import { getVideoDurationInSeconds } from 'get-video-duration'
import VideoUploadEmitter from './video-upload-emitter'
import _ from 'lodash'

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
      .then(async (res) => {
        const videosData = {
          extract_id: res.data.id,
          extractor: res.data.extractor,
          source: res.data.url,
          status: 1,
          title,
          upload_source: 'clip',
        }
        emitter.emit('extract', { response: res.data, data: videosData })
        const length = await getVideoDurationInSeconds(res.data.url)
          .then((duration) => parseFloat(duration))
          .catch(() => 0)
        const episodes = Math.ceil(length / 600)
        // console.log({ length, episodes })
        if (episodes === 0) {
          emitter.emit('error', new Error(`Invalid video duration (${length})`))
        }
        const tasks = _.times(episodes, (index) => {
          return new Promise((resolve, reject) => {
              // console.log({ index })
            const start = index * 600
            this
              .axios
              .post(
                'https://ajax.streamable.com/videos',
                _.merge(
                  {},
                  videosData,
                  {
                    title: episodes === 1 ? title : _.trim(`${title} (${index + 1}/${episodes})`, ' ')
                  }
                )
              )
              .then((res2) => {
                const transcodeData = {
                  extractor: res.data.extractor,
                  headers: res.data.headers,
                  length: (length / ((index + 1) * 600)) >= 1 ? 600 : length % 600,
                  mute: false,
                  shortcode: res2.data.shortcode,
                  source: res.data.source_url,
                  start,
                  thumb_offset: null,
                  title: res2.data.title,
                  upload_source: res2.data.upload_source,
                  url: res.data.url,
                }
                // console.log('setup response', res2.data, {transcodeData})
                emitter.emit('setup', { response: res2.data, data: transcodeData })
                this
                  .axios
                  .post(
                    `https://ajax.streamable.com/transcode/${res2.data.shortcode}`,
                    transcodeData
                  )
                  .then((res3) => {
                    const poll2Data = {
                      shortcode: res3.data.shortcode,
                      version: res3.data.version
                    }
                    // console.log('transcode response', res3.data, {poll2Data})
                    emitter.emit('transcode', { response: res3.data, data: poll2Data })
                    resolve(poll2Data)
                  })
                  .catch(reject)
              })
              .catch(reject)
            })
        })
        Promise
          .all(tasks)
          .then(async (poll2Data) => {
            // console.log({ poll2Data })
            let percent = 0
            let clips = []
            do {
              this
                .axios
                .post(
                  'https://ajax.streamable.com/poll2',
                  poll2Data
                )
                .then((res4) => {
                  // console.log('poll response', res4.data)
                  clips = res4.data
                  // percent = _.reduce(res4.data, (p, vid) => {
                  //   if (vid.percent) {
                  //     p += vid.percent
                  //   }
                  //   return p / episodes
                  // }, 0)
                  percent = _.sumBy(res4.data, 'percent') / episodes
                  emitter.emit('progress', { clips, percent })
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
            emitter.emit('completed', clips)
          })
          .catch((e2) => {
            // console.log('tasks error', e.message)
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
