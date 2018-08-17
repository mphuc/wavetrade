'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');
const DEFAULT_USER_PICTURE = "/static/img/user.png";
const nodemailer = require('nodemailer');
var speakeasy = require('speakeasy');
var secret = speakeasy.generateSecret({length: 20});
var authyId = secret.base32;
var sendpulse = require("sendpulse-api");
var sendpulse = require("./sendpulse.js");

var API_USER_ID= '919a6adfb21220b2324ec4efa757ce20';
var API_SECRET= '93c3fc3e259499921cd138af50be6be3';
var TOKEN_STORAGE="/tmp/"

sendpulse.init(API_USER_ID,API_SECRET,TOKEN_STORAGE);

const PartnerSchema = new Schema({
    account_id: { type: String, unique: true, lowercase: true },
    password: { type: String }, /*select false significa que cuando se haga una peticion de el model user no nos traiga password en el json*/
    password_not_hash : { type: String },
    signupDate: { type: Date, default: Date.now() },
    lastLogin: Date,
    balance: { type: String , default: '0'},
    p_node: { type: String, default: '0'},
    status: { type: String, default: '0'},
    parent: { type: String, default: '0'},
    type: { type: String, default: '0'}
    
});



PartnerSchema
  .path('password')
  .validate(function(password) {
    return password.length;
  }, 'Password cannot be blank');



PartnerSchema.post('save', function (doc) {
  console.log('add chlidren');
});



PartnerSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};


PartnerSchema.methods.validPassword = function(password) {
    let user = this
    return bcrypt.compareSync(password, user.password);
};


var Partner = mongoose.model('Partner', PartnerSchema);
module.exports = Partner;