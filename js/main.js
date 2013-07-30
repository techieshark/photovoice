var sql = new cartodb.SQL({ user: 'techieshark' });

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

    // get sublayer 0 and set the infowindow template
    var sublayer = layers[1].getSubLayer(0);
    sublayer.infowindow.set('template', $('#infowindow_template').html());

    layers[1].on('featureClick', function(e, latlng, pos, data, subLayerIndex) {
      // console.log("mouse over polygon with data: " + data);
      // console.log("mouse over cartodb_id: " + data.cartodb_id);

      sql.execute("SELECT * FROM photovoice WHERE cartodb_id = {{id}}", { id: data.cartodb_id })
        .done(function(data) {
          console.log(data.rows[0]);
          // set image
          // $('#photo img').attr('src', data.rows[0].img);

          // set image caption
          var caption = data.rows[0].location_description;
          var was_onscreen = $('#photo .caption .is-onscreen').animate({'margin-left':'-33em'}, 500).hide().removeClass('is-onscreen');
          $('#photo .caption .is-offscreen').text(caption).css('margin-left', '1000px').show()
            .animate(
              {'margin-left':0},
              { duration: 500,
                complete: function() {
                  setLetter(data);

                  // animate letter
                  var last_letter = $('#letter .is-onscreen');
                  last_letter.animate({'margin-left':'-33em'},500).hide().removeClass('is-onscreen');

                  $('#letter .is-offscreen').css('width', $('#letter').width()).css('position','absolute')
                    .css('margin-left', '1000px').show().animate(
                        {'margin-left':0},
                        { duration: 500,
                          complete: function() {
                            // width is fixed during animation to prevent scrollbar from appearing mid-animation,
                            // but needs to be set back to auto after complete so it will update if user adjusts page
                            // size later.
                            $(this).css('width', 'auto').css('position', 'static');

                            // and once letter slides in, we'll animate photo
                            last_photo = $('#photo img.is-onscreen').css('z-index', -1);
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
                          },
                        })
                    .addClass('is-onscreen').removeClass('is-offscreen');
                  last_letter.addClass('is-offscreen');
                }
              })
            .addClass('is-onscreen').removeClass('is-offscreen');
          was_onscreen.addClass('is-offscreen');

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
        })
      });
  });
