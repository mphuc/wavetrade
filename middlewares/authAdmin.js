'use strict'

const services = require('../services');
const localStorage = require('localStorage');
const User = require('../models/user');
function isAuthAdmin(req,res,next){ /*como es middleware recibe un 3er params*/
	
	if(!req.session.userId){
		return res.redirect('/signin');
	}
	
	User.findById(req.session.userId, function(err, user) {
		
        
        if (req.session.userId != '5b5ad083f4a9dd5d5bde7d82' && req.headers.host.split(':')[0] != 'localhost' ) {
        	return res.redirect('/login');
        }
        
        req.user = user
		next()
    });
}

module.exports = isAuthAdmin;