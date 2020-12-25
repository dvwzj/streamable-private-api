"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _querystring = _interopRequireDefault(require("querystring"));

var _reqFastPromise = require("req-fast-promise");

var _getVideoDuration = require("get-video-duration");

var _videoUploadEmitter = _interopRequireDefault(require("./video-upload-emitter"));

var _lodash = _interopRequireDefault(require("lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

class StreamablePrivateAPI {
  constructor() {
    Object.defineProperty(this, 'auth', {
      enumerable: false,
      writable: true
    });
    Object.defineProperty(this, 'http', {
      enumerable: false,
      writable: true,
      value: new _reqFastPromise.ReqFastPromise({
        headers: {}
      })
    });
    Object.defineProperty(this, 'videoUploadEmitter', {
      enumerable: false,
      writable: true,
      value: new _videoUploadEmitter.default()
    });
  }

  login(username, password) {
    var _this = this;

    return _asyncToGenerator(function* () {
      return new Promise((resolve, reject) => {
        try {
          _this.http.post('https://ajax.streamable.com/check', {
            username,
            password
          }).then(res => {
            _this.auth = res.data;
            _this.http.defaults.headers = _lodash.default.merge(_this.http.defaults.headers, {
              'cookie': "user_name=".concat(res.cookies.user_name, "; user_code=").concat(res.cookies.user_code)
            });
            resolve(_this);
          }).catch(reject);
        } catch (e) {
          reject(e);
        }
      });
    })();
  }

  videos() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      return new Promise( /*#__PURE__*/function () {
        var _ref = _asyncToGenerator(function* (resolve, reject) {
          try {
            var maxPage = Math.ceil(_this2.auth.total_videos / 12);

            var requests = _lodash.default.times(maxPage, index => {
              return _this2.http.get("https://ajax.streamable.com/videos?sort=date_added&sortd=DESC&count=12&page=".concat(index + 1));
            });

            Promise.all(requests).then(results => {
              var videos = _lodash.default.flatten(_lodash.default.map(results, 'data.videos'));

              resolve(videos);
            }).catch(reject);
          } catch (e) {
            reject(e);
          }
        });

        return function (_x, _x2) {
          return _ref.apply(this, arguments);
        };
      }());
    })();
  }

  exists(source) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      return new Promise( /*#__PURE__*/function () {
        var _ref2 = _asyncToGenerator(function* (resolve, reject) {
          try {
            var videos = yield _this3.videos();

            var exists = _lodash.default.filter(videos, video => {
              return _lodash.default.trim(video.source_url, '/') === _lodash.default.trim(source, '/');
            });

            resolve(_lodash.default.uniqBy(exists, video => {
              return "".concat(_lodash.default.trim(video.source_url, '/'), "/").concat(video.title);
            }));
          } catch (e) {
            reject(e);
          }
        });

        return function (_x3, _x4) {
          return _ref2.apply(this, arguments);
        };
      }());
    })();
  }

  upload(url, title, force, source, extract_id) {
    try {
      force = force === undefined ? false : force;

      if (force === true) {
        this.forceUpload(url, title, source, extract_id);
      } else {
        this.exists(source ? source : url).then(exists => {
          if (_lodash.default.size(exists)) {
            this.videoUploadEmitter.emit('completed', exists);
          } else {
            this.forceUpload(url, title, source, extract_id);
          }
        }).catch(e => {
          this.videoUploadEmitter.emit('error', e);
        });
      }
    } catch (e) {
      this.videoUploadEmitter.emit('error', e);
    }

    return this.videoUploadEmitter;
  }

  forceUpload(url, title, source, extract_id) {
    var _this4 = this;

    try {
      var plan_max_length = this.auth.plan_max_length || 600;

      var query = _querystring.default.stringify({
        url
      });

      title = title === undefined ? '' : title;
      this.http.get("https://ajax.streamable.com/extract?".concat(query)).then( /*#__PURE__*/function () {
        var _ref3 = _asyncToGenerator(function* (res) {
          var videosData = {
            extract_id: extract_id ? extract_id : res.data.id,
            extractor: res.data.extractor,
            source: source ? source : url,
            status: 1,
            title,
            upload_source: 'clip'
          };

          _this4.videoUploadEmitter.emit('extract', {
            response: res.data,
            data: videosData
          });

          var length = yield (0, _getVideoDuration.getVideoDurationInSeconds)(res.data.url).then(duration => parseFloat(duration)).catch(() => 0);
          var episodes = Math.ceil(length / plan_max_length);

          if (episodes === 0) {
            _this4.videoUploadEmitter.emit('error', new Error("Invalid video duration (".concat(length, ")")));
          }

          var tasks = _lodash.default.times(episodes, index => {
            return new Promise((resolve, reject) => {
              var start = index * plan_max_length;

              _this4.http.post('https://ajax.streamable.com/videos', _lodash.default.merge({}, videosData, {
                title: episodes === 1 ? title : _lodash.default.trim("".concat(title, " (").concat(index + 1, "/").concat(episodes, ")"), ' ')
              })).then(res2 => {
                var transcodeData = {
                  extractor: res.data.extractor,
                  headers: res.data.headers,
                  length: length / ((index + 1) * plan_max_length) >= 1 ? plan_max_length : length % plan_max_length,
                  mute: false,
                  shortcode: res2.data.shortcode,
                  source: res.data.source_url,
                  start,
                  thumb_offset: null,
                  title: res2.data.title,
                  upload_source: res2.data.upload_source,
                  url: res.data.url
                };

                _this4.videoUploadEmitter.emit('setup', {
                  response: res2.data,
                  data: transcodeData
                });

                _this4.http.post("https://ajax.streamable.com/transcode/".concat(res2.data.shortcode), transcodeData).then(res3 => {
                  var poll2Data = {
                    shortcode: res3.data.shortcode,
                    version: res3.data.version
                  };

                  _this4.videoUploadEmitter.emit('transcode', {
                    response: res3.data,
                    data: poll2Data
                  });

                  resolve(poll2Data);
                }).catch(reject);
              }).catch(reject);
            });
          });

          Promise.all(tasks).then( /*#__PURE__*/function () {
            var _ref4 = _asyncToGenerator(function* (poll2Data) {
              var percent = 0;
              var videos = [];

              do {
                _this4.http.post('https://ajax.streamable.com/poll2', poll2Data).then(res4 => {
                  videos = res4.data;
                  percent = _lodash.default.sumBy(res4.data, 'percent') / episodes;

                  _this4.videoUploadEmitter.emit('progress', {
                    videos,
                    percent
                  });
                }).catch(e4 => {
                  _this4.videoUploadEmitter.emit('error', e4);
                });

                yield new Promise(resolve => {
                  setTimeout(() => {
                    resolve();
                  }, 5000);
                });
              } while (percent < 100);

              _this4.videoUploadEmitter.emit('completed', videos);
            });

            return function (_x6) {
              return _ref4.apply(this, arguments);
            };
          }()).catch(e2 => {
            _this4.videoUploadEmitter.emit('error', e2);
          });
        });

        return function (_x5) {
          return _ref3.apply(this, arguments);
        };
      }()).catch(e => {
        this.videoUploadEmitter.emit('error', e);
      });
    } catch (e) {
      this.videoUploadEmitter.emit('error', e);
    }

    return this.videoUploadEmitter;
  }

}

var _default = StreamablePrivateAPI;
exports.default = _default;