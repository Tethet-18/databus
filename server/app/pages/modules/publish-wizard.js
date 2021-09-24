var sanitizeUrl = require('@braintree/sanitize-url').sanitizeUrl;
var rp = require('request-promise');
const cheerio = require('cheerio');
var sparql = require("../../common/queries/sparql");

var webIdLookupUrl = 'http://databus.dbpedia.org/system/api/accounts?user='

const ServerUtils = require('../../common/utils/server-utils.js');

module.exports = function (router, protector) {

  require('../file-analyzer')(router, protector);

  router.get('/system/publish', protector.checkSso(), async function (req, res, next) {

    try {
      var auth = ServerUtils.getAuthInfoFromRequest(req);

      var publishers = await sparql.accounts.getPublishersByAccount(auth.info.accountName);
     

      res.render('publish-wizard', {
        title: 'Publish Data',
        data: { auth: auth, publisherData: publishers }
      });
    } catch (err) {
      console.log(err);
      res.status(404).send('Sorry cant find that!');
    }
  });

  router.get('/system/api/fetch-resource-page', async function (req, res, next) {

    try {
      var result = await fetchLinksRecursive(req.query.url, '', 0);
      res.status(200).send(result);

    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  });

  router.get('/system/publish/fetch-file', async function (req, res, next) {

    try {

      var url = req.query.url;
      var result = await fetchFile(url);
      res.status(200).send(result);

    } catch (err) {
      console.log(err);

      res.status(500).send(err);
    }
  });

  async function fetchFile(url) {

    if (url.includes('://localhost')) {
      return null;
    }

    if (url.startsWith('https://databus.dbpedia.org')) {
      return null;
    }

    // Check if definitely no file
    if (url.startsWith('http')
      && url.lastIndexOf('/') < url.lastIndexOf('.')
      && url.lastIndexOf('/') < url.indexOf('.')) {
      return null;
    }

    if (url.startsWith("https://github.com/")) {
      url = transformGithubUrl(url);
    }


    // File should be reachable, do a head request!
    var options = {};
    options.uri = url;
    options.method = 'HEAD';

    var header = await rp(options);

    var result = {
      url: url
    };

    // Prefer content disposition
    if (header['content-disposition'] != undefined) {
      var filename = getFileNameFromDisposition(header['content-disposition']);

      console.log("USING FILENAME OF CONTENT DISPOSITION: " + filename);
      parseFormatAndCompression(result, filename);

      return result;
    }

    // Try to parse from url
    if (url.lastIndexOf('/') < url.lastIndexOf('.')) {
      parseFormatAndCompression(result, url);

      return result;
    }

    return null;
  }

  function transformGithubUrl(url) {

    url = url.replace("/blob/", "/");
    url = url.replace("https://github.com/", "https://raw.githubusercontent.com/")

    return url;
  }

  function parseFormatAndCompression(result, value) {

    var nameComponents = value.split('/');

    nameComponents = nameComponents[nameComponents.length - 1].split('.');
    result.format = nameComponents

    result.format = nameComponents.length > 1 ? nameComponents[1] : 'none';
    result.compression = nameComponents.length > 2 ? nameComponents[2] : 'none';
  }

  async function fetchLinksRecursive(baseUrl, path, depth) {

    var result = [];

    try {

      // Check if the url is a file:
      var url = baseUrl + path;

      // Get the HTML and pick up HREFs
      var options = {}
      options.uri = url;
      options.method = 'GET';
      options.headers = {
        Accept: 'text/html'
      };
      options.transform = function (body) { return cheerio.load(body); };
      var $ = await rp(options);

      var hrefs = getFilteredHrefs(baseUrl + path, $);

      for (var h in hrefs) {

        var href = hrefs[h];
        result.push(href);
      }

    } catch (err) {
      console.log(err);
    }

    return result;
  }

  function getFilteredHrefs(baseUrl, $) {

    var result = [];
    links = $('a');


    $(links).each(function (i, link) {

      var link = $(link).attr('href');
      var href = new URL(link, baseUrl).href;

      result.push(href);
    });

    return result;
  }
}

/*
   function isSafeUrlz(url) {

      if (url.includes('://localhost')) {
         return false;
      }

      if (url.startsWith('https://databus.dbpedia.org')) {
         return false;
      }

      return true;
   }

   async function fetchFile(url) {
      // Sanitize the url

      if (!isSafeUrlz(url)) {
         return null;
      }

      // Check if definitely no file
      if (url.startsWith('http')
         && url.lastIndexOf('/') < url.lastIndexOf('.')
         && url.lastIndexOf('/') < url.indexOf('.')) {
         return null;
      }

      if (url.startsWith("https://github.com/")) {
         url = transformGithubUrl(url);
      }


      // File should be reachable, do a head request!
      var options = {};
      options.uri = url;
      options.method = 'HEAD';

      var header = await rp(options);

      var result = {
         url: url
      };

      // Prefer content disposition
      if (header['content-disposition'] != undefined) {
         var filename = getFileNameFromDisposition(header['content-disposition']);

         console.log("USING FILENAME OF CONTENT DISPOSITION: " + filename);
         parseFormatAndCompression(result, filename);

         return result;
      }

      // Try to parse from url
      if (url.lastIndexOf('/') < url.lastIndexOf('.')) {
         parseFormatAndCompression(result, url);

         return result;
      }

      return null;
   }

   function getFileNameFromDisposition(disp) {
      var dispEntries = disp.split(' ');
      for (var e in dispEntries) {
         if (dispEntries[e].startsWith('filename')) {
            var tmp = dispEntries[e].split('=');
            return tmp[1].replace(/"/g, '');
         }
      }
   }

   function transformGithubUrl(url) {

      url = url.replace("/blob/", "/");
      url = url.replace("https://github.com/", "https://raw.githubusercontent.com/")

      return url;
   }

   function parseFormatAndCompression(result, value) {

      console.log("PARSING FORMAT AND COMPRESSION OF " + value);

      var nameComponents = value.split('/');

      nameComponents = nameComponents[nameComponents.length - 1].split('.');
      result.format = nameComponents

      result.format = nameComponents.length > 1 ? nameComponents[1] : 'none';
      result.compression = nameComponents.length > 2 ? nameComponents[2] : 'none';

      console.log("FOUND " + result.format + " AND " + result.compression);
   }







   return router;
}
*/