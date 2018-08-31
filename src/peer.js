function Peer(s, type) {
    this.socket = s;
    this.type = type;


}

Peer.prototype.send = function send(msg){
    this.socket.write(msg);
}

module.exports = Peer;
