
// update header github link
$(".header-button.github").attr("href", "https://github.com/Francois-Thierry/france-in-maps/tree/gh-pages")

////////////////////////////////////////////////////////////////////////////////
//                                                           Global Variables //
////////////////////////////////////////////////////////////////////////////////

// See also
// http://archive.oreilly.com/pub/a/server-administration/excerpts/even-faster-websites/writing-efficient-javascript.html

// var width = $(".column-12").width();
// var height = $("#map").height();
var width = 860;
var height = 640;
var viewport = [0, width, 0, height];
var viewportCulling = [0, width, 0, height];

var scale = 1;
var scales = [scale];
var translate = [0, 0];
var translates = [translate];
var currentDepartement = null;

var map = null;
var elements = {};
var elementsDisplayed = [];

var dataset = null;
var elements = [];
var zoomLevel = 0;
var selectedElement = "";
var selectedCode = "regions2015";

var regn = {"32":"Hauts-de-France", "44":"Grand-Est", "28":"Normandie", "53":"Bretagne", "52":"Pays de la Loire", "24":"Centre Val de Loire", "11":"Ile-de-France", "27":"Bourgogne Franche-Comté", "75":"Nouvelle Aquitaine", "84":"Auvergne Rhônes-Alpes", "76":"Occitanie", "93":"Provence-Alpes-Côte d'Azur", "94":"Corse"}

var canvas = d3.select('#map')
  .attr('width', width)
  .attr('height', height)

var container = $(canvas).parent();

var ctx = canvas.node().getContext("2d");
ctx.lineWidth = 0.5;
ctx.fillStyle = "white";

// Use either Lambert Conformal Conic or Orthographic for Europe
// (http://www.georeference.org/doc/guide_to_selecting_map_projections.htm)
// see also http://kartoweb.itc.nl/geometrics/map%20projections/mappro.html and http://xkcd.com/977/
var projection = d3.geoConicConformal()
  .scale(3600)
  .center([3.2, 46.4])
  .translate([width/2, height/2]);
    
var path = d3.geoPath()
  .projection(projection)
  .context(ctx)

var zoom = d3.zoom();

////////////////////////////////////////////////////////////////////////////////
//                                                                  Main Loop //
////////////////////////////////////////////////////////////////////////////////

// update satus
$(".status").html("<p>Downloading map</p>")

d3.json("topo.json", function(error, map) {
  if (error) throw error;

  zoom.on("zoom", zoomed);

  // prepare elements object
  elements = {"communes":[], "cantons":[], "departements":[], "regions":[],
                  "regions2015":[]};

  dataset = prepareData(map);

  console.time("merging");

  dataset.regions2015.each(function(geometry){
    newGeometry = topojson.mergeArcs(map, geometry);
    newGeometry["properties"] = {};
    newGeometry["properties"]["code_regn"] = geometry[0].properties.code_regn;
    elements.regions2015.push(newGeometry);
  })
  
  console.timeEnd("merging");

  elementsDisplayed = elements[selectedCode];

  // show map elements
  $(".map-element").css("display", "inline-flex")
  // update satus
  $(".status").html("")

  //Run function when browser resizes
  window.addEventListener('resize', resizeCanvas, false);

  function resizeCanvas(){
      width = $("canvas").parent().width();
      height = $("canvas").parent().height();
      viewport = [0, width, 0, height];
      canvas.attr('width',  width); //max width
      canvas.attr('height', height); //max height
      translate = [0, 0];
      scale = 1;
      ctx.fillStyle = "white";
      // ctx.lineWidth = 1;
      drawElements(map, elementsDisplayed);
  }

  resizeCanvas();

  canvas.on("click", function() {
    var mousePos = d3.mouse(this);
    clicked(mousePos, map);
  })

  canvas.on("dblclick", function() {
    var mousePos = d3.mouse(this);
    dblclicked(mousePos, map);
  })

  $(".row.plot h3").click(function(){
    $(".row.plot h3").removeClass("active");
    $(this).addClass("active");
    selectedCode = $(this).attr("id");
    if (elements[selectedCode].length == 0){
      console.time("merging");
      dataset[selectedCode].each(function(geometry){
        newGeometry = topojson.mergeArcs(map, geometry);
        newGeometry["properties"] = {};
        newGeometry.properties["insee"] = geometry[0].properties.insee;
        newGeometry.properties["code_cant"] = geometry[0].properties.code_cant;
        newGeometry.properties["code_dept"] = geometry[0].properties.code_dept;
        newGeometry.properties["code_reg"] = geometry[0].properties.code_reg;
        newGeometry.properties["code_regn"] = geometry[0].properties.code_regn;
        elements[selectedCode].push(newGeometry);
      })
      console.timeEnd("merging");
    }
    elementsDisplayed = filterElements(map, elements[selectedCode]);
    canvas.call(transition);
  })

  function zoomed() {
    var t = d3.event.transform;
    ctx.save();
    ctx.translate(t.x, t.y)
    ctx.scale(t.k, t.k);
    ctx.lineWidth = 0.5*1/t.k;
    drawElements(map, elementsDisplayed);
    ctx.restore();
  }

});

