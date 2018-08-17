$(function(){
   
	var curlangBlock = $(".current");
 	    newLang = $(".languagesList li"),
 	    currFlag = $(".currflag"),
 	    currLangText = $(".currlang"),
 	    mobIcon = $('.mobIcon'),
        mobCabinetIcon = $(".mobIcon2"),
 	    mobMenu = $(".header__menuList"),
        cabinetMenu = $(".cabinet__menu"),
        faqQuestion = $(".faqQuestion"),
        refLink = $(".refLink"),
        tItem = $(".tItem"),
        cabGreen = $(".cabGreen"),
        code__body = $('.code__body');

    $('[data-toggle="tooltip"]').tooltip();


    new WOW().init();

    
    if($(".imgShape").length){

            tItem.each(function(a,b){

            var thN = a;

            $(this).on("click",function(){
                setGreenRound(thN);   
            })
            
        });
    }

    

    if($(window).width() <= 767){
        $('.cabinet__left').css('min-height', 'auto');
    }
    else{
        var fh = $("main").height();
        $('.cabinet__left').css('min-height', fh + 'px');
    }

    $(window).on("resize",function(){
        if($(this).width() <= 767 ){
            $('.cabinet__left').css('min-height', 'auto');
        }
        else{
           var fh = $("main").height();
            $('.cabinet__left').css('min-height', fh + 'px'); 
        }
    })

    

    

    function setGreenRound(n){
        cabGreen.find(".cabGreen__item").removeClass("greenvisible");
        console.log(cabGreen.find(".cabGreen__item")[n].classList.add("greenvisible"));
    }


    refLink.on("click",function(e){
        e.preventDefault();
        var linkThis = $(this);
        new Clipboard('.refLink', {
          text: function() {
            return linkThis.text();
          }
        });
        alert('Link affiliate copied');
    });

    code__body.on("click",function(e){
        e.preventDefault();
        var linkThis = $(this);
        new Clipboard('.code__body', {
          text: function() {
            return linkThis.text();
          }
        });
        alert('Link affiliate copied');
    });
        

	curlangBlock.on("click",function(){
		$(this).find('.languagesList').slideToggle();
	});

	newLang.on("click",function(){
		var nIMG = $(this).find("img").attr('src');
		curlangBlock.find(currFlag).attr("src", nIMG);
		var newValue = $(this).find("a").html();
		currLangText.html(newValue);
	});

	currLangText.removeAttr("href").css("cursor","pointer");

	mobIcon.on("click",function(){
		mobMenu.slideToggle();
	});

    mobCabinetIcon.on("click",function(){
        cabinetMenu.slideToggle();
    });


    faqQuestion.on("click",function(){
        $(this).toggleClass("faqOpened");
        $(this).parent().find(".faqAnswer").slideToggle();
    });

	$('.fourItem__text').matchHeight();


	$('.worksTabs li a').on("mouseenter", function(e){
        if(!$(this).tab().parent().hasClass("active")){
            $('.tab-content').find(".active").removeClass("active"); 
            $(this).tab('show');
        }
	});

	$('.EarnSlider').owlCarousel({
	    loop:true,
	    margin:10,
	    responsiveClass:true,
	    responsive:{
	        0:{
	            items:1,
	        }
	    }
	});

    $('.viewHouse a').on('click', function(event) {
        event.preventDefault();
        
        var gallery = $(this).attr('href');
    
        $(gallery).magnificPopup({
      delegate: 'a',
            type:'image',
            gallery: {
                enabled: true
            }
        }).magnificPopup('open');
    });
    


	

});