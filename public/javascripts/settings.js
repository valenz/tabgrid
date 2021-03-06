$(document).ready(function () {
  'use strict';

  /** Generates e-mail address in menu */
  $('.email').hover(function () {
    var user = $(this).attr('data-user');
    var domain = $(this).attr('data-domain');
    var link = 'mailto:' + user + String.fromCharCode(64) + domain;
    $(this).attr('href', link);
    $(this).on('click', function () {
      $(this).attr('href', link);
    });
  },

  function () {
    $(this).removeAttr('href');
  });

  // Autofocus search input field after timeout
  $('.dropdown').on('click', function () {
    setTimeout(function () {
      $('#vsearch').focus();
    }, 100);
  });

  $('[id$=search]').keyup(function () {
    $(this).next().toggle(Boolean($(this).val()));
  });

  $('.sclear').toggle(Boolean($('[id$=search]').val()));

  $('.sclear').on('click', function () {
    $(this).prev().val('').focus();
    $(this).hide();
  });

  /** Sets input range */
  setRange($('.adj').find('[type=range]'));
  $('.adj').find('[type=range]').mousemove(function () {
    $('.adj').find('#rangeFac').text($(this).val());
  });

  $('.adj').find('[type=range]').change(function () {
    $('.adj').find('#rangeFac').text($(this).val());
    localStorage.setItem($(this).attr('type'), $(this).val());
  });

  /** Resets the adjustments */
  $('#adjReset').on('click', function () {
    if (confirm('You are going to reset your settings to default. \nAre you sure with that?')) {
      localStorage.removeItem($('.adj').find('[type=range]').attr('type'));
      setRange($('.adj').find('[type=range]'));
    }
  });

  // activate sidebar
  $('.sidenav').affix();

  // activate scrollspy menu
  var $body   = $(document.body);
  var navHeight = $('.navbar').outerHeight(true) + 10;

  $body.scrollspy({
    target: 'nav',
    offset: navHeight,
  });

  // smooth scrolling chapters and anchors
  $('a[href*=#]:not([href^=#collapse])').click(function () {
    if (location.pathname.replace(/^\//, '') ===
     this.pathname.replace(/^\//, '') && location.hostname === this.hostname) {
      var $target = $(this.hash);
      $target = $target.length ? $target : $('[name=' + this.hash.slice(1) + ']');
      if ($target.length) {
        $('html,body').animate({
          scrollTop: $target.offset().top - 60,
        }, 1000);
        return false;
      }
    }
  });
});

/** Sets range value */
function setRange(r) {
  'use strict';
  if (localStorage.getItem(r.attr('type'))) {
    r.val(localStorage.getItem(r.attr('type')));
    $('.adj').find('#rangeFac').text(r.val());
  } else {
    r.val(1);
    $('.adj').find('#rangeFac').text('1');
  }
}
