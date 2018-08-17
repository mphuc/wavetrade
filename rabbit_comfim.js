const amqp = require('amqplib/callback_api');
const project = require('./projectRabbitmq');
const Exchangemq = require('./rabitmq/exchange').module();
const _ = require('lodash');
let amqpConn = null;

const config = require('./config');

const listWorker = ['BBL','BTC','BCH','LTC','DASH',
                    'BCC','Withdraw_BBL','Withdraw_BTC',
                    'Withdraw_BCH','Withdraw_LTC','Withdraw_DASH',
                    'Withdraw_BCC'
                    ];

function start() {
    console.log(config.rabbit_link);
    amqp.connect(config.rabbit_link, function(err, conn) {
        if (err) {
            console.error("[AMQP]", err.message);
            return setTimeout(start, 1000);
        }
        conn.on("error", function(err) {
            if (err.message !== "Connection closing") {
                console.error("[AMQP] conn error", err.message);
            }
        });
        conn.on("close", function() {
            console.error("[AMQP] reconnecting");
            return setTimeout(start, 1000);
        });

        console.log("[AMQP] connected");
        amqpConn = conn;

        whenConnected();
    });
}

function whenConnected() {
    startPublisher();

    startWorker('COIN_WAVE', function(message, msg, ch) {
        project.process_deposit_coin(message, function(cb) {
            cb ? ch.ack(msg) : ch.ack(msg);
        });
    });

    startWorker('Deposit', function(message, msg, ch) {
        project.process_deposit(message, function(cb) {
            cb ? ch.ack(msg) : ch.ack(msg);
        });
    });
    

    startWorker('Withdraw', function(message, msg, ch) {
        project.process_withdraw(message, function(cb) {
            cb ? ch.ack(msg) : ch.ack(msg);
        });
    });
    

    startWorker('Exchange_Buy', function(message, msg, ch) {

        Exchangemq.process_buy_exchange(message, function(cb) {
            cb ? ch.ack(msg) : ch.ack(msg);
        });
    });

    startWorker('Exchange_Sell', function(message, msg, ch) {

        Exchangemq.process_sell_exchange(message, function(cb) {
            cb ? ch.ack(msg) : ch.ack(msg);
        });
    });

    

    startWorker('Update_Balance_Server', function(message, msg, ch) {

        Exchangemq.process_update_balance_server(message, function(cb) {
            cb ? ch.ack(msg) : ch.ack(msg);
        });
    });

    startWorker('Reset_Chart_Item', function(message, msg, ch) {
        Exchangemq.process_reset_item(message, function(cb) {
            cb ? ch.ack(msg) : ch.ack(msg);
        });
    });
    
    startWorker('Update_Balance_Users', function(message, msg, ch) {
        Exchangemq.process_update_balance_user(message, function(cb) {
            cb ? ch.ack(msg) : ch.ack(msg);
        });
    });
   
}

var pubChannel = null;
var offlinePubQueue = [];

function startPublisher() {

    amqpConn.createChannel(function(err, ch) {
        ch.assertQueue('COIN_WAVE', {durable: true});
        ch.assertQueue('Deposit', {durable: true});
        
        ch.assertQueue('Withdraw', {durable: true});
       
        ch.assertQueue('Exchange_Buy', {durable: true});
        ch.assertQueue('Exchange_Sell', {durable: true});

        
        ch.assertQueue('Update_Balance_Server', {durable: true});
        ch.assertQueue('Reset_Chart_Item', {durable: true});
        ch.assertQueue('Update_Balance_Users', {durable: true});
        amqpConn.createConfirmChannel(function(err, ch) {
        if (closeOnErr(err)) return;
        ch.on("error", function(err) {
            console.error("[AMQP] channel error", err.message);
        });
        ch.on("close", function() {
            console.log("[AMQP] channel closed");
        });

        pubChannel = ch;
        while (true) {
            var m = offlinePubQueue.shift();
            if (!m) break;
            publish(m[0], m[1], m[2]);
        }
    });
    })
    
}

// method to publish a message, will queue messages internally if the connection is down and resend later
function publish(exchange, routingKey, content) {

    try {
        pubChannel.publish(exchange, routingKey, content, {
                persistent: true
            },
            function(err, ok) {
                if (err) {
                    console.error("[AMQP] publish", err);
                    offlinePubQueue.push([exchange, routingKey, content]);
                    pubChannel.connection.close();
                }
            });
    } catch (e) {
        console.error("[AMQP] publish", e.message);
        offlinePubQueue.push([exchange, routingKey, content]);
    }
}

// A worker that acks messages only if processed succesfully
function startWorker(jobs, callback) {
     
    amqpConn.createChannel(function(err, ch) {
        if (closeOnErr(err)) return;
        ch.on("error", function(err) {
            console.error("[AMQP] channel error", err.message);

            

        });
        ch.on("close", function() {
            console.log("[AMQP] channel closed");
        });
        ch.prefetch(1);
        ch.assertQueue(jobs, {
            durable: true
        }, function(err, _ok) {
            if (closeOnErr(err)) return;
            ch.consume(jobs, function(msg) {
                callback(msg.content.toString(), msg, ch);


            }, {
                noAck: false
            });
            console.log("Worker " + jobs + " is started");
        });

    });
}


function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
}

module.exports = {
    start,
    publish
}