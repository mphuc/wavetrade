'use strict';
var protocol = document.location.protocol;
var host = document.location.host;
/*if (host == "adafxpro.com")
{
    $(document).keydown(function (event) {
        if (event.keyCode == 123) { 
            return false;
        } else if (event.ctrlKey && event.shiftKey && event.keyCode == 73) { 
            return false;
        } if (event.ctrlKey && event.shiftKey && event.keyCode == 74) { 
            return false;
        }
    });
    $(document).on("contextmenu", function (e) {        
        e.preventDefault();
    });
    document.onkeydown=function(e)
    {
        if(e.which == 17)
            isCtrl=true;
        if((e.which == 85) || (e.which == 67) && isCtrl == true)
        {
            return false;
        }
    }
}*/
$(function() {

    var width = parseInt(parseFloat($(window).width()));
    if (width >340) var amount_sub = 426;
    else var amount_sub = 374;


    var height = parseInt(parseFloat($(window).height()) - amount_sub);


    $('#CandlestickChart_one').attr('style', 'height:'+height+'px !important;min-height:'+height+'px !important');
    $('#CandlestickChart_tow').attr('style', 'height:'+height+'px !important;min-height:'+height+'px !important');
    
})

$(function() {
    var name_coin = $('#_NAMECOIN_').val();
    var exchange = $('#_EXCHANGE_').val();
    var protocol = document.location.protocol;
    var host = document.location.host;
    var url = protocol + '//' + host;
    var socket = io.connect(url,{ 'forceNew': true })
    
    socket.on('connect', function(){
        $('.soket-status i').css({'color' : '#468847'});
        $('.soket-status span').html('Socket Status = Connected');
    });
   
    socket.on('disconnect', function(){
        $('.soket-status i').css({'color' : '#b94a48'});

    });
        

    $('.btn-select-amount').on('click', function(){
        if (localStorage.getItem("audio") == 'true')
        {
            var audio = new Audio('/audio/amount.mp3');
            audio.play();
        }
            
        var amount_usd = $(this).data('value');
        $('.amount_input_number').val(parseFloat($('.amount_input_number').val()) + parseFloat(amount_usd));
        return false;
    });
    $('#clearAmount').on('click', function(){
        
        $('.amount_input_number').val(0);
        return false;
    });
    
    $('.amount_input_1').on('input propertychange',function(){
        $('.amount_input_2').val($('.amount_input_1').val());
    })

    $('.amount_input_2').on('input propertychange',function(){
        $('.amount_input_1').val($('.amount_input_2').val());
    })


    $('#btn-buy-one').on('click',function(){ 
        if (parseFloat($('.amount_input_number').val()) >= 1 && parseInt($('#btn-buy-one ').attr("data-status")) == 1)
        {
            $('#btn-buy-one').attr("data-status",2);
            $('#btn-buy-one').css({'opacity' : '0.3'});
            var audio = new Audio('/tick.mp3');
            audio.play();
            $.ajax({
                type: "POST",
                url: "/exchange/submit-buy",
                data: {
                    'amount' : $('.amount_input_number').val(),
                    'MarketName' : $('#exchange_one [name="MarketName"]').val()
                },
                cache: false,
                success: function(data){
                    $('#btn-buy-one').attr("data-status",1);
                    $('#btn-buy-one').css({'opacity' : '1'});
                    //$('.amount_input_number').val(0);
                },
                error: function(data){
                    $('#btn-buy-one').attr("data-status",1);
                    $('#btn-buy-one').css({'opacity' : '1'});
                    alert('An error occurred to try again after');
                }
            });
            return false;
        }
    });


    $('#btn-sell-one').on('click',function(){
        if (parseFloat($('.amount_input_number').val()) >= 1  && parseInt($('#btn-buy-one ').attr("data-status")) == 1)
        {
            $('#btn-sell-one ').attr("data-status",2);
            $('#btn-sell-one ').css({'opacity' : '0.3'});
            var audio = new Audio('/tick.mp3');
            audio.play();
            $.ajax({
                type: "POST",
                url: "/exchange/submit-sell",
                data: {
                    'amount' : $('.amount_input_number').val(),
                    'MarketName' : $('#exchange_one [name="MarketName"]').val()
                },
                cache: false,
                success: function(data){
                    $('#btn-sell-one').attr("data-status",1);
                    $('#btn-sell-one').css({'opacity' : '1'});
                    //$('.amount_input_number').val(0);
                },
                error: function(data){
                    $('#btn-sell-one').attr("data-status",1);
                    $('#btn-sell-one').css({'opacity' : '1'});
                    alert('An error occurred to try again after');
                }
            });
            return false;
        }
    });


    $('#btn-buy-tow').on('click',function(){ 
        
        if (parseFloat($('.amount_input_number').val()) >= 1 && parseInt($('#btn-buy-tow').attr("data-status")) == 1)
        {
            $('#btn-buy-tow').attr("data-status",2);
            $('#btn-buy-tow').css({'opacity' : '0.3'});
            var audio = new Audio('/tick.mp3');
            audio.play();
            $.ajax({
                type: "POST",
                url: "/exchange/submit-buy",
                data: {
                    'amount' : $('.amount_input_number').val(),
                    'MarketName' : $('#exchange_tow [name="MarketName"]').val()
                },
                cache: false,
                success: function(data){
                    $('#btn-buy-tow').attr("data-status",1);
                    $('#btn-buy-tow').css({'opacity' : '1'});
                    
                    //$('.amount_input_number').val(0);
                },
                error: function(data){
                    $('#btn-buy-tow').attr("data-status",1);
                    $('#btn-buy-tow').css({'opacity' : '1'});
                    alert('An error occurred to try again after');
                }
            });
            return false;
        }
    });


    $('#btn-sell-tow').on('click',function(){

        if (parseFloat($('.amount_input_number').val()) >= 1  && parseInt($('#btn-buy-tow ').attr("data-status")) == 1)
        {
            $('#btn-sell-tow').attr("data-status",2);
            $('#btn-sell-tow').css({'opacity' : '0.3'});
            var audio = new Audio('/tick.mp3');
            audio.play();
            $.ajax({
                type: "POST",
                url: "/exchange/submit-sell",
                data: {
                    'amount' : $('.amount_input_number').val(),
                    'MarketName' : $('#exchange_tow [name="MarketName"]').val()
                },
                cache: false,
                success: function(data){
                    $('#btn-sell-tow').attr("data-status",1);
                    $('#btn-sell-tow').css({'opacity' : '1'});
                    //$('.amount_input_number').val(0);
                },
                error: function(data){
                    $('#btn-sell-tow').attr("data-status",1);
                    $('#btn-sell-tow').css({'opacity' : '1'});
                    alert('An error occurred to try again after');
                }
            });
            return false;
        }
    });


    

   /* $('.button_buysell .buy').on('click', function(){
        
        $('.button_buysell .buy').css({
            'background' : 'linear-gradient(to bottom,rgba(128,128,128,1) 0,rgba(77,77,77,1) 100%)'
        })
        $(".button_buysell .buy").attr("disabled",true);
        var audio = new Audio('/tick.mp3');
        audio.play();
        $.ajax({
            type: "POST",
            url: "/exchange/submit-buy",
            data: {
                'type' : $('.button_buysell [name="type"]').val(),
                'amount' : $('.button_buysell [name="amount"]').val(),
                'MarketName' : $('.button_buysell [name="MarketName"]').val(),
                'token_crt' : $('.button_buysell [name="token_crt"]').val()
            },
            cache: false,
            success: function(data){
                setTimeout(function() {
                    $('.button_buysell .buy').css({
                        'background' : 'linear-gradient(to bottom,rgba(0,104,55,1) 0,rgba(0,56,28,1) 100%)'
                    })
                    $(".button_buysell .buy").attr("disabled",false);
                }, 300);
            }
        });

        return false;
    });*/

    /*$('.button_buysell .sell').on('click', function(){
        $('.button_buysell .sell').css({
            'background' : 'linear-gradient(to bottom,rgba(128,128,128,1) 0,rgba(77,77,77,1) 100%)'
        })
        $(".button_buysell .sell").attr("disabled",true);
        var audio = new Audio('/tick.mp3');
        audio.play();
        $.ajax({
            type: "POST",
            url: "/exchange/submit-sell",
            data: {
                'type' : $('.button_buysell [name="type"]').val(),
                'amount' : $('.button_buysell [name="amount"]').val(),
                'MarketName' : $('.button_buysell [name="MarketName"]').val(),
                'token_crt' : $('.button_buysell [name="token_crt"]').val()
            },
            cache: false,
            success: function(data){
                setTimeout(function() {
                    $('.button_buysell .sell').css({
                        'background' : 'linear-gradient(to bottom,rgba(255,0,0,1) 0,rgba(165,0,0,1) 100%)'
                    })
                    $(".button_buysell .sell").attr("disabled",false);
                }, 300);
            }
        });

        return false;
    });*/

    $('.button_buysell .summ').on('click', function(){
        var audio = new Audio('/click.mp3');
        audio.play();
        var amount = $('.button_buysell [name="amount"]').val();
        $('.button_buysell [name="amount"]').val((parseFloat(amount)+2).toFixed(2));
    });

    $('.button_buysell .subt').on('click', function(){
        var audio = new Audio('/click.mp3');
        audio.play();
        var amount = $('.button_buysell [name="amount"]').val();
        $('.button_buysell [name="amount"]').val((parseFloat(amount)-2).toFixed(2));
    });

    $('.button_buysell .mult').on('click', function(){
        var audio = new Audio('/click.mp3');
        audio.play();
        var amount = $('.button_buysell [name="amount"]').val();
        $('.button_buysell [name="amount"]').val((parseFloat(amount)*2).toFixed(2));
    });

    $('.button_buysell .divi').on('click', function(){
        var audio = new Audio('/click.mp3');
        audio.play();
        var amount = $('.button_buysell [name="amount"]').val();
        $('.button_buysell [name="amount"]').val((parseFloat(amount)/2).toFixed(2));
    });

    function load_token(){
        $.ajax({
            url: "/token_crt",
            data: {},
            type: "GET",
            beforeSend: function() {},
            error: function(data) {},
            success: function(data) {
                $('.token_crt').val(data.token);
                $('.btn-submit-exchain').removeAttr('disabled' ,'disabled');
            }
        });
    }
})

 

