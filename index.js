const fs = require('fs');
const path = require('path');
const arch = { x64: "amd64", ia32: "386", arm: "arm" }[process.arch];
const os = { win32: "windows", linux: "linux", darwin: "darwin"}[process.platform];
const ext = { win32: ".exe" }[process.platform] || "";
const binName = `apex_${os}_${arch}${ext}`;
const binPath = path.join(__dirname, binName);

module.exports = {
  download,
  run
};

function run(args, noDownload) {
  return new Promise((ok, ng) => {
    require('child_process')
      .spawn(binPath, args, {stdio: 'inherit'})
      .on('exit', process.exit)
      .on('error', ng)
  })
  .catch(err => {
    if(err.code != 'ENOENT' || noDownload) {
      return Promise.reject(err)
    }
    return download().then(() => run(args, true))
  })
  .catch(err => {
    console.error(err);
    process.exit(1)
  })
}

function download() {
  try {
    const fetch = require('node-fetch');
    const binPathTmp = `${binPath}.tmp`;
    return fetch("https://api.github.com/repos/apex/apex/releases")
      .then(res => res.json())
      .then(json => fetch(json[0].assets.filter(a => a.name == binName)[0].browser_download_url))
      .then(res => new Promise((ok, ng)=>{
        const w = res.body.pipe(fs.createWriteStream(binPathTmp, {mode: 0755}));
        w.once('error', ng);
        w.once('finish', ok);
      }))
      .then(() => new Promise((ok, ng)=>{
        fs.rename(binPathTmp, binPath, (err) => {
          if(err) return ng(err);
          ok()
        })
      }))
      .catch(err => new Promise((ok, ng) => {
        fs.unlink(binPathTmp, (err) => {
          if(err && err.code != 'ENOENT') return ng(err);
          ok()
        })
      }))
  } catch(err) {
    return Promise.reject(err)
  }
}
