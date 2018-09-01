const path = require("path");
const cwd = require("process").cwd();

const low = require('lowdb')
const fs = require('fs')
const FileSync = require('lowdb/adapters/FileSync')

function Filelog(fpath){
  this.path = path.resolve(cwd, fpath);
  if(fs.existsSync(this.path)){
    fs.unlinkSync(this.path);
  }
  const adapter = new FileSync(this.path)
  this.db = low(adapter);
  this.db.defaults({
    cursor: 0,
    logs: [],
  }).write();
}

// filelog.get(key,(err, value) =>{})
Filelog.prototype.get = function(query){
  return this.db.get('logs')
  .find(query)
  .value()
}

Filelog.prototype.getAll = function(filter_fn){
  return this.db
  .get('logs')
  .filter(filter_fn)
  .value();
}

// filelog.put(key,value, (err) =>{})
Filelog.prototype.append = function(msg) {
  this.db.get('logs').push(msg).write();
  this.db.update('cursor', n => n + 1)
  .write()
}

module.exports = Filelog;