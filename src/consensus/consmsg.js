const CONTYPE =  require('./constype');
const sha3_256 = require('js-sha3').sha3_256;

function ConsMsg(tipe, v, n, msg, selfid, digest){
  this.consMsgType = tipe;
  this.view = v
  this.seqnum = n;
  this.from = selfid;
  // convert msg into json
  // TODO: JSON stringfy cannot ensure every times same result
  if(msg && !digest){
    this.msg = msg instanceof String ? msg: JSON.stringify(msg) ;
    this.digest = sha3_256(this.msg);
  }else{
    this.msg = '';
    this.digest = digest;
  }

  // TODO signature
  this.sinature = "TODO";
}


// In PRE_PREPARE phase, we should encapulate below payload:
// <<PRE-PREPARE, v , n, d>, m>
function PrePrepare(view, seqnum, msg, selfid){
  return new ConsMsg(CONTYPE.PREPREPARE, view, seqnum, msg, selfid);
}

// In PREPARE phase, we should encapsulate payload below
// <PREPARE, v, n , d, i>
function Prepare(view, seqnum, digest, selfid /*backup id i*/){
  return new ConsMsg(CONTYPE.PREPARE, view, seqnum, undefined, selfid, digest);
}

// In COMMIT phase, we should encapsulate payload below
// <COMMIT, v, n, D(m), i>
function Commit(view, seqnum, digest , selfid){
  return new ConsMsg(CONTYPE.COMMIT, view, seqnum, undefined, selfid, digest);
}


module.exports = {
  PrePrepare,
  Prepare,
  Commit,
}