const chokidar = require('chokidar');
const map = require('async/map');
const path = require('path');
const build = require('./build');
const pages = require('./pages');

const {
  now,
  paths,
} = require('./utils');

let buildAll;

const $pages = Object.keys(pages).map(k => pages[k]);

let $pagesToBuild = pages;

const buildEventPages = () => {
  const pagesToBuild = $pages.filter(p => p.slug.includes('events/'));
  console.log(`[${now()}] Starting 'Rebuild <event pages>'... `);
  map(pagesToBuild, build, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`[${now()}] Finished 'Rebuild <event pages>'... `);
  });
};

const buildOne = (fpath) => {
  const fname = path.relative(paths.content, fpath);
  let page = $pages.find(p => p.file === fname);

  if (!page) {
    if (path.basename(fpath) === 'events.yaml'
        || path.basename(fname) === 'eventPage.pug') {
      buildEventPages();
      return;
    } else if (path.basename(fname) === 'events.pug') {
      page = pages.events; // build events/ only
    } else if (path.basename(fname) === 'sponsors.yaml') {
      page = pages.sponsors; // build sponsors/ only
    } else if (path.basename(fname) === 'people.yaml') {
      $pagesToBuild = [pages.team, pages.contact];
      buildAll();
      return;
    } else {
      return;
    }
  }

  console.log(`[${now()}] Starting 'Rebuild <${fname}>'... `);
  build(page, (err) => {
    if (err) return console.error(err);
    return console.log(`[${now()}] Finished 'Rebuild <${fname}>'... `);
  });
};

buildAll = () => {
  console.log(`[${now()}] Starting 'Rebuild <all>'... `);
  map($pagesToBuild, build, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    $pagesToBuild = pages; // reset to all pages
    console.log(`[${now()}] Finished 'Rebuild <all>'... `);
  });
};

const clearAssetsCache = () =>
  delete require.cache[require.resolve(paths.assetManifest)];

const watcher = () => {
  const options = {
    ignoreInitial: true,
  };

  const watcherContent = chokidar.watch(paths.content, options);
  watcherContent.on('change', buildOne);

  if (process.env.NODE_ENV === 'production') {
    const watcherAssetHashes = chokidar.watch(paths.assetManifest, options);
    watcherAssetHashes.on('change', () => {
      console.log(`[${now()}] [ALERT] Assets modified.`);
      clearAssetsCache();
      buildAll();
    });
  }

  const watcherTemplate = chokidar.watch(paths.templateDir, options);
  watcherTemplate.on('change', buildAll);
};

module.exports = watcher;