////////////////////////////////////////////////////////////////////////////////
//                                                    Click zoom with culling //
////////////////////////////////////////////////////////////////////////////////

function transform() {
  return d3.zoomIdentity
      .translate(translate[0], translate[1])
      .scale(scale)
}

function transition() {
  // transition to a new zoom
  canvas.transition()
    .duration(1000)
    .call(zoom.transform, transform)
}

function clicked(mousePos, map) {
  var clickX = viewport[0]+mousePos[0]/scale;
  var clickY = viewport[2]+mousePos[1]/scale;
  // find geometry that was clicked on - FASTER WITH QUADTREES ???
  for (var i = 0; i < elementsDisplayed.length; i++) {
    var element = elementsDisplayed[i];
    elementGeometry = topojson.feature(map, element)
    ctx.beginPath();
    path(elementGeometry);
    // if click in geometry
    if (ctx.isPointInPath(clickX, clickY) == true) {
      if (element != selectedElement) {
        // store the selected geometry
        selectedElement = element;
        // compute geometry bounding box
        var bounds = path.bounds(elementGeometry);
        var dx = bounds[1][0] - bounds[0][0];
        var dy = bounds[1][1] - bounds[0][1];
        var x = (bounds[0][0] + bounds[1][0]) / 2;
        var y = (bounds[0][1] + bounds[1][1]) / 2;
        // compute scale needed to display the bounding box
        scale = Math.max(1, Math.min(30, 0.9 / Math.max(dx / width, dy / height)));
        scales[zoomLevel] = scale;
        zoomLevel = 1;
        // compute translation needed to display the bounding box
        translate = [width / 2 - scale * x, height / 2 - scale * y];
        // update the viewport
        viewport = [-translate[0]/scale, width/scale,
                    -translate[1]/scale, height/scale];
        // filter elements (programmatic culling)
        elementsDisplayed = filterElements(map);
        // perform zoom transition
        canvas.call(transition);
        break;
      }
    }
    ctx.closePath();
  }
}

function dblclicked(mousePos, map) {
  // double click reset

  // zoomLevel -= 1;
  zoomLevel = 0;

  viewport = [0, width, 0, height];
  selectedElement = null;

  scale = 1;
  translate = [0, 0]

  ctx.lineWidth = 1;

  elementsDisplayed = elements[selectedCode];
  canvas.call(transition)
    // .on("end", drawElements(map, elements))

}


////////////////////////////////////////////////////////////////////////////////
//                                        Draw selected elements with culling //
////////////////////////////////////////////////////////////////////////////////

