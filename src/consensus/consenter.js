const ConStatus = require('./constat');
const ConsMsg = require('./consmsg');
const ConsType = require('./constype');
const EvType = require('../event_type');

const Filelog = require('./conslog');

const logger = require("../log");

const EV_CHECK_PREPARED = 'EV_CHECKPREPARED';
const EV_CHECK_COMMITTED_LOCAL = 'EV_CHECK_COMMITTED_LOCAL';


// Consenter id, nodelist
// @param nodelist: is a list
// @param id:       should cantains in nodelist
// @param sendfunc: a send message function
function Consenter(id, nodelist, listener, conslis) {
  //   properties
  // self id
  this.id = id;

  // global listener
  this.listener = listener;

  // constener listenter
  this.cons_lis = conslis;

  // this consenter nodelist
  this.nodes = nodelist;

  // current status
  this.status = ConStatus.NORMAL;

  // current node number
  this.R = nodelist.length;

  // f = floor((n - 1)/3)
  this.f = Math.floor((this.R - 1) / 3)

  // current view
  this.view = 0;

  // high water mark
  this.high_watermark = 10;

  // low water mark
  this.low_watermark = 0;

  // current sequence number
  this.seqnum = 0;

  this.filelog = new Filelog('cache/cache_' + id + ".json")

}

// init method

Consenter.prototype.init = function () {
  let that = this;
  // because of async, we need listen all message type
  // Pre-prepare
  that.cons_lis.on(ConsType.PREPREPARE, (msg) => {
    that.handle(msg);
  })

  // prepare
  that.cons_lis.on(ConsType.PREPARE, (msg) => {
    that.handle(msg);
  })

  // commmit
  that.cons_lis.on(ConsType.COMMIT, (msg) => {
    that.handle(msg);
  })


  // check prepared status
  that.cons_lis.on(EV_CHECK_PREPARED, () => {
    logger.debug("==== CONSENSUS CHECK PREPREPARE ====");
    // TODO: add message
    let isprepared = that.prepared(undefined, that.view, that.seqnum, that.id);
    if (isprepared) {
      // NOW current node reached PREPARED
      // muticast commit message
      logger.info("START COMMIT PHASE")
      let preprepare = this.filelog.get({
        // TODO this seqnum should change
        seqnum: that.seqnum,
        consMsgType: ConsType.PREPREPARE
      });

      let commit_message = new ConsMsg.Commit(this.view, this.seqnum, preprepare.digest, this.id);
      this.muticast(commit_message);
    } else {
      // recheck
      setTimeout(() => {
        this.cons_lis.emit(EV_CHECK_PREPARED);
      }, 500);

    }

  });

  that.cons_lis.on(EV_CHECK_COMMITTED_LOCAL, () => {
    logger.debug("==== CONSENSUS CHECK COMMITTED-LOCAL ====");
    // commited-local requirements:
    // only if prepred(m,v,n,i) is true
    // and i has accepted 2f + 1 commits (possibly including its own);
    // match preprepare

    // TODO n = that.seqnum cannot update during checking
    let iscmlocal = that.committed_local(undefined, that.view, that.seqnum, that.id);
    if(iscmlocal){
      logger.info("COMMITTED-LOCAL!");
      // commit
      // get msg and post to execute
      let msg = this.filelog.get({
        seqnum: that.seqnum,
        consMsgType: ConsType.PREPREPARE,
      })
      this.listener.emit(EvType.EXECUTE, that.seqnum, msg)
      this.high_watermark += 1
      this.low_watermark  += 1

    }else{
      // recheck
      setTimeout(() => {
        this.cons_lis.emit(EV_CHECK_COMMITTED_LOCAL);
      }, 500);
    }
  });
}


Consenter.prototype.prepared = function (m /* message digest */ , v /* view */ , n /* seqnum */ , i /* backup id */ ) {
  logger.info("check prepared for ( m: " + m + " v: " + v + " n: " + n + " i: " + i)
  // get one pre-prepare
  let preprepare = this.filelog.get({
    seqnum: n,
    consMsgType: ConsType.PREPREPARE
  });
  console.log({
    seqnum: n,
    consMsgType: ConsType.PREPREPARE
  })

  // preprepare should have one record pass
  // find will return first record matches condition
  if (!preprepare) {
    return false;
  }
  // TODO preprepare check for v/n/i
  // check 2f prepare record
  let prepares = this.filelog.getAll((o) => {
    // check prepares for v/n/i
    return o.seqnum === n && o.consMsgType === ConsType.PREPARE
  });

  if (!prepares || !(prepares instanceof Array)) {
    return false
  }
  // check
  _2f = 2 * this.f
  if (prepares.length < _2f) {
    logger.info("PREPARE not reach 2f");
    // recheck
    return false;
  }
  return true;
}


