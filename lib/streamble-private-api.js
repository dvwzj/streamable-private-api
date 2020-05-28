"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _querystring = _interopRequireDefault(require("querystring"));

var _axios = _interopRequireDefault(require("axios"));

var _axiosCookiejarSupport = _interopRequireDefault(require("axios-cookiejar-support"));

var _toughCookie = _interopRequireDefault(require("tough-cookie"));

var _userAgents = _interopRequireDefault(require("user-agents"));

var _getVideoDuration = require("get-video-duration");

var _videoUploadEmitter = _interopRequireDefault(require("./video-upload-emitter"));

var _lodash = _interopRequireDefault(require("lodash"));

var StreamablePrivateAPI = /*#__PURE__*/function () {
  function StreamablePrivateAPI() {
    (0, _classCallCheck2["default"])(this, StreamablePrivateAPI);
    Object.defineProperty(this, 'auth', {
      enumerable: false,
      writable: true
    });
    Object.defineProperty(this, 'axios', {
      enumerable: false,
      writable: true,
      value: _axios["default"].create({
        withCredentials: true,
        headers: {
          'user-agent': new _userAgents["default"]().toString()
        }
      })
    });
    (0, _axiosCookiejarSupport["default"])(this.axios);
    this.axios.defaults.jar = new _toughCookie["default"].CookieJar();
  }

  (0, _createClass2["default"])(StreamablePrivateAPI, [{
    key: "login",
    value: function () {
      var _login = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(username, password) {
        var _this = this;

        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", new Promise(function (resolve, reject) {
                  try {
                    _this.axios.post('https://ajax.streamable.com/check', {
                      username: username,
                      password: password
                    }).then(function (res) {
                      _this.auth = res.data;
                      resolve(_this);
                    })["catch"](reject);
                  } catch (e) {
                    reject(e);
                  }
                }));

              case 1:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      function login(_x, _x2) {
        return _login.apply(this, arguments);
      }

      return login;
    }()
  }, {
    key: "upload",
    value: function upload(url, title) {
      var _this2 = this;

      var emitter = new _videoUploadEmitter["default"]();

      var query = _querystring["default"].stringify({
        url: url
      });

      title = title === undefined ? '' : title;
      this.axios.get("https://ajax.streamable.com/extract?".concat(query)).then( /*#__PURE__*/function () {
        var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(res) {
          var videosData, length, episodes, tasks;
          return _regenerator["default"].wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  videosData = {
                    extract_id: res.data.id,
                    extractor: res.data.extractor,
                    source: res.data.url,
                    status: 1,
                    title: title,
                    upload_source: 'clip'
                  };
                  emitter.emit('extract', {
                    response: res.data,
                    data: videosData
                  });
                  _context3.next = 4;
                  return (0, _getVideoDuration.getVideoDurationInSeconds)(res.data.url).then(function (duration) {
                    return parseFloat(duration);
                  })["catch"](function () {
                    return 0;
                  });

                case 4:
                  length = _context3.sent;
                  episodes = Math.ceil(length / 600); // console.log({ length, episodes })

                  if (episodes === 0) {
                    emitter.emit('error', new Error("Invalid video duration (".concat(length, ")")));
                  }

                  tasks = _lodash["default"].times(episodes, function (index) {
                    return new Promise(function (resolve, reject) {
                      // console.log({ index })
                      var start = index * 600;

                      _this2.axios.post('https://ajax.streamable.com/videos', _lodash["default"].merge({}, videosData, {
                        title: episodes === 1 ? title : _lodash["default"].trim("".concat(title, " (").concat(index + 1, "/").concat(episodes, ")"), ' ')
                      })).then(function (res2) {
                        var transcodeData = {
                          extractor: res.data.extractor,
                          headers: res.data.headers,
                          length: length / ((index + 1) * 600) >= 1 ? 600 : length % 600,
                          mute: false,
                          shortcode: res2.data.shortcode,
                          source: res.data.source_url,
                          start: start,
                          thumb_offset: null,
                          title: res2.data.title,
                          upload_source: res2.data.upload_source,
                          url: res.data.url
                        }; // console.log('setup response', res2.data, {transcodeData})

                        emitter.emit('setup', {
                          response: res2.data,
                          data: transcodeData
                        });

                        _this2.axios.post("https://ajax.streamable.com/transcode/".concat(res2.data.shortcode), transcodeData).then(function (res3) {
                          var poll2Data = {
                            shortcode: res3.data.shortcode,
                            version: res3.data.version
                          }; // console.log('transcode response', res3.data, {poll2Data})

                          emitter.emit('transcode', {
                            response: res3.data,
                            data: poll2Data
                          });
                          resolve(poll2Data);
                        })["catch"](reject);
                      })["catch"](reject);
                    });
                  });
                  Promise.all(tasks).then( /*#__PURE__*/function () {
                    var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(poll2Data) {
                      var percent, clips;
                      return _regenerator["default"].wrap(function _callee2$(_context2) {
                        while (1) {
                          switch (_context2.prev = _context2.next) {
                            case 0:
                              // console.log({ poll2Data })
                              percent = 0;
                              clips = [];

                            case 2:
                              _this2.axios.post('https://ajax.streamable.com/poll2', poll2Data).then(function (res4) {
                                // console.log('poll response', res4.data)
                                clips = res4.data; // percent = _.reduce(res4.data, (p, vid) => {
                                //   if (vid.percent) {
                                //     p += vid.percent
                                //   }
                                //   return p / episodes
                                // }, 0)

                                percent = _lodash["default"].sumBy(res4.data, 'percent') / episodes;
                                emitter.emit('progress', {
                                  clips: clips,
                                  percent: percent
                                });
                              })["catch"](function (e4) {
                                emitter.emit('error', e4);
                              });

                              _context2.next = 5;
                              return new Promise(function (resolve) {
                                setTimeout(function () {
                                  resolve();
                                }, 5000);
                              });

                            case 5:
                              if (percent < 100) {
                                _context2.next = 2;
                                break;
                              }

                            case 6:
                              emitter.emit('completed', clips);

                            case 7:
                            case "end":
                              return _context2.stop();
                          }
                        }
                      }, _callee2);
                    }));

                    return function (_x4) {
                      return _ref2.apply(this, arguments);
                    };
                  }())["catch"](function (e2) {
                    // console.log('tasks error', e.message)
                    emitter.emit('error', e2);
                  });

                case 9:
                case "end":
                  return _context3.stop();
              }
            }
          }, _callee3);
        }));

        return function (_x3) {
          return _ref.apply(this, arguments);
        };
      }())["catch"](function (e) {
        emitter.emit('error', e);
      });
      return emitter;
    }
  }]);
  return StreamablePrivateAPI;
}();

var _default = StreamablePrivateAPI;
exports["default"] = _default;