function filterElements(map) {
  // if (zoomLevel != 0) {  
    console.time("filtering");
    var newElements = [];
    // draw every object in viewport
    elements[selectedCode].forEach(function(element) {
      try {
        elementGeometry = topojson.feature(map, element)
        // extract bounding box of the geopath
        var bounds = path.bounds(elementGeometry);
        // viewport rectangle
          var rect1 = {"x":viewport[0], "y":viewport[2],
                       "width":viewport[1], "height":viewport[3]};
          // object rectangle
          var rect2 = {"x":bounds[0][0], "y":bounds[0][1],
                       "width":bounds[1][0]-bounds[0][0], "height":bounds[1][1]-bounds[0][1]};
        // collision test between viewport and object
        if (!(
            ((rect1.y + rect1.height) < (rect2.y)) ||
            (rect1.y > (rect2.y + rect2.height)) ||
            ((rect1.x + rect1.width) < rect2.x) ||
            (rect1.x > (rect2.x + rect2.width))
        )) {
          newElements.push(element);
        }
      } catch(err) {
      }
  })
  console.timeEnd("filtering");
  return newElements;
}

////////////////////////////////////////////////////////////////////////////////
//                                                       Draw to the viewport //
////////////////////////////////////////////////////////////////////////////////

function drawElements(map) {
  // console.time("drawing");
  // save current context with transform
  ctx.save();
  // Use the identity matrix while clearing the canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // clear the canvas
  ctx.clearRect(0, 0, width, height);
  // restore transforms on canvas
  ctx.restore();
  // draw every object in viewport
  elementsDisplayed.forEach(function(element) {
    var elementGeometry = topojson.feature(map, element)
    ctx.beginPath();
    path(elementGeometry);
    ctx.fill()
    ctx.stroke();
    ctx.closePath();
  })
  // highlight selected element
  if (selectedElement != null) {  
    var selectedGeometry = topojson.feature(map, selectedElement);
    ctx.save();
    ctx.lineWidth = 2*1/scale;
    ctx.beginPath();
    path(selectedGeometry);
    // ctx.fill()
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }
  // console.timeEnd("drawing");
}

////////////////////////////////////////////////////////////////////////////////
//                                                               Prepare data //
////////////////////////////////////////////////////////////////////////////////

function prepareData(map) {
  // select communes geometries
  var geometries = map.objects.geo.geometries;
  elements.communes = geometries;

  console.time("preparing data, method 2"); // !!! 2.5 SECONDES !!!

  // extract id of the different geographic scales
  var cantons = d3.set(geometries.map(function(d) {return d.properties.code_cant}));
  var departements = d3.set(geometries.map(function(d) {return d.properties.code_dept}));
  // var regions = d3.set(geometries.map(function(d) {return d.properties.code_reg}));
  var regions2015 = d3.set(geometries.map(function(d) {return d.properties.code_regn}));

  // iterate over the communes
  for (var i = 0; i < geometries.length; i++) {
    var commune = geometries[i];
    // get the corresponding geographic codes
    var insee = commune.properties.insee;
    var cant = commune.properties.code_cant;
    var dept = commune.properties.code_dept;
    // var reg = commune.properties.code_reg;
    var regn = commune.properties.code_regn;
    // add it to the cantons
    if (typeof cantons["$"+cant] == "string") {
      cantons["$"+cant] = [commune];
    } else {
      cantons["$"+cant].push(commune);
    }
    // add it to the departements
    if (typeof departements["$"+dept] == "string") {
      departements["$"+dept] = [commune];
    } else {
      departements["$"+dept].push(commune);
    }
    // // add it to the regions
    // if (typeof regions["$"+reg] == "string") {
    //   regions["$"+reg] = [commune];
    // } else {
    //   regions["$"+reg].push(commune);
    // }
    // add it to the regions after 2015
    if (typeof regions2015["$"+regn] == "string") {
      regions2015["$"+regn] = [commune];
    } else {
      regions2015["$"+regn].push(commune);
    }
  }

  console.timeEnd("preparing data, method 2");

  // return elements;
  return {"communes":communes, "cantons":cantons, "departements":departements,
          // "regions":regions,
          "regions2015":regions2015};
}
