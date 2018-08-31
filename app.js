const Replica = require("./src/replica");

const repl = require("repl");



const replica = new Replica();
let r = repl.start('js-pbft>');
r.context.rep = replica;
