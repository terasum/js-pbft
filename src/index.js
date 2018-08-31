/*
 * according to PBFT algothm, the node will process 3 operation:
 * 1. preprepare
 * 2. prepare
 * 3. commit
 * those called 'three-phase protocol'
 * and in this JavaScript implemention,
 * I define a node(replica) has 4 status:
 * 1. NORMAL
 * 2. UNPREPARE
 * 3. UNCOMMIT
 * 4. COMMITTED
 * and the transform flow is:
 *
 * NORMAL --preprepare--> UNPREPARE --prepare--> UNCOMMIT --commit--> committed
 *
 * and we define a class named Node wich cantains a 'view' as a property,
 * 'view' is an integer, and view = TODO
 *
 *
 * ----------------------------------------
 *  THREE-PHASE PROCOL
 *
 * A. NORMAL OPERATION
 *
 *  1. client send a request 'm' to primary.
 *     Primary assign a seqence number 'n' to this request
 *
 *  2. Primary muticast the request to all backups (other replicas)
 *     `PRE-PREPARE` phase,the payload form is
 *     <<PRE-PREPARE, v , n, d>, m>
 *     where 'v' indicates the view in which the message is being sent,
 *     'm' is the client’s request message, and d is m’s digest.
 *
 *  3. All backups received the message and verify message:
 *     i. the signatures in the request and the pre-prepare
 *     message are correct and 'd' is the digest for 'm';
 *     ii. it is in view v;
 *     iii. it has not accepted a pre-prepare message for view
 *     and sequence number containing a different digest;
 *     iv. the sequence number in the pre-prepare message is
 *     between a low water mark, 'h' , and a high water mark, 'H'.
 *
 *     Only if verify passed, replica append the message
 *     into its log.
 *
 *  4. If replica 'i' has accepted <<PRE-PREPARE, v , n, d>, m> message,
 *     start `PREPARE` phase.
 *     it should muticast <PREPARE,v,n,d,i> to all other replicas, and add
 *     both message into its log
 *
 *  5. A replica (including the primary) accepts prepare
 *     messages and adds them to its log provided their
 *     signatures are correct, their view number equals the
 *     replica’s current view, and their sequence number is
 *     between h and H.
 *
 *  6. We define the predicate prepared(m,v,n,i) to be true
 *     if and only if replica has inserted in its log: the request
 *     m, a pre-prepare for in view v with sequence number n
 *     , and 2f prepares from different backups that match
 *     the pre-prepare. The replicas verify whether the prepares
 *     match the pre-prepare by checking that they have the
 *     same view, sequence number, and digest.
 *
 * 7.Replica multicasts a <COMMIT,v,n,D(m),i> to the
 *   other replicas when prepared becomes true.
 *   This starts the `COMMIT` phase. Replicas accept commit
 *   messages and insert them in their log provided they are
 *   properly signed, the view number in the message is equal
 *   to the replica’s current view, and the sequence number is
 *   between h and H.
 *
 *
 * B. GARBAGE COLLECTION
 *
 *   CHECKPOINT
 *
 * C. VIEW CHANGES
 *
 *
 *
 */



const EventEmitter = require('events');

const myEmitter = new EventEmitter();
// Only do this once so we don't loop forever
myEmitter.once('newListener', (event, listener) => {
  if (event === 'event') {
    // Insert a new listener in front
    myEmitter.on('event', () => {
      console.log('B');
    });
  }
});

myEmitter.on('event', () => {
  console.log('A');
});

myEmitter.emit('event');
myEmitter.emit('event');
myEmitter.emit('event');
// Prints:
//   B
//   A
