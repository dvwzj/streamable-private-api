import { ReqFastPromise } from 'req-fast-promise'
import { getVideoDurationInSeconds } from 'get-video-duration'
import VideoUploadEmitter from './video-upload-emitter'
import _ from 'lodash'

class StreamablePrivateAPI {
  constructor () {
    Object.defineProperty(this, 'auth', {
      enumerable: false,
      writable: true
    })
    Object.defineProperty(this, 'http', {
      enumerable: false,
      writable: true,
      value: new ReqFastPromise({
        headers: {}
      })
    })
    Object.defineProperty(this, 'videoUploadEmitter', {
      enumerable: false,
      writable: true,
      value: new VideoUploadEmitter()
    })
  }

  async login (username, password) {
    return new Promise((resolve, reject) => {
      try {
        this
          .http
          .post(
            'https://ajax.streamable.com/check',
            {
              username,
              password
            }
          )
          .then((res) => {
            this.auth = res.data
            this.http.defaults.headers = _.merge(this.http.defaults.headers, {
              'cookie': `user_name=${res.cookies.user_name}; user_code=${res.cookies.user_code}; session=${res.cookies.session}`
            })
            resolve(this)
          })
          .catch(reject)
      } catch (e) {
        reject(e)
      }
    })
  }

  async videos () {
    return new Promise(async (resolve, reject) => {
      try {
        const maxPage = Math.ceil(this.auth.total_videos / 12)
        const requests = _.times(maxPage, (index) => {
          return this
            .http
            .get(`https://ajax.streamable.com/videos?sort=date_added&sortd=DESC&count=12&page=${index + 1}`)
        })
        Promise
          .all(requests)
          .then((results) => {
            const videos = _.flatten(_.map(results, 'data.videos'))
            resolve(videos)
          })
          .catch(reject)
      } catch (e) {
        reject(e)
      }
    })
  }
  
  async exists (source) {
    return new Promise(async (resolve, reject) => {
      try {
        const videos = await this.videos()
        const exists = _.filter(videos, (video) => {
          return _.trim(video.source_url, '/') === _.trim(source, '/')
        })
        resolve(_.uniqBy(exists, (video) => {
          return `${_.trim(video.source_url, '/')}/${video.title}`
        }))
      } catch (e) {
        reject(e)
      }
    })
  }

  upload (url, title, force, source, extract_id) {
    try {
      force = force === undefined ? false : force
      if (force === true) {
        this.forceUpload(url, title, source, extract_id)
      } else {
        this
          .exists(source ? source : url)
          .then((exists) => {
            if (_.size(exists)) {
              this.videoUploadEmitter.emit('completed', exists)
            } else {
              this.forceUpload(url, title, source, extract_id)
            }
          })
          .catch((e) => {
            this.videoUploadEmitter.emit('error', e)
          })
      }
    } catch (e) {
      this.videoUploadEmitter.emit('error', e)
    }
    return this.videoUploadEmitter
  }

  forceUpload (url, title, source, extract_id) {
    try {
      const plan_max_length = this.auth.plan_max_length || 600
      // const query = querystring.stringify({
      //   url
      // })
      title = title === undefined ? '' : title
      this
        .http
        .get(`https://ajax.streamable.com/extract`, {
          params: {
            url: encodeURIComponent(url)
          }
        })
        .then(async (res) => {
          const videosData = {
            extract_id: extract_id ? extract_id : res.data.id,
            extractor: res.data.extractor,
            source: source ? source : url,
            status: 1,
            title,
            upload_source: 'clip',
          }
          this.videoUploadEmitter.emit('extract', { response: res.data, data: videosData })
          const length = await getVideoDurationInSeconds(res.data.url)
            .then((duration) => parseFloat(duration))
            .catch(() => 0)
          const episodes = Math.ceil(length / plan_max_length)
          if (episodes === 0) {
            this.videoUploadEmitter.emit('error', new Error(`Invalid video duration (${length})`))
          }
          const tasks = _.times(episodes, (index) => {
            return new Promise((resolve, reject) => {
              const start = index * plan_max_length
              this
                .http
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
                    length: (length / ((index + 1) * plan_max_length)) >= 1 ? plan_max_length : length % plan_max_length,
                    mute: false,
                    shortcode: res2.data.shortcode,
                    source: res.data.source_url,
                    start,
                    thumb_offset: null,
                    title: res2.data.title,
                    upload_source: res2.data.upload_source,
                    url: res.data.url,
                  }
                  this.videoUploadEmitter.emit('setup', { response: res2.data, data: transcodeData })
                  this
                    .http
                    .post(
                      `https://ajax.streamable.com/transcode/${res2.data.shortcode}`,
                      transcodeData
                    )
                    .then((res3) => {
                      const poll2Data = {
                        shortcode: res3.data.shortcode,
                        version: res3.data.version
                      }
                      this.videoUploadEmitter.emit('transcode', { response: res3.data, data: poll2Data })
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
              let percent = 0
              let videos = []
              do {
                this
                  .http
                  .post(
                    'https://ajax.streamable.com/poll2',
                    poll2Data
                  )
                  .then((res4) => {
                    videos = res4.data
                    percent = _.sumBy(res4.data, 'percent') / episodes
                    this.videoUploadEmitter.emit('progress', { videos, percent })
                  })
                  .catch((e4) => {
                    this.videoUploadEmitter.emit('error', e4)
                  })
                await new Promise((resolve) => {
                  setTimeout(() => {
                    resolve()
                  }, 5000)
                })
              } while (percent < 100)
              this.videoUploadEmitter.emit('completed', videos)
            })
            .catch((e2) => {
              this.videoUploadEmitter.emit('error', e2)
            })
        })
        .catch((e) => {
          this.videoUploadEmitter.emit('error', e)
        })
    } catch (e) {
      this.videoUploadEmitter.emit('error', e)
    }
    return this.videoUploadEmitter
  }
}

export default StreamablePrivateAPI
