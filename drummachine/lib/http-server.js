'use strict';

var fs = require('fs'),
    union = require('union'),
    ecstatic = require('ecstatic'),
    httpProxy = require('http-proxy'),
    corser = require('corser'),

    // Gpio module
    gpio = require("pi-gpio");

//
// Remark: backwards compatibility for previous
// case convention of HTTP
//
exports.HttpServer = exports.HTTPServer = HttpServer;

/**
 * Returns a new instance of HttpServer with the
 * specified `options`.
 */
exports.createServer = function (options) {
  return new HttpServer(options);
};

/**
 * Constructor function for the HttpServer object
 * which is responsible for serving static files along
 * with other HTTP-related features.
 */
function HttpServer(options) {
  options = options || {};

  if (options.root) {
    this.root = options.root;
  }
  else {
    try {
      fs.lstatSync('./public');
      this.root = './public';
    }
    catch (err) {
      this.root = './';
    }
  }

  this.headers = options.headers || {};

  this.cache = options.cache === undefined ? 3600 : options.cache; // in seconds.
  this.showDir = options.showDir !== 'false';
  this.autoIndex = options.autoIndex !== 'false';
  this.gzip = options.gzip === true;
  this.contentType = options.contentType || 'application/octet-stream';

  if (options.ext) {
    this.ext = options.ext === true
      ? 'html'
      : options.ext;
  }

  var before = options.before ? options.before.slice() : [];

  before.push(function (req, res) {
    if (options.logFn) {
      options.logFn(req, res);
    }

    res.emit('next');
  });


  // --------------------------------------------------------
  // Raspberry project Override
  // --------------------------------------------------------


  // cors is automatically added

  //if (options.cors) {

  this.headers['Access-Control-Allow-Origin'] = '*';
  this.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Range';
  if (options.corsHeaders) {
    options.corsHeaders.split(/\s*,\s*/)
        .forEach(function (h) { this.headers['Access-Control-Allow-Headers'] += ', ' + h; }, this);
  }
  before.push(corser.create(options.corsHeaders ? {
    requestHeaders: this.headers['Access-Control-Allow-Headers'].split(/\s*,\s*/)
  } : null));

  //}

  // All the gpios object

  var request = {

    gpios: {
        15: 0,
        19: 0,
        21: 0,
        23: 0,
        29: 0
    },
    play: 0,
    stop: 0,
    bpmValueChange: 0

  };

  // Correspondances

  //A1 : GPIO17 => 11
  //A2 : GPIO27 => 13

  //B1 : GPIO22 => 15
  //B2 : GPIO10 => 19
  //B3 : GPIO9 => 21
  //B4 : GPIO11 => 23
  //B5 : GPIO5 => 29

  // Rotative button

  // 1 : GPIO6 => 31
  // 2 : GPIO13 => 33
  // 4 : GPIO19 => 35
  // 8 : GPIO26 => 37


  // Variables for volume calculs

  var result = "0000";
  var sum_int = 0;
  var sum_int_prec = 0;
  var volume = 0;

  var resultCorrespond = {
    "31" : 0,
    "33" : 0,
    "35" : 0,
    "37" : 0
  };


  // Gpios list

  var gpiosList = [11, 13, 15, 19, 21, 23, 29, 31, 33, 35, 37];

  gpiosList.forEach(function(gpioNbr) {

    // Open the gpio to listen (input no output, nothing to write)

    gpio.open(gpioNbr, "input", function () {

    });


  });


  // Interval automatically run when server start

  setInterval(function(){

    gpiosList.forEach(function(gpioNbr) {

      // Gpio state read

      gpio.read(gpioNbr, function(err, value){

        // Change request object values

        if(gpioNbr == 11) request.play = value;
        else if(gpioNbr == 13) request.stop = value;

        else if(gpioNbr == 15 || gpioNbr == 19 || gpioNbr == 21 || gpioNbr == 23 || gpioNbr == 29)
          request.gpios[gpioNbr] = value;


        if(gpioNbr == 31 || gpioNbr == 33 || gpioNbr == 35 || gpioNbr == 37){
          if(typeof value != "undefined")
            resultCorrespond[gpioNbr] = value;
        }

      });


    });

    result = resultCorrespond[37].toString() + resultCorrespond[35].toString() +
        resultCorrespond[33].toString() + resultCorrespond[31].toString();

    sum_int = parseInt(result,2);

    if(sum_int_prec != sum_int){

      if(sum_int_prec < sum_int) volume++;
      else if(sum_int_prec > sum_int) volume--;

      sum_int_prec = parseInt(result,2);
    }

    request.bpmValueChange  = volume;

  }, 50);


  // Req test for XHR HTTP request (call in public javascript main.js)

  before.push(function (req, res) {
    if (req.url === '/drummachine') {
      res.setHeader('Content-Type', 'application/json');
      var endHd = 'User-agent: *\nAllow: /';
      return res.end(JSON.stringify(request));
    }

    res.emit('next');
  });


  // --------------------------------------------------------
  // END Raspberry part
  // --------------------------------------------------------

  
  if (options.robots) {
    before.push(function (req, res) {
      if (req.url === '/robots.txt') {
        res.setHeader('Content-Type', 'text/plain');
        var robots = options.robots === true
          ? 'User-agent: *\nDisallow: /'
          : options.robots.replace(/\\n/, '\n');

        return res.end(robots);
      }

      res.emit('next');
    });
  }

  before.push(ecstatic({
    root: this.root,
    cache: this.cache,
    showDir: this.showDir,
    autoIndex: this.autoIndex,
    defaultExt: this.ext,
    gzip: this.gzip,
    contentType: this.contentType,
    handleError: typeof options.proxy !== 'string'
  }));

  if (typeof options.proxy === 'string') {
    var proxy = httpProxy.createProxyServer({});
    before.push(function (req, res) {
      proxy.web(req, res, {
        target: options.proxy,
        changeOrigin: true
      });
    });
  }

  var serverOptions = {
    before: before,
    headers: this.headers,
    onError: function (err, req, res) {
      if (options.logFn) {
        options.logFn(req, res, err);
      }

      res.end();
    }
  };

  if (options.https) {
    serverOptions.https = options.https;
  }

  this.server = union.createServer(serverOptions);
}

HttpServer.prototype.listen = function () {
  this.server.listen.apply(this.server, arguments);
};

HttpServer.prototype.close = function () {
  return this.server.close();
};
