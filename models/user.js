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
var Mailgun = require('mailgun-js');

const UserSchema = new Schema({
    email: { type: String, unique: true, lowercase: true },
    displayName: String,
    password: { type: String }, /*select false significa que cuando se haga una peticion de el model user no nos traiga password en el json*/
    password_not_hash : { type: String },
    signupDate: { type: Date, default: Date.now() },
    lastLogin: Date,
    picture:  { type: String, default:  DEFAULT_USER_PICTURE},
    active_email : { type: Number, default: 0},
    token_email : { type: String, default: ""},
    balance :  { type: Number, default: 0},
    balance_commision :  { type: Number, default: 0},
    betting :  { type: Number, default: 0},
    betting_bk :  { type: Number, default: 0},
    millionaire_commission :  { type: Number, default: 0},
    master_commission :  { type: Number, default: 0},
    diamond_commission :  { type: Number, default: 0},
    betting_node : { type: Number, default: 0},
    personal_info: {
        type: {
            firstname: { type: String, default: ""},
            lastname: { type: String, default: ""},
            birthday: { type: String, default: ""},
            gender: { type: String, default: ""},
            telephone: { type: String, default: ""},
            address: { type: String, default: ""},
            city: { type: String, default: ""},
            country: { type: String, default: ""},
            document1: { type: String, default: ""},
            document2: { type: String, default: ""},
            status_doc : { type: String, default: 0}
        }
    },

    address: {
        type: {
            addressline1: { type: String, default: ""},
            addressline2: { type: String, default: ""},
            city: { type: String, default: ""},
            state: { type: String, default: ""},
            postcode: { type: String, default: ""},
            country: { type: String, default: ""}
        }
    },
    security: {
        type: {
            login_history: [],
            ip_whitelist: [],
            two_factor_auth: { 
                type: {
                    status: { type: String, default: "0"},
                    code: { type: String, default: authyId}
                }
            }
        }
    },
    withdraw: [],
    total_invest: { type: String, default: '0'},
    active_invest: { type: String, default: '0'},
    total_earn: { type: String, default: '0'},
    p_node: { type: String, default: '0'},
    status: { type: String, default: '0'},
    level: { type: Number, default: 0},
    wallet: {
        type: {
            litecoin_wallet: {
                type: {
                    available: { type: String , default: '0'},
                    cryptoaddress: { type: String , default: ""}
                }
            },
            dashcoin_wallet: {
                type: {
                    available: { type: String , default: '0'}, 
                    cryptoaddress: { type: String , default: ""}
                }
            },
            bitcoin_wallet: {
                type: {
                    available: { type: String , default: '0'},
                    cryptoaddress: { type: String , default: ""}
                }
            },
            bitcoincash_wallet: {
                type: {
                    available: { type: String , default: '0'},
                    cryptoaddress: { type: String , default: ""}
                }
            },
            zcoin_wallet: {
                type: {
                    available: { type: String , default: '0'},
                    cryptoaddress: { type: String , default: ""}
                }
            },
            ethereum_wallet: {
                type: {
                    available: { type: String , default: '0'},
                    cryptoaddress: { type: String , default: ""}
                }
            },
            bitcoingold_wallet: {
                type: {
                    available: { type: String , default: '0'},
                    cryptoaddress: { type: String , default: ""}
                }
            },
            ripple_wallet :{
                type: {
                    available: { type: String , default: '0'},
                    cryptoaddress: { type: String , default: ""}
                }
            },
            wavecoin_wallet :{
                type: {
                    available: { type: String , default: '0'},
                    cryptoaddress: { type: String , default: ""}
                }
            }

        }
    }
    
});


// Validate empty email
UserSchema
  .path('email')
  .validate(function(email) {
    return email.length;
  }, 'Email cannot be blank');

UserSchema
  .path('displayName')
  .validate(function(displayName) {
    return displayName.length;
  }, 'User cannot be blank');
// Validate empty password
UserSchema
  .path('password')
  .validate(function(password) {
    return password.length;
  }, 'Password cannot be blank');


