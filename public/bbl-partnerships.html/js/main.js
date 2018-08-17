/*=========================================

Template Name: Aspire - App Landing Page 
Author: Theme_Choices
Version: 1.0
Design and Developed by: Theme_Choices

=========================================*/

(function($) {
    "use strict";
			
    var $window = $(window),
            $body = $('body');
			
	/*=============================
                Sticky header
        ==============================*/
        $('.navbar-collapse a').on('click',function(){
          $(".navbar-collapse").collapse('hide');
        });
        $window.on('scroll', function() {
          if ($(".navbar-nav").offset().top > 100) {
            $(".fixed-top").addClass("top-nav-collapse");
              } else {
                $(".fixed-top").removeClass("top-nav-collapse");
              }
        });
		
		     /*=============================
                Smoothscroll js
        ==============================*/
          $('.navbar-nav a, a.page-scroll, a.header-btn').on('click', function(event) {
            var $anchor = $(this);
            $('html, body').stop().animate({
                scrollTop: $($anchor.attr('href')).offset().top - 70
            }, 1000);
            event.preventDefault();
          });
	
    /*======================================
        jquery scroll spy
    ========================================*/
        $body.scrollspy({
            target : ".navbar-collapse",
            offset : 95 
        });
        
     /*=================================
            Bootstrap menu fix
     ==================================*/
        $(".navbar-toggler").on("click", function(){
            $body.addClass("mobile-menu-activated");
        });
        $("ul.navbar-nav li a").on("click", function(){
            $(".navbar-collapse").removeClass("in");
        });
	
	   /*=============================
                PRELOADER JS
        ==============================*/
		$(window).on('load', function () {
			$("#preloader-load").delay(200).fadeOut();
		});
			
    /*=========================================
                jQuery Video MixItUp
    =======================================*/  
	
	    $('.video-play').each(function () {
        $(this).magnificPopup({
            type: 'iframe'
        });

        $.extend(true, $.magnificPopup.defaults, {
            iframe: {
                patterns: {
                    youtube: {
                        index: 'youtube.com/',
                        id: 'v=',
                        src: 'http://www.youtube.com/embed/%id%?autoplay=1'
                    }
                }
            }
        });
    });

    /*==========================
            Back To Top
    ============================*/
	$(".scrollup").hide();
		$(window).scroll(function () {
			if ($(this).scrollTop() > 400) {
				$('.scrollup').fadeIn();
			} else {
				$('.scrollup').fadeOut();
			}
		});
		$('.scrollup').on('click', function () {
			$('body,html').animate({
				scrollTop: 0
			}, 800);
			return false;
		});
	
    /*=============================
            WOW js
    ==============================*/
        new WOW({ mobile: false }).init();
		
     /*===================================
            owl carousel testimonials
     ====================================*/
    $(".testimonial-list").owlCarousel({
        loop:true,
        margin:30,
        nav:false,
        dots:true,
        autoplay:true,
        autoplayHoverPause:true,
        responsive:{
            0:{
                items:1
            },
            600:{
                items:1
            },
            1000:{
                items:1
            }
        }
    });
	
	/*===================================
           Screenshot carousel List
     ====================================*/
    $(".screenshot-list").owlCarousel({
        loop:true,
		center: true,
        margin:30,
        nav:true,
        dots:false,
        autoplay:false,
        autoplayHoverPause:true,
        navText:["<i class=\'fa fa-angle-left\'></i>", "<i class=\'fa fa-angle-right\'></i>"],
		 responsive:{
            0:{
                items:1
            },
            600:{
                items:3
            },
            1000:{
                items:3
            }
        }   
	});
		       
})(jQuery);