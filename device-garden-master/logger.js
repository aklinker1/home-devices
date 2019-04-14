require('colors');
const morgan = require('morgan');

const Logger = morgan(function (tokens, req, res) {
   return [
      tokens.method(req, res).yellow,
      tokens.url(req, res).cyan,
      getStatus(tokens, req, res),
      getTime(tokens, req, res)
   ].join(' ')
});

function getStatus(tokens, req, res) {
   let code = parseInt(tokens.status(req, res));
   let s = `${code}`;
   if (code < 300) s = s.green
   else if (code < 400) s = s.blue
   else if (code < 500) s = s.magenta
   else s = s.red
   return '('.reset + s + ')'.reset;
}

function getTime(tokens, req, res) {
   let time = parseFloat(tokens['response-time'](req, res));
   if (time < 100) return `${time} ms`.grey;
   if (time < 300) return `${time} ms`.reset;
   if (time < 750) return `${time} ms`.yellow;
   return `${time} ms`.red;
}

module.exports = Logger;