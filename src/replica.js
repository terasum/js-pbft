const logger = require("node-color-log");
const fs = require("fs");
const path = require("path");
const cwd = require("process").cwd();
const EventEmitter = require("events");

const EvType = require("./event_type");
const P2PEngine = require("./p2p_engine");
const Message = require("./message");
const MsgType = require("./message_type");

const Consenter = require("./consensus/consenter");


// Replica class
function Replica(){}

// -----------------------
// PRIVATE METHODS
// -----------------------

// _initNet init the P2PEngine
Replica.prototype._initNet = function _initNet(){
    this.engine = new P2PEngine(this.lis, this.config.self);
    this.engine.init();
    logger.debug("replica inited p2pEngine");
}

// _bindEvent bind all current listenning event
Replica.prototype._bindEvent = function _bindEvent(){
    if (!this.engine){
        throw new Error("this replica p2p engine hasn't init yet");
    }
    logger.debug("init bind the event");

    // PING
    this.lis.on(EvType.PING, (msg) => {
        logger.info("receive PING message" + msg);
    });

    // PONG
    this.lis.on(EvType.PONG, (msg) => {
        logger.info("receive PONG message");
        logger.info(JSON.stringify(msg))
    });

    this.lis.on(EvType.SENDMSG, (id,msg) =>{
        logger.debug("send message to " + id + " msg: " + msg);
        this.send(id, msg);
    })

    this.lis.on(EvType.SESSION, (msg) => {
        logger.info("receive SESSION message");
        if(!msg || !msg.consMsgType){
            logger.error("invalid session msg") ;
            console.log(msg);
            return;
        }
        // send to consenter
        this.cons_lisenter.emit(msg.consMsgType, msg);
    });
}

// -----------------------
// PUBLIC METHODS
// -----------------------

// start the replica listenning
Replica.prototype.init = function init(emitter, config){
    this.id = config.self.selfid || 1;
    this.config = config;
    this.lis = emitter;
    this.clients = {};
    this.cons_lisenter = new EventEmitter();

    // init consenter 
    // first param id is current id
    // second param need a node list
    // third need a send func
    this.consenter = new Consenter(
        this.id, 
        config.nodes, // nodes list
        this.lis,
        this.cons_lisenter
    );

    // init consenter
    this.consenter.init();

    // init network engine
    this._initNet();
    // init event listener
    this._bindEvent();
}

// listen start server listen
Replica.prototype.listen = function listen() {
    // start listening network message
    this.engine.listen();
}

// connect to the nodes
Replica.prototype.conn = function conn(nodes){
    // start connect to timeout after 1000 ms
    setTimeout(() => {
        logger.debug("start connect to server (timeout) ...");
        for( let i = 0; i < nodes.length; i++){
            this.engine.connect(nodes[i], this);
        }
    }, 400);
}

// send message specific node id with payload
Replica.prototype.send = function send(id, pld) {
    this.engine.send_msg(id, pld);
}



// FOR TEST

Replica.prototype.s = function(id){
    this.start("confs/config"+id+".json");
}


// start a replica
Replica.prototype.start = function start(config_path){
    const cpath = path.resolve(cwd, config_path)
    logger.info("load config: " + cpath);
    if(!fs.existsSync(cpath)){
        logger.error("config file ", config_path , "not exists");
        return;
    }

    const cfs = fs.readFileSync(cpath);
    const config = JSON.parse(cfs.toString("utf-8"));
    // global event listener
    const emitter = new EventEmitter();

    // init replica
    this.init(emitter, config);

    // start server listening
    this.listen();

    // connect to other nodes
    this.conn(config.nodes);
    // test send
}

//-------------------------------
// PBFT general invoke functions
//-------------------------------

// request the primary node
// emulate the client send the request
Replica.prototype.request = function(umsg){
   if(!umsg) umsg = "TESTREQUEST";
   // set a simple message
   logger.info("node got a request: " + umsg)
   this.consenter.request(umsg);
}


module.exports = Replica;
