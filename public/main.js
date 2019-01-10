$(function() {

  //tries to log the user in
  $('#loginform').on('submit', function(e) {
    console.log("lel");
    let m = $('#username').val();
    sessionStorage.setItem('username', m);
  });

});