UserSchema
  .path('displayName')
  .validate(function(value, respond) {
    var self = this;
    this.constructor.findOne({displayName: value}, function(err, user) {
      if(err) throw err;
      if(user) {
        if(self.id === user.id) return respond(true);
        return respond(false);
      }
      respond(true);
    });
}, 'The specified username is already in use.');
UserSchema
  .path('email')
  .validate(function(value, respond) {
    var self = this;
    this.constructor.findOne({email: value}, function(err, user) {
      if(err) throw err;
      if(user) {
        if(self.id === user.id) return respond(true);
        return respond(false);
      }
      respond(true);
    });
}, 'The specified email address is already in use.');

UserSchema.post('save', function (doc) {
    sendmail(doc)
});

//send email sing up

UserSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
UserSchema.methods.validPassword = function(password) {
    let user = this
    return bcrypt.compareSync(password, user.password);
};



const sendmail = function (user){
    var API_USER_ID= "919a6adfb21220b2324ec4efa757ce20"
    var API_SECRET= "93c3fc3e259499921cd138af50be6be3"
    var TOKEN_STORAGE="/tmp/"
    sendpulse.init(API_USER_ID,API_SECRET,TOKEN_STORAGE);
    
    let token_ = "https://wavetrade.co/verify-account?token="+user.token_email + "_" + user._id+"";
    
    var content = `<div style="font-family:Arial,sans-serif;background-color:#152031;color:#424242;text-align:center"> <div class="adM"> </div> <table style="table-layout:fixed;width:90%;max-width:600px;margin:0 auto;background-color:#152031"> <tbody> <tr> <td style="padding:20px 10px 10px 0px;text-align:left"> <a href="https://wavetrade.co" title="wavetrade" target="_blank" > <img src="https://preview.ibb.co/gXWyKT/logo_right.png" alt="wavetrade" class="CToWUd" style=" width: 300px; "> </a> </td> <td style="padding:0px 0px 0px 10px;text-align:right"> </td> </tr> </tbody> </table> </div> <div style="font-family:Arial,sans-serif;background-color:#152031;color:#424242;text-align:center"> <table style="table-layout:fixed;width:90%;max-width:600px;margin:0 auto;background:#fff;font-size:14px;border:2px solid #e8e8e8;text-align:left;table-layout:fixed"> <tbody>
                 <tr>
                    <td style="padding:30px 30px 10px 30px;line-height:1.8">Dear <b>`+user.email+`</b>,</td>
                 </tr>
                 <tr>
                    <td style="padding:10px 30px;line-height:1.8">Thank you for registering on the <a href="https://wavetrade.co" target="_blank">Wavetrade</a>.</td>
                 </tr>
                 <tr>
                    <td style="padding:10px 30px;line-height:1.8">
                       Your registration request has been approved at <a href="https://wavetrade.co">Wavetrade</a>. You can sign in with the password you chose when signing up. 
                    </td>
                 </tr>
                
                <tr>
                    <td style="padding:10px 30px;line-height:1.8">
                        Email : `+user.email+`
                    </td>
                </tr>
                <tr>
                    <td style="padding:10px 30px;line-height:1.8">
                        Password : `+user.password_not_hash+`
                    </td>
                 </tr>
                <tr>
                    <td style="padding:10px 30px;line-height:1.8">
                        <a href="`+token_+`">Click to Verify Email</a>
                    </td>
                 </tr>
 <tr> <td style="border-bottom:3px solid #efefef;width:90%;display:block;margin:0 auto;padding-top:30px"></td> </tr> <tr> <td style="padding:30px 30px 30px 30px;line-height:1.3">Best regards,<br> Wavetrade Team<br> </td> </tr> </tbody> </table> </div>`;
    
    

    var api_key = 'pubkey-d94d7f85315a6663e9f68e0a5dd90acc';
    var domain = 'wavetrade.co';
    var mailgun = new Mailgun({apiKey: api_key, domain: domain});

    var data = {
    from: 'no-reply@wavetrade.co',
        to: user.email, 
        subject: 'Please verify your email address',
        html: content
    }

    mailgun.messages().send(data, function (err, body) {
        if (err) {
            console.log("got an error: ", err);
        }
        else {
            console.log(body);
        }
    });

    /*var answerGetter = function answerGetter(data){
        console.log(data);
    }*/

    //sendpulse.smtpSendMail(answerGetter,email);
}

var User = mongoose.model('User', UserSchema);
module.exports = User;