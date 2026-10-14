// AI chat relay for old devices. No dependencies. Needs Node 18+.
var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = process.env.PORT || 3000;
var API_KEY = process.env.API_KEY || '';
var API_URL = 'https://api.groq.com/openai/v1/chat/completions';
var MODEL = 'openai/gpt-oss-120b';
var ACCESS_CODE = process.env.ACCESS_CODE || '';

var SYSTEM_PROMPT = process.env.SYSTEM_PROMPT ||
  'You are a precise and honest AI assistant. Always reply in the same language the user writes in. If you do not know a specific recent event or result accurately, clearly state that you do not have the exact details, and never mix up past tournament results with current ones.';

var PAGE = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req, cb) {
  var data = '';
  req.on('data', function (c) {
    data += c;
    if (data.length > 200000) { req.destroy(); }
  });
  req.on('end', function () { cb(data); });
}

function chat(req, res) {
  readBody(req, function (raw) {
    var body;
    try { body = JSON.parse(raw); } catch (e) { return send(res, 400, { error: 'bad request' }); }

    if (ACCESS_CODE && body.code !== ACCESS_CODE) {
      return send(res, 401, { error: 'code' });
    }
    if (!API_KEY) {
      return send(res, 500, { error: 'API_KEY is not set on the server' });
    }

    var msgs = [];
    var list = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') {
        msgs.push({ role: m.role, content: m.content.slice(0, 4000) });
      }
    }
    if (!msgs.length) { return send(res, 400, { error: 'empty' }); }

    var today = new Date().toISOString().slice(0, 10);
    msgs.unshift({
      role: 'system',
      content: SYSTEM_PROMPT + ' Today is ' + today + '.'
    });

    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 60000);

    fetch(API_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY
      },
      body: JSON.stringify({ model: MODEL, messages: msgs })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (o) {
      clearTimeout(timer);
      var text = o.j && o.j.choices && o.j.choices[0] && o.j.choices[0].message &&
        o.j.choices[0].message.content;
      if (o.ok && text) { return send(res, 200, { reply: text }); }
      var why = (o.j && o.j.error && (o.j.error.message || o.j.error)) || 'no reply from the model';
      send(res, 502, { error: String(why).slice(0, 300) });
    }).catch(function (e) {
      clearTimeout(timer);
      send(res, 502, { error: e && e.name === 'AbortError' ? 'timeout, try again' : 'could not reach the AI service' });
    });
  });
}

http.createServer(function (req, res) {
  if (req.method === 'POST' && req.url === '/api/chat') { return chat(req, res); }
  if (req.method === 'GET' && (req.url === '/' || req.url.indexOf('/?') === 0)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(PAGE);
  }
  res.writeHead(404);
  res.end('Not found');
}).listen(PORT, function () {
  console.log('AI chat running on port ' + PORT + ' | model: ' + MODEL);
});
