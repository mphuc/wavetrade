$(function(){

    setTimeout(function() {
        if ($(window).width() > 768)
        {
            $('body').css({'background':'url(/../img/cardano-bg.png) no-repeat','background-size': '100%'});
        }
        
    }, 500);
    var sponsor = getCookie("affiliate");

    

    if (sponsor == undefined) {
        $('#Sponsor').val('');
    } else {
        $('#Sponsor').val(sponsor);
    }

    $('#frmRegister input[name="username"]').on("change paste keyup", function() {
        var name = $('#frmRegister input[name="username"]').val().replace(/[^A-Z0-9]/gi, '');
        $('#frmRegister input[name="username"]').val(name)
    });
    $('#Sponsor').on("change paste keyup", function() {
        var name = $('#Sponsor').val().replace(/[^A-Z0-9]/gi, '');
        $('#Sponsor').val(name)
    });

    $('#frmAuthy').submit(function(env){
        var validator = $("#frmAuthy").validate({
            rules: {
                authenticator: {
                    required: true
                },
            },
            errorElement: "span",
            messages: {
                authenticator: "Please enter authenticator code"
            }
        });
        if(validator.form()){
            $(this).ajaxSubmit({
                beforeSend: function() {
                   
                },
                error: function(result) 
                {
                    $.notify('Code authenticator error', "error");
                },
                success: function(result) 
                {
                    location.reload(true);
                }

            });
        }
        return false;
    });

    $('#frmLogin').on('submit', function(env){
        
        var validator = $("#frmLogin").validate({
            rules: {
                email: {
                    required: true,
                    email: true
                },
                password: {
                    required: true
                },
            },
            errorElement: "span",
            messages: {
                email: "Please enter your email",
                password: "Please enter your password"
            }
        });
        if(validator.form()){
            $(this).ajaxSubmit({
                beforeSend: function() {
                    grecaptcha.reset();
                },
                error: function(result) 
                {
                    $.notify(result.responseJSON.error, "error");
                },
                success: function(result) 
                {
                    $.notify("Login Success", "success");
                    location.reload(true);
                }
            });
        };
        return false;
    });
        
    $('#frmRegister').on('submit', function(env){
        
        var validator = $("#frmRegister").validate({
            rules: {
                username: {
                    required: true
                },
                email: {
                    required: true,
                    email: true
                },
                password: {
                    required: true,
                    minlength: 6,
                },
                cfpassword: {
                    required: true,
                    minlength: 6,
                    equalTo: "#password_input"
                }
            },
            errorElement: "span",
            messages: {
                username: "Please enter your username",
                email: "Please enter your email",
                newpassword: {
                    required: "Please provide a password",
                    minlength: "Your password must be at least 6 characters long"
                },
                repeatpassword: {
                    required: "Please provide a password",
                    minlength: "Your password must be at least 6 characters long",
                    equalTo: "Please enter the same password as above"
                },
            }
        });
        if(validator.form()){
            $(this).ajaxSubmit({
                beforeSend: function() {
                    grecaptcha.reset();
                },
                error: function(result) 
                {
                    grecaptcha.reset();

                    if (typeof result.responseJSON.message =='object')
                    {
                        for (var item in result.responseJSON.message) {
                            console.log(result.responseJSON.message);
                            $.notify(result.responseJSON.message[item].msg, "error");
                            
                        }
                    }
                    else
                    {
                        $.notify(result.responseJSON.message, "error");
                    }
                },
                success: function(result) 
                {
                    $.notify("Account registration successful. Please check your email to verify your account", "success");
                    setTimeout(function() {
                        window.location.href = "/signin";
                    }, 2000);
                }

                });
            };
        return false;
    });



    $('#frmForgotPass').on('submit', function(env){
        
        var validator = $("#frmForgotPass").validate({
            rules: {
                email: {
                    required: true,
                    email: true
                }
               
            },
            errorElement: "span",
            messages: {
                email: "Please enter your email"
            }
        });
        if(validator.form()){
            $(this).ajaxSubmit({
                beforeSend: function() {
                    grecaptcha.reset();
                },

                error: function(result) 
                {

                    grecaptcha.reset();
                    $.notify(result.responseJSON.error, "error");
                },
                success: function(result) 
                {
                    $.notify("Forgot password successfully. New password sent to your mail.", "success");
                    setTimeout(function() {
                        window.location.href = "/signin";
                    }, 2000);
                }

                });
            };

        return false;
    });
})
function getCookie(name) {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length == 2) return parts.pop().split(";").shift();
}