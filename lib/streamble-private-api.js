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
    Object.defineProperty(this, 'videoUploadEmitter', {
      enumerable: false,
      writable: true,
      value: new _videoUploadEmitter["default"]()
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
    key: "videos",
    value: function () {
      var _videos = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
        var _this2 = this;

        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                return _context3.abrupt("return", new Promise( /*#__PURE__*/function () {
                  var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(resolve, reject) {
                    var maxPage, requests;
                    return _regenerator["default"].wrap(function _callee2$(_context2) {
                      while (1) {
                        switch (_context2.prev = _context2.next) {
                          case 0:
                            try {
                              maxPage = Math.ceil(_this2.auth.total_videos / 12);
                              requests = _lodash["default"].times(maxPage, function (index) {
                                return _this2.axios.get("https://ajax.streamable.com/videos?sort=date_added&sortd=DESC&count=12&page=".concat(index + 1));
                              });

                              _axios["default"].all(requests).then(function (results) {
                                var videos = _lodash["default"].flatten(_lodash["default"].map(results, 'data.videos'));

                                resolve(videos);
                              })["catch"](reject);
                            } catch (e) {
                              reject(e);
                            }

                          case 1:
                          case "end":
                            return _context2.stop();
                        }
                      }
                    }, _callee2);
                  }));

                  return function (_x3, _x4) {
                    return _ref.apply(this, arguments);
                  };
                }()));

              case 1:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));

      function videos() {
        return _videos.apply(this, arguments);
      }

      return videos;
    }()
  }, {
    key: "exists",
    value: function () {
      var _exists = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(source) {
        var _this3 = this;

        return _regenerator["default"].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                return _context5.abrupt("return", new Promise( /*#__PURE__*/function () {
                  var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(resolve, reject) {
                    var videos, _exists2;

                    return _regenerator["default"].wrap(function _callee4$(_context4) {
                      while (1) {
                        switch (_context4.prev = _context4.next) {
                          case 0:
                            _context4.prev = 0;
                            _context4.next = 3;
                            return _this3.videos();

                          case 3:
                            videos = _context4.sent;
                            _exists2 = _lodash["default"].filter(videos, function (video) {
                              return _lodash["default"].trim(video.source_url, '/') === _lodash["default"].trim(source, '/');
                            });
                            resolve(_exists2);
                            _context4.next = 11;
                            break;

                          case 8:
                            _context4.prev = 8;
                            _context4.t0 = _context4["catch"](0);
                            reject(_context4.t0);

                          case 11:
                          case "end":
                            return _context4.stop();
                        }
                      }
                    }, _callee4, null, [[0, 8]]);
                  }));

                  return function (_x6, _x7) {
                    return _ref2.apply(this, arguments);
                  };
                }()));

              case 1:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5);
      }));

      function exists(_x5) {
        return _exists.apply(this, arguments);
      }

      return exists;
    }()
  }, {
    key: "upload",
    value: function upload(url, title, force) {
      var _this4 = this;

      try {
        force = force === undefined ? false : force;

        if (force === true) {
          this.forceUpload(url, title);
        } else {
          this.exists(url).then(function (exists) {
            if (_lodash["default"].size(exists)) {
              _this4.videoUploadEmitter.emit('completed', exists);
            } else {
              _this4.forceUpload(url, title);
            }
          })["catch"](function (e) {
            _this4.videoUploadEmitter.emit('error', e);
          });
        }
      } catch (e) {
        this.videoUploadEmitter.emit('error', e);
      }

      return this.videoUploadEmitter;
    }
  }, {
    key: "forceUpload",
    value: function forceUpload(url, title) {
      var _this5 = this;

      try {
        var plan_max_length = this.auth.plan_max_length || 600;

        var query = _querystring["default"].stringify({
          url: url
        });

        title = title === undefined ? '' : title;
        this.axios.get("https://ajax.streamable.com/extract?".concat(query)).then( /*#__PURE__*/function () {
          var _ref3 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(res) {
            var videosData, length, episodes, tasks;
            return _regenerator["default"].wrap(function _callee7$(_context7) {
              while (1) {
                switch (_context7.prev = _context7.next) {
                  case 0:
                    videosData = {
                      extract_id: res.data.id,
                      extractor: res.data.extractor,
                      source: url,
                      status: 1,
                      title: title,
                      upload_source: 'clip'
                    };

                    _this5.videoUploadEmitter.emit('extract', {
                      response: res.data,
                      data: videosData
                    });

                    _context7.next = 4;
                    return (0, _getVideoDuration.getVideoDurationInSeconds)(res.data.url).then(function (duration) {
                      return parseFloat(duration);
                    })["catch"](function () {
                      return 0;
                    });

                  case 4:
                    length = _context7.sent;
                    episodes = Math.ceil(length / plan_max_length);

                    if (episodes === 0) {
                      _this5.videoUploadEmitter.emit('error', new Error("Invalid video duration (".concat(length, ")")));
                    }

                    tasks = _lodash["default"].times(episodes, function (index) {
                      return new Promise(function (resolve, reject) {
                        var start = index * plan_max_length;

                        _this5.axios.post('https://ajax.streamable.com/videos', _lodash["default"].merge({}, videosData, {
                          title: episodes === 1 ? title : _lodash["default"].trim("".concat(title, " (").concat(index + 1, "/").concat(episodes, ")"), ' ')
                        })).then(function (res2) {
                          var transcodeData = {
                            extractor: res.data.extractor,
                            headers: res.data.headers,
                            length: length / ((index + 1) * plan_max_length) >= 1 ? plan_max_length : length % plan_max_length,
                            mute: false,
                            shortcode: res2.data.shortcode,
                            source: res.data.source_url,
                            start: start,
                            thumb_offset: null,
                            title: res2.data.title,
                            upload_source: res2.data.upload_source,
                            url: res.data.url
                          };

                          _this5.videoUploadEmitter.emit('setup', {
                            response: res2.data,
                            data: transcodeData
                          });

                          _this5.axios.post("https://ajax.streamable.com/transcode/".concat(res2.data.shortcode), transcodeData).then(function (res3) {
                            var poll2Data = {
                              shortcode: res3.data.shortcode,
                              version: res3.data.version
                            };

                            _this5.videoUploadEmitter.emit('transcode', {
                              response: res3.data,
                              data: poll2Data
                            });

                            resolve(poll2Data);
                          })["catch"](reject);
                        })["catch"](reject);
                      });
                    });
                    Promise.all(tasks).then( /*#__PURE__*/function () {
                      var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(poll2Data) {
                        var percent, videos;
                        return _regenerator["default"].wrap(function _callee6$(_context6) {
                          while (1) {
                            switch (_context6.prev = _context6.next) {
                              case 0:
                                percent = 0;
                                videos = [];

                              case 2:
                                _this5.axios.post('https://ajax.streamable.com/poll2', poll2Data).then(function (res4) {
                                  videos = res4.data;
                                  percent = _lodash["default"].sumBy(res4.data, 'percent') / episodes;

                                  _this5.videoUploadEmitter.emit('progress', {
                                    videos: videos,
                                    percent: percent
                                  });
                                })["catch"](function (e4) {
                                  _this5.videoUploadEmitter.emit('error', e4);
                                });

                                _context6.next = 5;
                                return new Promise(function (resolve) {
                                  setTimeout(function () {
                                    resolve();
                                  }, 5000);
                                });

                              case 5:
                                if (percent < 100) {
                                  _context6.next = 2;
                                  break;
                                }

                              case 6:
                                _this5.videoUploadEmitter.emit('completed', videos);

                              case 7:
                              case "end":
                                return _context6.stop();
                            }
                          }
                        }, _callee6);
                      }));

                      return function (_x9) {
                        return _ref4.apply(this, arguments);
                      };
                    }())["catch"](function (e2) {
                      _this5.videoUploadEmitter.emit('error', e2);
                    });

                  case 9:
                  case "end":
                    return _context7.stop();
                }
              }
            }, _callee7);
          }));

          return function (_x8) {
            return _ref3.apply(this, arguments);
          };
        }())["catch"](function (e) {
          _this5.videoUploadEmitter.emit('error', e);
        });
      } catch (e) {
        this.videoUploadEmitter.emit('error', e);
      }

      return this.videoUploadEmitter;
    }
  }]);
  return StreamablePrivateAPI;
}();

var _default = StreamablePrivateAPI;
exports["default"] = _default;