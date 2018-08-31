
function Message(target, payload, msg_type) {
    this.target = target;
    this.payload = payload;
    this.msgType = msg_type;
}

Message.prototype.setFrom = function setFrom(id) {
    this.from = id;
}

Message.prototype.toString = function toString(){
    return JSON.stringify(this);
}

Message.prototype.TYPE_CONN = 0;
Message.prototype.TYPE_MSG = 1;


module.exports = Message;
