/*

Template: COINEX - Crypto Currency HTML Template
Author: iqonicthemes.in
Version: 1.0
Design and Developed by: iqonicthemes.in

*/

jQuery(document).ready(function($) {

    /*************************
                Right sidebar
        *************************/
    style_switcher = $('.iq-customizer'),
        panelWidth = style_switcher.outerWidth(true);
    $('.iq-customizer .opener').on("click", function() {
        var $this = $(this);
        if ($(".iq-customizer.closed").length > 0) {
            style_switcher.animate({
                "right": "0px"
            });
            $(".iq-customizer.closed").removeClass("closed");
            $(".iq-customizer").addClass("opened");
        } else {
            $(".iq-customizer.opened").removeClass("opened");
            $(".iq-customizer").addClass("closed");
            style_switcher.animate({
                "right": '-' + panelWidth
            });
        }
        return false;
    });

    /*************************
             style change 
        *************************/
    var link = $('link[data-style="styles"]'),
        link_no_cookie = $('link[data-style="styles-no-cookie"]');

    /*************************
             Color Changer
        *************************/
    $('.iq-customizer .iq-colorChange li').on('click', function() {
        if (link.length > 0) {
            var $this = $(this),
                tp_stylesheet = $this.data('style');
            $(".iq-customizer .iq-colorChange .selected").removeClass("selected");
            $this.addClass("selected");
            link.attr('href', 'css/color/' + tp_stylesheet + '.css');
            if ($(".swicher-logo").length > 0) {
                document.getElementById("logo_img").src = "images/color-customizer/logo" + tp_stylesheet + ".png";
            } else {
                if ($("#logo_img").length > 0) {
                    document.getElementById("logo_img").src = "images/color-customizer/" + tp_stylesheet + ".png";
                };
            };
            if ($(".swicher-logo-dark").length > 0) {
                document.getElementById("logo_dark_2").src = "images/color-customizer-dark/logo_dark" + tp_stylesheet + ".png";
            } else {
                if ($("#logo_dark").length > 0) {
                    document.getElementById("logo_dark").src = "images/color-customizer-dark/" + tp_stylesheet + ".png";
                };
            };
            if ($(".swicher-logo_2").length > 0) {
                document.getElementById("logo_img_2").src = "images/color-customizer/logo" + tp_stylesheet + ".png";
            } else {
                if ($("#logo_img_2").length > 0) {
                    document.getElementById("logo_img_2").src = "images/color-customizer/" + tp_stylesheet + ".png";
                };
            };
            if ($(".swicher-logo-dark_2").length > 0) {
                document.getElementById("logo_dark_2").src = "images/color-customizer-dark/logo_dark" + tp_stylesheet + ".png";
            } else {
                if ($("#logo_dark_2").length > 0) {
                    document.getElementById("logo_dark_2").src = "images/color-customizer-dark/" + tp_stylesheet + ".png";
                };
            };
            $.cookie('tp_stylesheet', tp_stylesheet, 30);
            updatechart($($(this)).index('.iq-customizer .iq-colorChange li'));
        }
    });
});