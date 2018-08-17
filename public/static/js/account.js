
$(function(){
    
    $('#Form-submit-add-account').on('submit', function(){
        $('#Form-submit-add-account .alert').hide();
        
        $('#Form-submit-add-account').ajaxSubmit({

            beforeSend: function() {
               
                $('#Form-submit-add-account button[type="submit"]').button('loading');
            },
            error: function(result) 
            {

                if (result.responseJSON.message != 'Network Error')
                {
                    $('#Form-submit-add-account .alert').show().html(result.responseJSON.message);
                    $('#Form-submit-add-account button[type="submit"]').button('reset');
                }
                else
                {
                    setTimeout(function(){ location.reload(true); }, 4500);
                }
            },
            success: function(result) 
            {
                $('#Form-submit-add-account button[type="submit"]').button('reset');
                $('#Form-submit-add-account .alert').css({'background-color': '#006837','color':'#fff'}).show().html(result.message);
                setTimeout(function() {
                    location.reload(true);
                }, 500)
            }
        });
        return false;
    })

    $('#Form-submit-add-account-demo').on('submit', function(){
        $('#Form-submit-add-account-demo .alert').hide();
        
        $('#Form-submit-add-account-demo').ajaxSubmit({

            beforeSend: function() {
               
                $('#Form-submit-add-account-demo button[type="submit"]').button('loading');
            },
            error: function(result) 
            {

                if (result.responseJSON.message != 'Network Error')
                {
                    $('#Form-submit-add-account-demo .alert').show().html(result.responseJSON.message);
                    $('#Form-submit-add-account-demo button[type="submit"]').button('reset');
                }
                else
                {
                    setTimeout(function(){ location.reload(true); }, 4500);
                }
            },
            success: function(result) 
            {
                $('#Form-submit-add-account-demo button[type="submit"]').button('reset');
                $('#Form-submit-add-account-demo .alert').css({'background-color': '#006837','color':'#fff'}).show().html(result.message);
                setTimeout(function() {
                    location.reload(true);
                }, 500)
            }
        });
        return false;
    })

    $('.new_balance_account').on('click',function(){
        $('#myModal_NewBalance #account_id_append').val($(this).data('account_id'));
    })

    $('#Form-submit-new-balance').on('submit', function(){
        $('#Form-submit-new-balance .alert').hide();
        
        $('#Form-submit-new-balance').ajaxSubmit({

            beforeSend: function() {
               
                $('#Form-submit-new-balance button[type="submit"]').button('loading');
            },
            error: function(result) 
            {

                if (result.responseJSON.message != 'Network Error')
                {
                    $('#Form-submit-new-balance .alert').show().html(result.responseJSON.message);
                    $('#Form-submit-new-balance button[type="submit"]').button('reset');
                }
                else
                {
                    setTimeout(function(){ location.reload(true); }, 4500);
                }
            },
            success: function(result) 
            {
                $('#Form-submit-new-balance button[type="submit"]').button('reset');
                $('#Form-submit-new-balance .alert').css({'background-color': '#006837','color':'#fff'}).show().html(result.message);
                setTimeout(function() {
                    location.reload(true);
                }, 500)
            }
        });
        return false;
    })


    $('#ChanePasswordAccount').on('submit', function(){
        $('#ChanePasswordAccount .alert').hide();
        
        $('#ChanePasswordAccount').ajaxSubmit({

            beforeSend: function() {
               
                $('#ChanePasswordAccount button[type="submit"]').button('loading');
            },
            error: function(result) 
            {
                load_token();
                if (result.responseJSON.message != 'Network Error')
                {
                    $('#ChanePasswordAccount .alert').show().html(result.responseJSON.message);
                    $('#ChanePasswordAccount button[type="submit"]').button('reset');
                }
                else
                {
                    setTimeout(function(){ location.reload(true); }, 4500);
                }
            },
            success: function(result) 
            {
                $('#ChanePasswordAccount button[type="submit"]').button('reset');
                $('#ChanePasswordAccount .alert').css({'background-color': '#006837','color':'#fff'}).show().html(result.message);
                setTimeout(function() {
                    location.reload(true);
                }, 500)
            }
        });
        return false;
    })

    $('#interaltrabsfer').on('submit', function(){
        $('#interaltrabsfer .alert').hide();
        
        $('#interaltrabsfer').ajaxSubmit({

            beforeSend: function() {
               
                $('#interaltrabsfer button[type="submit"]').button('loading');
            },
            error: function(result) 
            {
                //load_token();
                if (result.responseJSON.message != 'Network Error')
                {
                    $('#interaltrabsfer .alert').show().html(result.responseJSON.message);
                    $('#interaltrabsfer button[type="submit"]').button('reset');
                }
                else
                {
                    setTimeout(function(){ location.reload(true); }, 4500);
                }
            },
            success: function(result) 
            {
                $('#interaltrabsfer button[type="submit"]').button('reset');
                $('#interaltrabsfer .alert').css({'background-color': '#006837','color':'#fff'}).show().html(result.message);
                setTimeout(function() {
                    location.reload(true);
                }, 500)
            }
        });
        return false;
    })

    
})
