'use strict'
const mongoose = require('mongoose');
const User = require('../models/user');
const service = require('../services');
const request = require('request');
const Support = require('../models/support');
const moment = require('moment');
const speakeasy = require('speakeasy');
var sha1 = require('sha1');
const bcrypt = require('bcrypt-nodejs');

const _ = require('lodash');
function Index(req,res){
	req.session.userId ? (
		ger_user(req.session.userId,function(result){
			result === null ?(
				res.locals.has_login = false,
				res.locals.title = 'Support',
				res.locals.menu = 'support',
				res.render('account/support')
			) : (
				res.locals.has_login = true,
				res.locals.title = 'Support',
				res.locals.menu = 'support',
				res.render('account/support')
			)
		})
	) : (
		res.locals.has_login = false,
		res.locals.title = 'Support',
		res.locals.menu = 'support',
		res.render('account/support')
	)
	
	
}

function ger_user(userId,callback){
	User.findOne({_id :userId},(err,result)=>{
		err || !result ? callback(null) : callback(result);
	})
}

function SubmitNewSupport(req,res){

	var subject = req.body.subject;
	var message = req.body.message;
	var email = req.body.email;
	var account = req.body.account;
	var user = req.user;
	if ( !subject || !message)
		return res.status(404).send({message: 'Please enter enough information'});
	
	if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null)
    {
        return res.status(401).send({ message : 'Please select captcha'});
    }
    const secretKey = "6LcYb1MUAAAAAHL_gaI5EBQpMaDnxxoHI88vO0Ui";
    const verificationURL = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;
    request(verificationURL,function(error,response,body) {
        body = JSON.parse(body);
        if(body.success !== undefined && !body.success) {
            return res.status(401).send({
                    error : 'Please select captcha'
                });
        }
        else
        {
        	let newSupport = new Support();
			var today = moment();
			newSupport.email = email;
			newSupport.account = account;
			newSupport.subject = subject;
			newSupport.message = message;
			newSupport.date = moment(today).format();
			newSupport.save((err)=>{
				err ? res.status(401).send({ error : 'Error NetWork' }) : res.status(200).send({ error : 'Success' })	
			});
        }
    })
}




module.exports = {
	Index,
	SubmitNewSupport
}