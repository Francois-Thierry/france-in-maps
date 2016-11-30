// See also
// http://archive.oreilly.com/pub/a/server-administration/excerpts/even-faster-websites/writing-efficient-javascript.html

var width = 860;
var height = 640;
var viewport = [0, width, 0, height];

var elements = [];
var zoomLevel = 0;
var selectedElement = "";
var selectedCode = "regions2015";

var regn = {"32":"Hauts-de-France", "44":"Grand-Est", "28":"Normandie", "53":"Bretagne", "52":"Pays de la Loire", "24":"Centre Val de Loire", "11":"Ile-de-France", "27":"Bourgogne Franche-Comté", "75":"Nouvelle Aquitaine", "84":"Auvergne Rhônes-Alpes", "76":"Occitanie", "93":"Provence-Alpes-Côte d'Azur", "94":"Corse"}

var canvas = d3.select('#map')
  .attr('width', width)
  .attr('height', height)

var ctx = canvas.node().getContext("2d");
ctx.lineWidth = "0.5";
ctx.fillStyle = "white"

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

////////////////////////////////////////////////////////////////////////////////
//                                                                  Main Loop //
////////////////////////////////////////////////////////////////////////////////

d3.json("topo.json", function(error, map) {
  if (error) throw error;

  dataset = prepareData(map);
  drawElements(map, dataset[selectedCode]);

  canvas.on("click", function() {
    var mousePos = d3.mouse(this);
    clicked(mousePos, map, dataset[selectedCode]);
  })

  canvas.on("dblclick", function() {
    var mousePos = d3.mouse(this);
    dblclicked(mousePos, map, dataset[selectedCode]);
  })

  $(".row.plot h3").click(function(){
    $(".row.plot h3").removeClass("active");
    $(this).addClass("active");
    selectedCode = $(this).attr("id");
    drawElements(map, dataset[selectedCode]);
  })
  
  // var zoom = d3.zoom()
  //   .scaleExtent([2/3, 2])
  //   .on("zoom", zoomed);

  // canvas.call(zoom);

  // function zoomed() {
  //   ctx.lineWidth = 1.5 / d3.event.scale;
  //   ctx.translate(d3.event.transform.x, d3.event.transform.y);
  //   ctx.scale(d3.event.transform.k, d3.event.transform.k);
  //   drawMap(elements);
  // }

});

////////////////////////////////////////////////////////////////////////////////
//                                                               Prepare data //
////////////////////////////////////////////////////////////////////////////////

function prepareData(map) {
  // prepare elements object
  var elements = {"communes":[], "cantons":[], "departements":[], "regions":[],
                  "regions2015":[]};
  // select communes geometries
  var communes = map.objects.geo.geometries;
  elements.communes = communes;

  console.time("preparing data, method 2"); // !!! 2.5 SECONDES !!!

  // extract id of the different geographic scales
  var cantons = d3.set(communes.map(function(d) {return d.properties.code_cant}));
  var departements = d3.set(communes.map(function(d) {return d.properties.code_dept}));
  var regions = d3.set(communes.map(function(d) {return d.properties.code_reg}));
  var regions2015 = d3.set(communes.map(function(d) {return d.properties.code_regn}));

  // iterate over the communes
  for (var i = 0; i < communes.length; i++) {
    var commune = communes[i];
    // get the corresponding geographic codes
    var cant = commune.properties.code_cant;
    var dept = commune.properties.code_dept;
    var reg = commune.properties.code_reg;
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
    // add it to the regions
    if (typeof regions["$"+reg] == "string") {
      regions["$"+reg] = [commune];
    } else {
      regions["$"+reg].push(commune);
    }
    // add it to the regions after 2015
    if (typeof regions2015["$"+regn] == "string") {
      regions2015["$"+regn] = [commune];
    } else {
      regions2015["$"+regn].push(commune);
    }
  }
  
  // merge the geometries

  console.time("merging");

  cantons.each(function(geometry){
    elements.cantons.push(topojson.mergeArcs(map, geometry));
  })
  departements.each(function(geometry){
    elements.departements.push(topojson.mergeArcs(map, geometry));
  })
  regions.each(function(geometry){
    elements.regions.push(topojson.mergeArcs(map, geometry));
  })
  regions2015.each(function(geometry){
    elements.regions2015.push(topojson.mergeArcs(map, geometry));
  })
  
  console.timeEnd("merging");

  console.timeEnd("preparing data, method 2");

  return elements;
}