$(document).ready(function() {
    $('#loadings').hide();

    if (localStorage.getItem("theme"))
    {
        if (localStorage.getItem("theme") == 'moon')
        {
            $('html').removeClass('night');
            $('.light_night img').attr('src','/img/sun.svg');
        }
        else
        {
            $('html').addClass('night');
            $('.light_night img').attr('src','/img/moon.svg');
        }
    }

    $('.light_night').on('click',function(){
        $('html').toggleClass('night');
        if ($('.light_night img').attr('src') == '/img/sun.svg')
        {
            $('.light_night img').attr('src','/img/moon.svg');
            localStorage.setItem("theme", "sun");
        }
        else
        {
            $('.light_night img').attr('src','/img/sun.svg');
            localStorage.setItem("theme", "moon");
        }
        
    })

    if (localStorage.getItem("audio"))
    {
        if (localStorage.getItem("audio") == 'false')
        {
            $('#is-play-sound i').removeClass('glyphicon-volume-up');
            $('#is-play-sound i').addClass('glyphicon-volume-off');
        }
    }
    else
    {
        localStorage.setItem("audio", "true");
    }
    $('#is-play-sound').on('click',function(){
        
        if ($('#is-play-sound i').attr('class') == 'glyphicon glyphicon-volume-off')
        {
            $('#is-play-sound i').removeClass('glyphicon-volume-off');
            $('#is-play-sound i').addClass('glyphicon-volume-up');
            localStorage.setItem("audio", "true");
        }
        else
        {
            $('#is-play-sound i').removeClass('glyphicon-volume-up');
            $('#is-play-sound i').addClass('glyphicon-volume-off');
            localStorage.setItem("audio", "false");
        }
        
    });
})

function copyToClipboard(){
  var copyText = document.getElementById("refLink");
  copyText.select();
  document.execCommand("Copy");
}