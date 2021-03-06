var express = require('express');
var makeHtml = require('../helpers/wikiParser').makeHtml;
var makeNavList = require('../helpers/wikiParser').makeNavList;
var parseRedirect = require('../helpers/wikiParser').parseRedirect;
var jade = require('jade');
var router = express.Router();
var os = require("os");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'CloudWiki', host: os.hostname() });
});

var mongoose = require('mongoose');
var Article = mongoose.model('Article');

function toUpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* GET article */
router.get('/:title', function(req, res) {

  // redirect lower case to upper case
  if (req.params.title[0] !== req.params.title[0].toUpperCase()) {
    return res.redirect(301, '/' + toUpperCase(req.params.title));
  }

  Article
    .find({
      title: toUpperCase(req.params.title.replace(/_/g, " "))
    })
    .lean().exec(function (err, content) {
      

      if (!content || content.length === 0 || err)
        return res.render('article', {
          urlTitle: req.params.title,
          title: toUpperCase(req.params.title.replace(/_/g, " ")),
          error: true
        });

      var article = content[0];

      if (article.body && article.body.indexOf('#REDIRECT') === 0 && !req.query.noredirect) {
        // return res.redirect(301, '/' + article.redirect.replace(/ /g, "_"));
        return res.redirect(301, '/' + parseRedirect(article.body) + '?src=' + req.params.title);
      }

      if (req.query.src) {
        article.body = '<p id="redirect">Redirected from [[' + req.query.src.replace(/_/g, " ") + ']]</p>' + article.body;
      }

      var content = makeHtml(article.body || '','');

      res.render('article', {
        urlTitle: req.params.title,
        title: article.title,
        body: content['output'],
        articleNav: jade.render(makeNavList(content['navlist'])),
        timestamp: article.time,
        host: os.hostname()
      });
    });
});

router.get('/:title/edit', function(req, res) {

  Article
    .find({
      title: toUpperCase(req.params.title.replace(/_/g, " "))
    })
    .lean().exec(function (err, content) {
      

      if (!content || content.length === 0 || !content[0] || err)
        return res.render('edit', {
          urlTitle: req.params.title,
          title: toUpperCase(req.params.title.replace(/_/g, " ")),
          body: '',
          error: true
        });

      var article = content[0];

      res.render('edit', {
        urlTitle: req.params.title,
        title: article.title,
        body: article.body,
        host: os.hostname()
      });
    });
});

router.get('/search/:search', function(req, res) {

  console.log(makeHtml('[[' + req.params.search + ']]'), '');
  res.render('search', {
    title: 'Search Results ' + req.params.search,
    term: req.params.search,
    match: makeHtml('<h2> Exact Title: [[' + req.params.search + ']]</h2>', '')['output'],
    host: os.hostname()
  });

});

module.exports = router;
