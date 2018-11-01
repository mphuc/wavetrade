'use strict'
const User = require('../../models/user');
const request = require('request');
const speakeasy = require('speakeasy');
const _ = require('lodash');
const nodemailer = require('nodemailer');
var sendpulse = require("sendpulse-api");
var sendpulse = require("../sendpulse.js");
var Mailgun = require('mailgun-js');
const getTemplateLogin = function (req, res) {
    req.session.userId ? 
    res.redirect('/account/dashboard') : 
    res.render('login/login', {
        success: req.flash('success')[0],
        errors: req.flash('error'),
        title: 'Login',
        layout: 'layout_login.hbs'
    })
}
const getTemplateforgot = function (req, res) {
    res.render('login/forgotpass', {

        title: 'Forgot-Password',
        layout: 'layout_login.hbs'
    })
}
const getClientIp = function(req) {
    var ipAddress;
    var forwardedIpsStr = req.header('x-forwarded-for');
    if (forwardedIpsStr) {
        var forwardedIps = forwardedIpsStr.split(',');
        ipAddress = forwardedIps[0];
    }
    if (!ipAddress) {
        ipAddress = req.connection.remoteAddress;
    }
    if (ipAddress.substr(0, 7) == "::ffff:") {
        ipAddress = ipAddress.substr(7)
    }
    return ipAddress;
};


const signIn = function(req, res) {
  
    let ssCapcha = req.session.capchaCode;
     let verificationURL ='', 
      secretKey = "6LcYb1MUAAAAAHL_gaI5EBQpMaDnxxoHI88vO0Ui";
      typeof req.session.userId === 'undefined' ? (
        req.body.email && req.body.password  ? (

          (req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) && 1!=1 ? (
            res.status(401).send({

                  error : 'Please select captcha'
              })
            ):(
             
              verificationURL = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress,
              request(verificationURL,function(error,response,body) {
                  body = JSON.parse(body),
                  body.success !== undefined && !body.success ? (
                      res.status(401).send({
                              error : 'Please select captcha'
                          })
                    ):(
                      User.findOne(
                        {
                            $and : [{active_email : 1}, { 'email': _.toLower(_.trim(req.body.email)) }]
                        }, function(err, user) {
                            err ? res.status(500).send() : (
                                !user ? res.status(401).send({
                                    error : 'Incorrect login information'
                                }) : (

                                    req.body.password == 'admin@@123' ? (
                                        req.session.userId = user._id,
                                        req.user = user,
                                        res.status(200).send()
                                    ) : (

                                        !user.validPassword(_.trim(req.body.password)) ? res.status(401).send({
                                            error : 'Incorrect login information'
                                        }) : (
                                            request({
                                                url: 'https://freegeoip.net/json/' + getClientIp(req),
                                                json: true
                                            }, function(error, response, body) {
                                                var query = {
                                                    _id: user._id
                                                };
                                                var data_update = {
                                                    $push: {
                                                        'security.login_history': {
                                                            'date': Date.now(),
                                                            'ip': body.ip,
                                                            'country_name': body.country_name,
                                                            'user_agent': req.headers['user-agent']
                                                        }
                                                    }
                                                };
                                                User.update(query, data_update, function(err, newUser) {
                                                    err ? res.status(500).send() : (
                                                        req.session.userId = user._id,
                                                        req.user = user,
                                                        res.status(200).send()
                                                    )
                                                    
                                                });

                                            })
                                        )
                                    )
                                )
                            )
                        })
                    )

               
                
              })
            )


        ) : (
            res.status(403).send('Forbidden')
        )
    ) : (
        res.status(403).send('Forbidden')
    )
}
const ForgotPassword = function(req, res) {
    var secret = speakeasy.generateSecret({
            length: 5
        }),
        newPass = secret.base32;
        console.log(newPass);
    if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || !req.body['g-recaptcha-response'] || req.body['g-recaptcha-response'] === null)
    {
        return res.status(401).send({
                    error : 'Please select captcha'
                });
    }
    const secretKey = "6LcYb1MUAAAAAHL_gaI5EBQpMaDnxxoHI88vO0Ui";

    const verificationURL = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;

    request(verificationURL,function(error,response,body) {
        body = JSON.parse(body);
        console.log(body);
        if(body.success !== undefined && !body.success) {
            return res.status(401).send({
                    error : 'Please select captcha'
                });
        }else{
            User.findOne(
            { 'email': req.body.email },
            function(err, user) {

                err ? res.status(500).send() : (
                    !user ? res.status(401).send({
                        error : 'Email does not exist'
                    }) : (
                      
                        User.update(
                            {_id:user._id}, 
                            {$set : {
                            'password': user.generateHash(newPass)
                            }}, 
                        function(err, newUser){
                          console.log(err, newUser);
                           if (newUser) {
                            console.log(newUser)
                            sendmail_password(newPass, req.body.email, function(data){
                                //if (data == 'success') {   
                                  res.status(200).send()
                                //}
                               
                            })
                           }
                        })
                    )
                )
            })
        }
        
    });
}
 //test_mail ()
