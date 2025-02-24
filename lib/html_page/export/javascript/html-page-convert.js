var system = require('system');
var fs = require('fs');
var args = system.args;

var output = null
var options = {
  "width": null,
  "height": null,
  "format": "png",
  "quality": null,
  "header": null,
  "header_height": "1cm",
  "footer": null,
  "footer_height": "1cm",
  "wait_timeout": 4242,
  "paper_size": null,
  "zoom": 1
}

function help() {
  return ("usage: phantomjs html-page-convert.js input_path output_path [-zoom=INT] [-width=INT] [-height=INT] [-quality=INT] [-format=pdf|png|jpeg|gmp|ppm|gif] [-wait_timeout=INT] [-paper_size=JSON]");
}


args.forEach(function(arg, i) {
  if (i == 0) {
    // do nothing
  } else if (i == 1) {
    html_input = arg
  } else if (i == 2) {
    output = arg
  } else {
    if (arg.search(/--(.*)/) != -1) {
      options[arg.substring(2)] = true
    } else if (arg.search(/-(.*)=(.*)/) != -1) {
      options[arg.split("=")[0].substring(1)] = arg.split("=")[1]
    } else {
      console.log(help());
      phantom.exit();
    }
  }
});

function waitFor(testFx, onReady, timeOutMillis) {
  var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000,
      start = new Date().getTime(),
      condition = false,
      interval = setInterval(function() {
          if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
            condition = (typeof(testFx) === "string" ? eval(testFx) : testFx());
          } else {
            typeof(onReady) === "string" ? eval(onReady) : onReady();
            clearInterval(interval);
          }
      }, 250);
};

output_checker = new RegExp('\.' + options["format"], 'i');
if (output.search(output_checker) == -1) {
  console.log("error: format and output does not match (should be ." + options["format"] + ")")
  phantom.exit(1);
}

var webPage = require('webpage');
var page = webPage.create();
var zoom = Number(options["zoom"]);
var width = options["width"];
var height = options["height"];
var paperSize = null

page.zoomFactor = zoom;

if (width || height) {
  page.viewportSize = { width: width * zoom, "height": height * zoom };
}

if (options["paper_size"]) {
  paperSize = JSON.parse(options["paper_size"]);
}

if (options["header"]) {
  paperSize.header = {
    height: options["header_height"],

    contents: phantom.callback(function(pageNum, numPages) {
      return options["header"];
    })
  }
}

if (options["footer"]) {
  paperSize.footer = {
    height: options["footer_height"],

    contents: phantom.callback(function(pageNum, numPages) {
      return options["footer"];
    })
  }
}

if (paperSize) {
  page.paperSize = paperSize;
}

page.content = fs.read(html_input);

waitFor(function() {
  return page.evaluate(function() {
    var images = document.images;

    for(var i = 0; i < images.length; i++) {
      if (images[i].complete == false) {
        return false;
      }
    }

    return true;
  });
}, function() {
  if (page.render(output, { "format": options["format"], "quality": options["format"] })) {
    console.log("success")
    phantom.exit(0);
  } else {
    console.log("error: render");
    phantom.exit(1);
  }
}, options["wait_timeout"]);
