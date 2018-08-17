$(function(){

    $('#frmSupport').on('submit', function(){
        $('#subject').css({'border':'1px solid #ccc'});
        $('#message').css({'border':'1px solid #ccc'});
        $('#email').css({'border':'1px solid #ccc'});
        $('#account').css({'border':'1px solid #ccc'});
        if ($('#email').val() == ''){
            $('#email').css({'border':'1px solid rgb(255, 50, 50)'});
            $('#email').focus();
            return false;
        }
        if ($('#subject').val() == ''){
            $('#subject').css({'border':'1px solid rgb(255, 50, 50)'});
            $('#subject').focus();
            return false;
        }
        if ($('#message').val() == ''){
            $('#message').css({'border':'1px solid rgb(255, 50, 50)'});
            $('#message').focus();
            return false;
        }
        if ($('#account').val() == ''){
            $('#account').css({'border':'1px solid rgb(255, 50, 50)'});
            $('#account').focus();
            return false;
        }
        if (grecaptcha.getResponse() == 0){
            return false;
        }

        $(this).ajaxSubmit({
            beforeSend: function() {
                $('#frmSupport button[type="submit"]').button('loading');
            },
            error: function(result) 
            {
                grecaptcha.reset();
                var message = result.responseJSON.message;
                swal({
                    title: "",
                    type: "error",
                    text:message,
                    showConfirmButton: true
                })
                $('#frmSupport button[type="submit"]').button('reset');
            },
            success: function(result) 
            {
                grecaptcha.reset();
                swal({
                    type: "success",
                    title: "Send Success",
                    text:'Our support team did receive your ticket. Your problem will be solved soon.',
                    showConfirmButton: true
                },
                function(isConfirm) {
                      if (isConfirm) {
                        window.location.href = "/Support";
                      }
                  })
                setTimeout(function() {
                    window.location.href = "/Support";
                }, 9000);
            }
        });
        return false;
    });
})
