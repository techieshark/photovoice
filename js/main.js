/*jslint browser: true*/
/*global $, jQuery*/
/*jslint indent: 2*/
"use strict";

// pull letter from database and update offscreen content
function setLetter(data) {
  // convert description to html
  var lines = data.rows[0].description_en.split('\n\n'),
    html = lines.map(function (line) { return '<p>' + line + '</p>'; }).join('\n');

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
          intro.height() +
          parseFloat(intro.css('padding-top')) +
          parseFloat(intro.css('padding-bottom'))
         );
}

// from http://css-tricks.com/snippets/javascript/get-url-variables/
function getQueryVariable(variable) {
  var query = window.location.search.substring(1),
    vars = query.split("&"),
    i, pair;
  for (i=0;i<vars.length;i++) {
    pair = vars[i].split("=");
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
    console.log("popstate!");
    if (event.state && event.state.story_id) { // if provided a state, we can return to that state's story
      console.log('popstate fired; loading story ' + event.state.story_id);
      loadStory(event.state.story_id);
    }
    else { // even without a state, we may have a story in the url; if so, load it.
      var id_from_url = getQueryVariable('photo');
      if (id_from_url) {
        loadStory(id_from_url);
      }
    }

    // enable swiping for more content
    // var element = $('#letter .is-onscreen .text').get(0);
    var element = $('body').get(0);
    var hammertime = new Hammer(element, { prevent_default: true,})
      .on("swipeleft", function(event) {
        var story = nextStoryID();
        console.log('advancing to next story: ' + story);
        loadStory(story);
      }).on("swiperight", function(event) {
        var story = prevStoryID();
        console.log('reversing to story: ' + story);
        loadStory(story);
      });

  });

  // clicking page title toggles intro text
  var header = $('header');
  $('header h1 a').click(function(e) {
      // if collapsed, expand
      if (parseInt(header.css('margin-top')) < 0) {
        header.css('margin-top', 0).removeClass('is-collapsed');
      } else {
      // was expanded; collapse
        header.css('margin-top', 0 - headerBoxHeight()).addClass('is-collapsed');
      }
      adjust_heights();
      e.preventDefault();
    });

  // update module sizes on page load
  adjust_heights();

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

function visibleHeaderSize() {
    var header = $('header');
    if (header.hasClass('is-collapsed')) {
      return 0 + $('h1', header).outerHeight();
    } else { // expanded
      return header.outerHeight();
    }
}

var smallest_breakpoint = 800;

function isNarrow() {
  return $(window).width() < smallest_breakpoint;
}

function adjust_heights() {

  // mobile size gets different layout without dynamic height.
  if (isNarrow()) {
    $('#letter').css('height', 'auto');
    return;
  }

  // Update map size
  var photo_height = $('#photo').height();
  //var photo_height = $('#photo img.is-onscreen').height();
  if (!photo_height) return; // don't adjust size if image isn't loaded
  var remainder = $(window).height() - photo_height;
  //$('#photo').height(photo_height); // resize container according to child img
  $('#map').css('height', remainder + 'px');
  console.log("#map height set to " + $('#map').height());

  // Update #letter height.
  $('#letter').height($(window).height() - visibleHeaderSize());
}

// call with value to set, without to get
function lastStoryID(value) {
  if (typeof value === 'undefined') { // get
    if (typeof lastStoryID.id === 'undefined') {
      return -1; // can't do anything until value pulled from SQL
    }
  } else { // set
    lastStoryID.id = value;
  }
  return lastStoryID.id;
}

function firstStoryID(value) {
  if (typeof value === 'undefined') { // get
    if (typeof firstStoryID.id === "undefined") {
      return -1;
    }
  } else { // set
    firstStoryID.id = value;
  }

  return firstStoryID.id;
}

var currentStoryID;

// return ID of story following the currently shown story
// when we get to the end, loop back to the beginning
function nextStoryID() {
  if (typeof currentStoryID === 'undefined' || currentStoryID+1 > lastStoryID()) {
    return firstStoryID();
  } else {
    return currentStoryID + 1;
  }
}

// return ID of story preceding the currently shown story
// when we get to the beginning, loop back to the end
function prevStoryID() {
  if (typeof currentStoryID === 'undefined' || currentStoryID < firstStoryID()) {
    return lastStoryID();
  } else {
    return currentStoryID - 1;
  }
}



var sql = new cartodb.SQL({ user: 'techieshark' });

sql.execute("SELECT MIN(cartodb_id) FROM photovoice").done(function(data) {
  firstStoryID(data.rows[0].min);
});
sql.execute("SELECT MAX(cartodb_id) FROM photovoice").done(function(data) {
  lastStoryID(data.rows[0].max);
});

var myvis, mylayers;

