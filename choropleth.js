var data; // loaded asynchronously
var data_quantile; // computed after load
var data_mean;
var data_std;
var data_min;
var data_max;

var county_codes;
var m = Number.MAX_VALUE;
var km_to_m = 1.0 / 1.609344;
// removed 0 here and hacked the legend code so that we don't have white + white borders
var legend_min = {1:m, 2:m, 3:m, 4:m, 5:m, 6:m, 7:m, 8:m};
var legend_max = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0};

var percent = d3.format(".2%");
var percentx = function(x) { return d3.format(".2f")(100*x);}
var fixed = d3.format(".0f");
var number = d3.format("n");
var fixedx = function(x) { return d3.format(".0f")(km_to_m*x);}

// NB: Change your number format function here:
var format = percent;
var formatx = percentx;

var path = d3.geo.path();

var svg = d3.select("#chart")
  .append("svg:svg");

var title = svg.append("svg:text")
    .attr("text-anchor", "start")
    .attr("dx", 10)
    .attr("dy", 18)
    .attr("class", "title")
    ;

var counties = svg.append("svg:g")
    .attr("id", "counties")
    .attr("class", "Reds");

var states = svg.append("svg:g")
    .attr("id", "states");

var legend = svg.append("svg:g")
    .attr("id", "legend")
    .attr("class", "Reds"); // NB: Change the color scheme here

d3.json("us-counties.json", function(json) {
  counties.selectAll("path")
      .data(json.features)
    .enter().append("svg:path")
      .attr("class", data ? quantize : null)
      .attr("d", path)
      .on("mouseover", show(true))
      .on("mouseout", show(false))
    ;

    make_legend();
});

d3.json("us-states.json", function(json) {
  states.selectAll("path")
      .data(json.features)
    .enter().append("svg:path")
      .attr("d", path);
});

d3.json("county_codes.json", function(json) {
    county_codes = json;
});

d3.json("data.json", function(json) {
    data = json;

    populate_stats(data);

    counties.selectAll("path")
        .attr("class", quantize)
    ;

    make_legend();

});

function make_legend()
{
    if (!data)
        return;

    // populate legend
    var mins = get_values(legend_min);
    legend.selectAll("path")
            .data(mins)
        .enter().append("svg:rect")
            .attr("width", 40)
            .attr("height", 20)
            .attr("y", function(d, i){ return 30 + i*21;})
            .attr("x", 10)
            .attr("class", function(d, i){return "q" + (i+1) + "-9";})
    ;
    
    var maxes = get_values(legend_max);
    legend.selectAll("text")
            .data(mins)
        .enter().append("svg:text")
            .attr("text-anchor", "start") // text-align
            .attr("x", 50)
            .attr("y", function(d, i){return 30 + i*21})
            .attr("dx", 3) // padding-right
            .attr("dy", 12 + 4) // vertical-align: used font size (copied from css. must be a better way)
            .attr("class", "legend")
            .text(function (d, i){return formatx(d) + " - " + format(maxes[i]);})
    ;
}

function show(b)
{
    return function(d, i) {
        var s = counties.selectAll("path").filter(function(g){return g.id == d.id;});
        if (b)
        {
            title.text(county_codes[d.id] + ": " + format(data[d.id] !== undefined ? data[d.id] : 0));
            s.attr("class", "highlight");//"q0-9"
        }
        else
        {
            title.text("");
            s.attr("class", quantize);
        }
    }
}

function __quantize(f, min, max)
{
    // quantile scaling
    var q = data_quantile(f);
    
    // log scaling (works for county_pop data)
    var l = ~~(Math.log(f+1) * (9 / (Math.log(data_max) - Math.log(data_min+1))));
    
    // original scaling (ish). 
    var o = ~~(f * 9 / (data_mean + data_std));

    // original with less head room 
    var ol = ~~(f * 11 / (data_mean + data_std));

    // original with more head room 
    var om = ~~(f * 7 / (data_mean + data_std));

    return Math.max(min, Math.min(max, q));
}

function quantize(d) {
    // map data[d.id] to be between 0 and 8
    // original code did:
    // values ranged between 1.2 and 30.1. Avg was 9, std is 3.65
    var min = 1;
    var max = 8;
    var f = data[d.id];
    if (f == undefined)
        f = 0;

    var q = __quantize(f, min, max);
    legend_min[q] = Math.min(legend_min[q], f);
    legend_max[q] = Math.max(legend_max[q], f);

    return "q" + q + "-9";
}

var get_values = function(obj)
{
    var values = [];
    for (var key in obj)
    {
        if (obj.hasOwnProperty(key))
            values.push(obj[key]);
    }
    return values;
}

var populate_stats = function(data)
{
    // need sorted values for quantile
    var values = get_values(data); 
    data_quantile = d3.scale.quantile();
    data_quantile.domain(values);
    data_quantile.range([1,2,3,4,5,6,7,8]);
    
    data_mean = d3.mean(values);
    data_std = std(values);
    data_max = d3.max(values);
    data_min = d3.min(values);
}

var std = function(l)
{
    var M = 0.0;
    var S = 0.0;
    var k = 1;
    for (var i = 0; i < l.length; i++)
    {
        var value = l[i];
        var tmpM = M;
        M += (value - tmpM) / k;
        S += (value - tmpM) * (value - M);
        k++;
    }
    return Math.sqrt(S / (k-1));
}
