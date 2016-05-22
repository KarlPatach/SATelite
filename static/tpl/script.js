$(function() {
        // When DOM is ready, select the container element and call the jQCloud method, passing the array of words as the first argument.
        $("#deploy").click(function() {
                $(".options").toggle();
                $("#deploy i").toggleClass("fa-angle-double-down fa-angle-double-up")
        })
        
        $("#tag").blur(function() {
                $("#form").attr( "action", "/analyse/" + $("#tag").first().val() );
        })
        
        $("#form").submit(function() {
                $("#form").attr( "action", "/analyse/" + $("#tag").first().val() );
        })
        
        $("#algo").change(function() {
                if($(this).val() == "basic") {
                        $("#basic").show();
                        $("#custom").hide();
                } else {
                        $("#custom").show();
                        $("#basic").hide();
                }
        })
});