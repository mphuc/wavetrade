'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const Tickerchema = new Schema({
	coin: String,
    btc: String,
    eth: String,
    bch: String,
    xrp: String,
    ltc: String,
    miota: String,
    xem: String,
    dash: String,
    eurusd: String,
    audusd: String,
    gbpusd: String,
    usdjpy: String,
    eurgbp: String,
    eurjpy: String,
    usdcad: String,
    usdchf: String,
    diamond: String,
    wave : String
});
var Ticker = mongoose.model('Ticker', Tickerchema);
module.exports = Ticker;