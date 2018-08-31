const logger = require("node-color-log");
const fs = require("fs");
const path = require("path");
const cwd = require("process").cwd();
const EventEmitter = require("events");

const EvType = require("./event_type");
const P2PEngine = require("./p2p_engine");
const Message = require("./message");
const MsgType = require("./message_type");


// Replica class
function Replica(){}

// -----------------------
// PRIVATE METHODS
// -----------------------

// _initNet init the P2PEngine
Replica.prototype._initNet = function _initNet(){
    this.engine = new P2PEngine(this.lis, this.config);
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

    this.lis.on(EvType.SENDMSG, () => {

    });
}

// -----------------------
// PUBLIC METHODS
// -----------------------

// start the replica listenning
Replica.prototype.init = function init(emitter, config){
    this.id = config.selfid || 1;
    this.config = config;
    this.lis = emitter;
    this.clients = {};

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
    }, 1000);
}

// send message specific node id with payload
Replica.prototype.send = function send(id, pld) {
    logger.debug("send message to " + id);
    let msg = new Message(id, pld, MsgType.MSG);
    try{
        this.engine.send_msg(id, msg.toString());
    }catch(e){
        logger.error(e.toString());
        this.engine.remove_peer(id);
    }
}

Replica.prototype.ppeer = function ppeer(){
    this.engine.print_peers();
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
    this.init(emitter, config.self);

    // start server listening
    this.listen();

    // connect to other nodes
    this.conn(config.nodes);
    // test send
}

module.exports = Replica;