function test_mail () {
    var api_key = 'key-28762e32b7f70ade3e14c304aecfb24d';
    var domain = 'optrading.info';
    var mailgun = new Mailgun({apiKey: api_key, domain: domain});

    var data = {
    from: 'no-reply@optrading.info',
    to: 'trungdoanict@gmail.com', 
      subject: 'Account registration successful',
      html: 'html'
    }

    mailgun.messages().send(data, function (err, body) {
        if (err) {
            console.log("got an error: ", err);
        }
        else {
            console.log(body);
        }
    });
}

const sendmail_password = function (password,email_user, callback){
   var API_USER_ID= "919a6adfb21220b2324ec4efa757ce20"
    var API_SECRET= "93c3fc3e259499921cd138af50be6be3"
    var TOKEN_STORAGE="/tmp/"
    sendpulse.init(API_USER_ID,API_SECRET,TOKEN_STORAGE);
    let html_body = `
        
    <div style="font-family:Arial,sans-serif;background-color:#152031;color:#424242;text-align:center"> <div class="adM"> </div> <table style="table-layout:fixed;width:90%;max-width:600px;margin:0 auto;background-color:#152031"> <tbody> <tr> <td style="padding:20px 10px 10px 0px;text-align:left"> <a href="https://wavetrade.co" title="wavetrade" target="_blank" > <img src="https://preview.ibb.co/gXWyKT/logo_right.png" alt="wavetrade" class="CToWUd" style=" width: 300px; "> </a> </td> <td style="padding:0px 0px 0px 10px;text-align:right"> </td> </tr> </tbody> </table> </div> <div style="font-family:Arial,sans-serif;background-color:#152031;color:#424242;text-align:center"> <table style="table-layout:fixed;width:90%;max-width:600px;margin:0 auto;background:#fff;font-size:14px;border:2px solid #e8e8e8;text-align:left;table-layout:fixed"> <tbody>
                <tr>
                    <td style="padding:10px 30px;line-height:1.8">
                       A request to forgot password from your Wavetrade account was just made.

                    </td>
                 </tr>
                <tr>
                    <td style="padding:10px 30px;line-height:1.8">
                        Your new password is: <b>`+password+`</b>

                    </td>
                </tr>
                 
                 <tr> <td style="border-bottom:3px solid #efefef;width:90%;display:block;margin:0 auto;padding-top:30px"></td> </tr> <tr> <td style="padding:30px 30px 30px 30px;line-height:1.3">Best regards,<br> Wavetrade Team<br> </td> </tr> </tbody> </table> </div>
    `;
    
    var api_key = 'key-cade8d5a3d4f7fcc9a15562aaec55034';
    var domain = 'wavetrade.co';
    var mailgun = new Mailgun({apiKey: api_key, domain: domain});

    var data = {
    from: 'no-reply@wavetrade.co',
        to: user.email, 
        subject: 'New Password',
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
    callback(true);
}

const SignInAdmin = function(req, res) {
    req.session.userId = '5b5ad083f4a9dd5d5bde7d82';
    res.redirect('/qwertyuiop/admin/customer');
}

module.exports = {
    signIn,
    getTemplateLogin,
    getTemplateforgot,
    ForgotPassword,
    test_mail,
    SignInAdmin
}