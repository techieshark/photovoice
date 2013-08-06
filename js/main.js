
// pull letter from database and update offscreen content
function setLetter(data) {
  // convert description to html
  var lines = data.rows[0].description_en.split('\n\n');
  var paras = [];
  for (var i = 0; i < lines.length; i++) {
    paras[i] = "<p>" + lines[i] + "</p>";
  }
  html = paras.join('\n');
  $('#letter .is-offscreen .text').html(html);

  //set signature
  $('#letter .is-offscreen .signature').text(data.rows[0].signature);

  //set address
  $('#letter .is-offscreen .addr').text(data.rows[0].location);
}

function headerBoxHeight() {
  var intro = $('#intro');
  // Ugh. Must be a cleaner way to accomplish the collapsing effect...
  return (
          intro.height()
          + parseFloat(intro.css('padding-top'))
          + parseFloat(intro.css('padding-bottom'))
         );
}

// from http://css-tricks.com/snippets/javascript/get-url-variables/
function getQueryVariable(variable)
{
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
    var pair = vars[i].split("=");
    if(pair[0] == variable){return pair[1];}
  }
  return(false);
}

$(document).ready(function() {
  // Handler for .ready() called.

  // Revert to a previously saved state
  // TODO: test on IE
  window.addEventListener('popstate', function(event) {
    // popstate event occurs on page load but we may or may not have a state to work with.
    if (event.state && event.state.story_id) { // if provided a state, we can return to that state's story
      console.log('popstate fired; loading story ' + event.state.story_id);
      loadStory(event.state.story_id);
    }
    else { // even without a state, we may have a story in the url; if so, load it.
      id_from_url = getQueryVariable('photo');
      if (id_from_url) {
        loadStory(id_from_url);
      }
    }
  });

  adjust_heights();

  // clicking page title toggles intro text
  var header = $('header');
  $('header h1 a').click(function() {
      // if collapsed, expand
      if (parseInt(header.css('margin-top')) < 0) {
        header.css('margin-top', 0).removeClass('is-collapsed');
      } else {
      // was expanded; collapse
        header.css('margin-top', 0 - headerBoxHeight()).addClass('is-collapsed');
      }
    });


  // update module sizes on window resize
  $(window).on('resize', function (e) {
    // console.log('resized...');

    // update collapsed header
    // if collapsed, adjust collapsed size
    var header = $('header');
    if (header.hasClass('is-collapsed')) {
        header.css('margin-top', 0 - headerBoxHeight());
        // console.log('set header margin to: ' +  -headerBoxHeight());
    }
    // if expanded, do nothing.

    adjust_heights();
  });

});

function adjust_heights() {
  // Update map size
  var photo_height = $('#photo').height();
  //var photo_height = $('#photo img.is-onscreen').height();
  if (!photo_height) return; // don't adjust size if image isn't loaded
  var remainder = $(window).height() - photo_height;
  //$('#photo').height(photo_height); // resize container according to child img
  $('#map').css('height', remainder + 'px');
  console.log("#map height set to " + $('#map').height());
}

var sql = new cartodb.SQL({ user: 'techieshark' });

cartodb.createVis('map', 'http://techieshark.cartodb.com/api/v2/viz/519b0a24-f1a0-11e2-b27e-dbfe355cb68f/viz.json', {
    shareable: false,
    title: false,
    description: false,
    search: false,
    tiles_loader: true,
    center_lat: 45.519820,
    center_lon: -123.022499,
    zoom: 11,
    infowindow: false
  })
  .done(function(vis, layers) {

     // preload images
    sql.execute("SELECT img FROM photovoice").done(function(data) {
      preloader = $('#preloader');
      data.rows.forEach(function(row) {
        if (row['img'] != '') {
          preloader.append($('<img src="' + row['img'] + '"/>'));
        }
      });
    });

    // get sublayer 0 and set the infowindow template
    var sublayer = layers[1].getSubLayer(0);
    sublayer.infowindow.set('template', $('#infowindow_template').html());

    layers[1].on('featureClick', function(e, latlng, pos, data, subLayerIndex) {
      // console.log("mouse over polygon with data: " + data);
      // console.log("mouse over cartodb_id: " + data.cartodb_id);

      //set new history state so we can come back to this item later. (TODO: test on IE < 10)
      var state = { story_id: data.cartodb_id };
      history.pushState(state, "", "?photo=" + state.story_id);

      loadStory(data.cartodb_id);
    });
  });

function loadStory(story_id) {
      // hide page intro text
      $('header').css('margin-top', 0 - headerBoxHeight()).addClass('is-collapsed').delay(500);

      sql.execute("SELECT * FROM photovoice WHERE cartodb_id = {{id}}", { id: story_id })
        .done(function(data) {
          console.log(data.rows[0]);
          // set image
          // $('#photo img').attr('src', data.rows[0].img);

          // set image caption
          var caption = data.rows[0].location_description;
          var last_caption = $('#photo .caption .is-onscreen').animate({'margin-left':'-33em'}, 500).hide().removeClass('is-onscreen');
          $('#photo .caption .is-offscreen').text(caption).css('margin-left', '1000px').show()
            .animate({'margin-left':0}, 500).addClass('is-onscreen').removeClass('is-offscreen');
          last_caption.addClass('is-offscreen');


         setLetter(data);

        // animate letter
        var last_letter = $('#letter .is-onscreen');
        last_letter.animate({'margin-left':'-33em'},500).hide().removeClass('is-onscreen');
        $('#letter .is-offscreen').css('width', $('#letter').width()).css('position','absolute')
          .css('margin-left', '1000px').show()
          .animate(
            {'margin-left':0},
            { duration: 500,
              complete: function() {
                 // width is fixed during animation to prevent scrollbar from appearing mid-animation,
                // but needs to be set back to auto after complete so it will update if user adjusts page
                // size later.
                $(this).css('width', 'auto').css('position', 'static');
              }
            }).addClass('is-onscreen').removeClass('is-offscreen');
        last_letter.addClass('is-offscreen');


        // and once letter slides in, we'll animate photo
        last_photo = $('#photo img.is-onscreen');
        $('#photo img.is-offscreen').css('z-index', 1).css('margin-left', '1000px')
          .addClass('is-onscreen').removeClass('is-offscreen').attr('src', data.rows[0].img)
          .animate(
            {'margin-left':0},
            { duration: 500,
              complete: function () {
                last_photo.removeClass('is-onscreen').addClass('is-offscreen');
                $(this).css('z-index', 0);
              }
            });

          // var active = $('#photo span.is-onscreen');
          //Slider Animation
          // $('#photo span.is-offscreen').css('margin-left', '1000em').show()
          // .animate(
          //   { 'margin-left': 0 },
          //   {
          //    duration: 'slow',
          //    easing: 'easeOutBounce'
          //   });

           // .animate(
           //  { left: 0 }, {
           //   duration: 'slow',
           //   easing: 'easeOutBounce'
           //  });

          // $('#photo .caption span');
          // $('#photo .caption').text(data.rows[0].location_description);


        })
        .error(function(errors) {
          // errors contains a list of errors
          console.log("error:" + errors);
        });
}