cartodb.createVis('map', 'http://techieshark.cartodb.com/api/v2/viz/519b0a24-f1a0-11e2-b27e-dbfe355cb68f/viz.json', {
    shareable: false,
    title: false,
    description: false,
    search: false,
    tiles_loader: true,
    center_lat: 45.519820,
    center_lon: -123.022499,
    zoom: 11,
    infowindow: true,
  })
  .done(function(vis, layers) {

    myvis = vis;
    mylayers = layers;

     // preload images
    sql.execute("SELECT img FROM photovoice").done(function(data) {
      var preloader = $('#preloader');
      data.rows.forEach(function(row) {
        if (row['img'] != '') {
          preloader.append($('<img src="' + row['img'] + '"/>'));
        }
      });
    });

    // get sublayer 0 and set the infowindow template
    var sublayer = layers[1].getSubLayer(0);
    sublayer.infowindow.set('template', $('#infowindow_template').html());

    sublayer.on('featureClick', function(e, latlng, pos, data, subLayerIndex) {
      // console.log("mouse over polygon with data: " + data);
      console.log("mouse clicked cartodb_id: " + data.cartodb_id);

      // load new story, unless it is the same story as current story
      if ( !currentStoryID /* null on first page load for FireFox */ ||
            ((typeof currentStoryID === 'number') && currentStoryID != data.cartodb_id)
         ) {
        console.log("loading story " + data.cartodb_id);
        //set new history state so we can come back to this item later. (TODO: test on IE < 10)
        var state = { story_id: data.cartodb_id };
        history.pushState(state, "", "?photo=" + state.story_id);

        loadStory(data.cartodb_id);
      } else {
        console.log("not loading story " + data.cartodb_id);
      }

    });

    sublayer.on('error', function(err) {
        //cartodb.log.log('error: ' + err);
        console.log('error' + err);
    });
  })
  .on('error', function() {
        //cartodb.log.log("some error occurred");
        console.log('some error occurred');
  });

var myStory;

function loadStory(story_id) {
      // save current story id, always as number
      currentStoryID = parseInt(story_id);

      // TODO - cartodb api: pull up push pin for specified id (for the case
      // that it is being loaded from browser history, swipe navigation, etc).

      // hide page intro text
      $('header').css('margin-top', 0 - headerBoxHeight()).addClass('is-collapsed').delay(500);
      adjust_heights();

      sql.execute("SELECT ST_AsText(the_geom), * FROM photovoice WHERE cartodb_id = {{id}}", { id: story_id })
        .done(function(data) { // location_description, img
          console.log(data.rows[0]);

          myStory = data.rows[0];
          var slideTime = 750;

          // set image
          // $('#photo img').attr('src', data.rows[0].img);

          // set image caption
          var caption = data.rows[0].location_description;
          var last_caption = $('#photo .caption .is-onscreen').animate({'margin-left':'-33em'}, 500).hide().removeClass('is-onscreen');
          $('#photo .caption .is-offscreen').text(caption).css('margin-left', '1000px').show()
            .animate({'margin-left':0}, slideTime).addClass('is-onscreen').removeClass('is-offscreen');
          last_caption.addClass('is-offscreen');


         setLetter(data);

        // ... and once letter slides in, we'll animate photo.
        /* Note: z-index order used to keep select content above other content:
        * 0 - text sliding in (keep under photo)
        * 1 - photo
        * 2 - new photo in transition (keep above old photo)
        * 3 - caption (keep above new photo), set in CSS */
        var last_photo = $('#photo img.is-onscreen');
        $('#photo img.is-offscreen').css('z-index', 2).css('left', '1000px')
          .css('position', 'absolute').addClass('is-onscreen').removeClass('is-offscreen')
          .attr('src', data.rows[0].img)
          .animate(
            {'left':0},
            { duration: slideTime,
              complete: function () {
                // after we've animated the image in, we 1) hide the previous image,
                // 2) switch back to relative positioning to take up the proper space, and
                // 3) lower the z-index since we're not trying to cover the old image
                last_photo.removeClass('is-onscreen').addClass('is-offscreen');
                $(this).css('position','relative').css('z-index', 1);
              }
            });


        // animate letter
        var last_letter = $('#letter .is-onscreen'),
            letter_width = $('#letter').width(),
            new_height = $('#letter .is-offscreen').css('width', letter_width).css('height');

        /* once last_letter is positioned absolutely, it'll be removed from
         * document flow and its container would have zero height, so instead we
         * set height to be the height of the new letter so you'll see new letter sliding in */
        $('#letter').css('height', new_height);

        last_letter.css('width', letter_width)
                   .css('position', 'absolute')
                   .animate(
                      {'left': '' + (-100-letter_width) + 'px'},
                      { duration: slideTime - 200,
                        complete: function() {
                          $(this).hide().removeClass('is-onscreen');
                        }
                      });

        $('#letter .is-offscreen').css('width', letter_width)
          .css('position','relative')
          .css('float', 'left') // pull out of doc flow so we don't push previous letter down the page
          .css('left', '1300px').show() // TODO 1300PX -> window width + 300px (dynamic)
          .animate(
            {'left':0},
            { duration: slideTime + (isNarrow() ? 0 : 750), // in wide windows, text slides in after photo
              complete: function() {
                 // width is fixed during animation to prevent scrollbar from appearing mid-animation,
                // but needs to be set back to auto after complete so it will update if user adjusts page
                // size later.
                $(this).css('width', 'auto').css('float', 'none').css('position', 'static').css('float', 'none');

                $('#letter').toggleClass('paused');

                // Ensure that height is set to 'auto' while transitions are paused
                // (this prevents an unwanted vertical bounce of the map below the letter).
                window.setTimeout(function() {
                  $('#letter').css('height', 'auto'); // so it sets height based on contents
                  window.setTimeout(function() {
                    $('#letter').toggleClass('paused');
                  }, 1)
                }, 1);
              }
            }).addClass('is-onscreen').removeClass('is-offscreen');
        last_letter.addClass('is-offscreen');




        })
        .error(function(errors) {
          // errors contains a list of errors
          console.log("error:" + errors);
        });
}