////////////////////////////////////////////////////////////////////////////////
//                                        Draw selected elements with culling //
////////////////////////////////////////////////////////////////////////////////

function drawElements(map, elements) {
  console.time("drawing");
  // save current context with transform
  ctx.save();
  // Use the identity matrix while clearing the canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // clear the canvas
  ctx.clearRect(0, 0, width, height);
  // restore transforms on canvas
  ctx.restore();
  // draw every object in viewport
  elements.forEach(function(element) {
    elementGeometry = topojson.feature(map, element)
    // extract bounding box of the geopath
    var bounds = path.bounds(elementGeometry);
    // viewport rectangle
    rect1 = {"x":viewport[0], "y":viewport[2], "width":viewport[1], "height":viewport[3]};
    // object rectangle
    rect2 = {"x":bounds[0][0], "y":bounds[0][1], "width":bounds[1][0]-bounds[0][0], "height":bounds[1][1]-bounds[0][1]};
    // collision test between viewport and object
    if (!(
        ((rect1.y + rect1.height) < (rect2.y)) ||
        (rect1.y > (rect2.y + rect2.height)) ||
        ((rect1.x + rect1.width) < rect2.x) ||
        (rect1.x > (rect2.x + rect2.width))
    )) {
      // geopath in viewport - draw it
      ctx.beginPath();
      path(elementGeometry);
      // highlight selected with red
      if (element == selectedElement) {
        ctx.fillStyle = "red";
      } else {
        ctx.fillStyle = "white";
      }
      ctx.fill()
      ctx.stroke();
      ctx.closePath();
    }
  })
  console.timeEnd("drawing");
}

////////////////////////////////////////////////////////////////////////////////
//                                                    Click zoom with culling //
////////////////////////////////////////////////////////////////////////////////

function clicked(mousePos, map, elements) {
  // if (zoomLevel == 0) {
    elements.forEach(function(element) {
      elementGeometry = topojson.feature(map, element)
      ctx.beginPath();
      path(elementGeometry);
      ctx.closePath();
      if (ctx.isPointInPath(mousePos[0], mousePos[1]) == true) {
        var bounds = path.bounds(elementGeometry);
        var dx = bounds[1][0] - bounds[0][0];
        var dy = bounds[1][1] - bounds[0][1];
        var x = (bounds[0][0] + bounds[1][0]) / 2;
        var y = (bounds[0][1] + bounds[1][1]) / 2;
        var scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
        var translate = [width / 2 - scale * x, height / 2 - scale * y];
        ctx.save();
        ctx.translate(translate[0], translate[1]);
        ctx.scale(scale, scale);
        ctx.lineWidth = 0.5*1/scale;
        selectedElement = element;
        drawElements(map, elements);
        zoomLevel += 1;
        viewport = [-translate[0]/scale, width/scale-translate[0]/scale, -translate[1]/scale, height/scale-translate[1]/scale];
      }
    })
  // }
}

function dblclicked(mousePos, map, elements) {
  // double click reset
  ctx.restore();
  zoomLevel = 0;
  viewport = [0, 860, 0, 640];
  // drawMap(elements);
  drawElements(map, elements)
}

////////////////////////////////////////////////////////////////////////////////
//                                                              Miscellaneous //
////////////////////////////////////////////////////////////////////////////////

// update header github link
    $(".header-button.github").attr("href", "https://github.com/Francois-Thierry/france-in-maps/tree/gh-pages")