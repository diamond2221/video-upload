const path = require('path')

var querystring = require("querystring"),
    fs = require("fs"),
    formidable = require("formidable");

function start(response, request) {
    console.log("Request handler 'start' was called.");

    var body = '<html>' +
        '<head>' +
        '<meta http-equiv="Content-Type" ' +
        'content="text/html; charset=UTF-8" />' +
        '</head>' +
        '<body>' +
        '<form action="/upload" enctype="multipart/form-data" ' +
        'method="post">' +
        '<input type="file" name="upload">' +
        '<input type="submit" value="Upload file" />' +
        '</form>' +
        '</body>' +
        '</html>';

    response.writeHead(200, { "Content-Type": "text/html" });
    response.write(body);
    response.end();
}

function upload(response, request) {
    console.log("Request handler 'upload' was called.");
    // response.writeHead(200, {"Content-Type": "text/plain"});
    // response.write("You've sent: " + postData);
    // response.end();
    var form = new formidable.IncomingForm();
    form.uploadDir = 'tmp';
    console.log("about to parse");
    form.parse(request, function (error, fields, files) {
        console.log("parsing done");
        const filePath = `/tmp/${Date.now()}.${files.upload.name.split('.')[1]}`
        fs.renameSync(files.upload.path, '.' + filePath);
        console.log(response.send)
        response.writeHead(200, { "Content-Type": "application/json" });
        response.write(JSON.stringify({ code: 1, data: { filePath }, msg: 'success' }));
        response.end()
        // response.writeHead(200, { "Content-Type": "text/html" });
        // response.write("received image:<br/>");
        // response.write("<img src='/show' />");
    });
}

function show(response, request) {
    console.log("Request handler 'show' was called.");
    const filePath = request.url.split('?')[1].split('=')[1]
    fs.readFile(path.resolve(`./tmp/`, `${filePath}`), "binary", function (error, file) {
        if (error) {
            response.writeHead(500, { "Content-Type": "text/plain" });
            response.write(error + "\n");
            response.end();
        } else {
            response.writeHead(200, { "Content-Type": "image/png" });
            response.write(file, "binary");
            response.end();
        }
    });
}

exports.start = start;
exports.upload = upload;
exports.show = show;
