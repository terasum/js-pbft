const net = require("net");
const EvType = require("./event_type");
const Message = require("./message");
const MsgType = require("./message_type");
const PeerType = require("./peer_type");
const Peer = require("./peer");

const logger = require("node-color-log");


function P2PEngine(emitter, config){
    this.port = config.port || 8124;
    this.name = config.name;
    this.id   = config.selfid;
    this.listener = emitter;
    this.peers = {};
}

P2PEngine.prototype.init = function init(){
    let that = this;
    // create net server
    that.server = net.createServer((socket) => {
        // "connection" listener
        logger.debug("client connected");

        socket.on("end", () => {
            logger.warn("client disconnected");
        });

        // set socket data encode
        socket.setEncoding("utf8");

        // handle the client message
        socket.on("data", (chunk) => {
            try{
                let conn = JSON.parse(chunk);
                // check connection
                if(!conn || !conn.msgType) {
                    logger.error("chunk:\n\t" + chunk +"\nconn:\n\t"+ conn);
                    console.log(conn);
                    throw new Error("invalid message(c)" + conn);
                }
                // establish connection
                if (conn &&
                    conn.msgType &&
                    conn.msgType === MsgType.CONN){
                    this.add_peer(conn.from, socket, PeerType.SERVER)
                }else{
                    that.recev(conn);
                    // that.listener.emit(EvType.PONG, conn);
                }
            }catch(e){
                console.error(e);
                socket.write("server error catched!\r\n");
            }
        });

        socket.on('error', (e) => {
            throw e;
        })
    });

    that.server.on("error", (err) => {
        logger.error(err)
        // throw err;
    });

}

P2PEngine.prototype.listen = function listen(){
    if (this.server) {
        this.server.listen(this.port, () => {
            logger.debug("server listening on: " + this.port);
        });
    }else{
        logger.error("server hasn't initialized yet");
        throw new Error("server hasn't initialized yet");
    }
}

P2PEngine.prototype.connect = function connect(target){
    const that = this;
    const client = net.createConnection(
        {   port: target.port,
            host: target.host
        },

        () => {
            // "connect" listener
            logger.debug("connected to server, self: " +
                this.id +
                " target: " +
                target.id);
        });

    // set socket data encoding
    client.setEncoding("utf-8");

    client.on("connect", () => {
        // send slef infomation to server
        let connmsg = new Message(
            target.id,
            "CONNECT REQUEST",
            MsgType.CONN);
        // set from
        connmsg.setFrom(this.id);
        // send mssage
        client.write(connmsg.toString());
    })

    client.on("data", (data) => {
        try{
            let conn = JSON.parse(data);
            // check connection
            if(!conn || !conn.msgType) {
                throw new Error("invalid message(s):" + data);
            }
            that.recev(conn);
            // that.listener.emit(EvType.PONG, conn);
        }catch(e){
           console.error(e);
        }
        // TODO event handle
        // client.end();
    });

    client.on("end", () => {
        logger.warn("disconnected from server");
    });

    client.on("error", (e) => {
        logger.error("connect/send to target " + target.id + " failed");
        this.remove_peer(target.id);
    });

    client.on("connect", (c) =>{
        this.add_peer(target.id, client, PeerType.CLIENT);
    });

}

// recev msg and post higher layer
P2PEngine.prototype.recev = function recev(msg){
    // get the payload and post to replica
    this.listener.emit(EvType.SESSION, msg.payload);
}

// add a peer
P2PEngine.prototype.add_peer = function add_peer(id, socket, type){
    if (!socket) {
        logger.warn("socket is nil, add ignore");
        return;
    }

    socket.setEncoding("utf8");
    if(!this.peers[id]){
        this.peers[id] = new Peer(socket, PeerType.SERVER);
        logger.debug("add peer id: " + id);
    }else{
        logger.debug("peer: "+ id +" already saved, ignore.");
    }
}

// remove a peer
P2PEngine.prototype.remove_peer = function remove_peer(id){
    if(!this.peers[id]){return};
    try{
        let s = this.peers[id];
        if (!s){
            s.end();
        }
    }catch(e){
        logger.warn("close " + id + " socket failed, ignore and delete, err: " + e.toString());
        logger.error(e);
    }
    delete(this.peers[id]);
}


// print current connected peers
P2PEngine.prototype.print_peers = function print_peers(){
    for(let id in this.peers ){
        console.log(id);
    }
}

//send_msg to specific peer 
P2PEngine.prototype.send_msg = function(target_id, payload){
    if(this.peers[target_id]) {
        target = this.peers[target_id];
        let msg = new Message(target_id, payload, MsgType.MSG);
        msg.setFrom(this.id);
        try{
            target.send(msg.toString());
        }catch(e){
            logger.error("target send message error");
            console.error(e);
            // TODO remove peer
        }
    }else{
        logger.debug("target: " + target_id + " not connected yet, ignore send");
    }
}


module.exports = P2PEngine;
