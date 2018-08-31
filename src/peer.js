function Peer(s, type) {
    this.socket = s;
    this.type = type;

    this.socket.on('err', (err) => {
      console.error(err.toString());
    });

}

Peer.prototype.send = function send(msg){
    this.socket.write(msg);
}

module.exports = Peer;