Consenter.prototype.committed_local = function (m /* message digest */ , v /* view */ , n /* seqnum */ , i /* backup id */ ) {
  // committed_local
  // only if prepred(m,v,n,i) is true
  if (!this.prepared(m, v, n, i)) {
    return false;
  }
  // and i has accepted 2f + 1 commits (possibly including its own);
  // check 2f prepare record
  let commits = this.filelog.getAll((o) => {
    // check prepares for v/n/i
    return o.seqnum === n && o.consMsgType === ConsType.COMMIT
  });
  // match preprepare
  if (!commits || !(commits instanceof Array)) {
    return false;
  }
  // check
  _2fp1 = 2 * this.f + 1
  if (commits.length < _2fp1) {
    logger.info("COMMIT not reach 2f + 1");
    // recheck
    return false;
  }
  return true;
}


// -------------
//  properties
// -------------

// p = v mod |R| , where |R| is current node numbers
// our view start with 0, this is important
// will return nodelist[p] node
Consenter.prototype.primary = function () {
  return this.nodes[this.view % this.R];
}

// isprimary or not
Consenter.prototype.isprimary = function () {
  this.primary() == this.id;
}

// get current seqence number and add a counter
Consenter.prototype.getseq = function () {
  return ++this.seqnum
}

// instatus return current status string
Consenter.prototype.instatus = function () {
  return ConStatus.status(this.status);
}


// use send callback function to send msg
Consenter.prototype.muticast = function (msg) {
  for (let idx = 0; idx < this.nodes.length; ++idx) {
    logger.debug("muticast message to " + this.nodes[idx].id, idx);
    // this.send(this.nodes[idx], msg);
    //TODO
    this.listener.emit(EvType.SENDMSG, this.nodes[idx].id, msg);
  }
}

//-----------------------//
//   PRIMARY PROCESS     //
//-----------------------//

// client request
Consenter.prototype.request = function (msg) {
  let cmsg = ConsMsg.PrePrepare(this.view, this.getseq(), msg, this.id);
  this.muticast(cmsg);
}


//----------------------
// status handle
//----------------------

Consenter.prototype.handle = function (cmsg) {
  if (!cmsg || !cmsg.consMsgType) {
    logger.error("invalid message");
    console.log(cmsg);
    return;
  }
  // handle
  switch (cmsg.consMsgType) {
    case ConsType.PREPREPARE:
      this.handle_preprepare(cmsg);
      break;
    case ConsType.PREPARE:
      this.handle_prepare(cmsg);
      break;
    case ConsType.COMMIT:
      this.handle_commit(cmsg);
      break;
    default:
      logger.error("unknow cons msg type");
  }
}

Consenter.prototype.handle_preprepare = function (msg) {
  console.log("---- PRE-PREPARE PHASE ----");
  console.log(msg);
  // TODO check!
  // 0. check pre-prepare msg is correct
  // 1. check the msg's signature and digest
  // 2. it is in view v
  if (msg.view != this.view) {
    logger.error("PRE-PREPARE msg view not equal");
    return;
  }
  // 3. it has not accepted pre-prepare massage from
  // view v and seqence numver n containing a different digest

  // 4. sequence number n between low water mark and high water mark
  if (msg.seqnum < this.low_watermark || msg.seqnum > this.high_watermark) {
    logger.error("PRE-PREPARE msg sequence number not between water mark");
    return;
  }
  // IMPORTANT
  // here should assign new seqnum to self, if msg.seq > this.seq
  if (msg.seqnum >= this.seqnum) {
    this.seqnum = msg.seqnum;
  }
  // append to file log
  this.filelog.append(msg);
  // success and enter PREPARE phase
  // muticast prepare message
  let prepare_msg = ConsMsg.Prepare(this.view, msg.seqnum, msg.digest, this.id);
  logger.info("muticast PREPARE MESSAGE slefid: " + this.id);
  this.muticast(prepare_msg);

  // start timer to check prepared
  // after about 1s we check
  // current node prepared or not

  setTimeout(() => {
    this.cons_lis.emit(EV_CHECK_PREPARED)
  }, 1000);

  // start timer to check committed-local
  // check commited-local
  setTimeout(() => {
    this.cons_lis.emit(EV_CHECK_COMMITTED_LOCAL)
  }, 2000);
}

Consenter.prototype.handle_prepare = function (msg) {
  console.log("---- PREPARE PHASE ----");
  console.log(msg);
  // TODO CHECK
  // 1. check signature
  // 2. check h and H (water mark)
  // 3. in view v
  // 4. seq
  this.filelog.append(msg);



}

Consenter.prototype.handle_commit = function (msg) {
  console.log("---- COMMIT PHASE ----");
  console.log(msg);
  // check
  // 0. check sig
  // 1. check seq between h and H
  // 2. check view is current view

  // append commited into log
  this.filelog.append(msg);

  // I. check committed and commiited-local
  // committed requirements:
  // only if prepared(m,v,n,i) is true for all i (backup)

  // II. commited-local requirements:
  // only if prepred(m,v,b,i) is true
  // and i has accepted 2f + 1 commits (possibly including its own);
  // match preprepare

  // commited-local loop started at preprepare check

}
module.exports = Consenter;