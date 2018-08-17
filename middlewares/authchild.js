'use strict'

const services = require('../services');
const localStorage = require('localStorage');
const User = require('../models/user');

const Partner = require('../models/partner');
function isAuth(req,res,next){ /*como es middleware recibe un 3er params*/
	
	if(!req.session.userId || !req.session.AccountID){
		return res.redirect('/logout')
	}
	
	Partner.findOne({'$and' : [{'parent' : req.session.userId},{'account_id' : req.session.AccountID}]} ,(err,check_from_id)=>{	
		User.findById(req.session.userId, function(err, user) {
			if (check_from_id)
			{
				req.user = user;
				req.partner = check_from_id;
				next()
			}
			else
			{
				return res.redirect('/logout')
			}
	        
	    });
		
	});
}

module.exports = isAuth;