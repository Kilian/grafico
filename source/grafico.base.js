/**
 * Grafico - SVG graphing library - base file
 *
 * Copyright (c) 2009 - 2010 Kilian Valkhof (kilianvalkhof.com) - Originally developed by Alex Young (http://alexyoung.org)
 * Visit grafico.kilianvalkhof.com for more information and changelogs.
 * Licensed under the MIT license. http://www.opensource.org/licenses/mit-license.php
 *
 */
var Grafico = {
  Version: "0.9.1",

  Base: {},
  BaseGraph: {},
  Normaliser: {},
  LineGraph: {},
  AreaGraph: {},
  StackGraph: {},
  StreamGraph: {},
  BarGraph: {},
  StackedBarGraph: {},
  HorizontalBarGraph: {},
  SparkLine: {},
  SparkBar: {}
};

Grafico.Base = Class.create({
  normaliseData: function (data) {
    return $A(data).collect(function (value) {
      return this.normalise(value);
    }.bind(this));
  },

  deepCopy: function (obj) {
    var out, i, len;
    if (Object.prototype.toString.call(obj) === '[object Array]') {
      out = [];
      len = obj.length;
      for (i = 0; i < len; i++) {
        out[i] = arguments.callee(obj[i]);
      }
      return out;
    }
    if (typeof obj === 'object') {
      out = {};
      for (i in obj) {
        out[i] = arguments.callee(obj[i]);
      }
      return out;
    }
    return obj;
  }
});

Grafico.Normaliser = Class.create({
  initialize: function(data, options) {
    this.options = {
      start_value: undefined, // override start_value
      number_of_tickmarks: 10 // number of labels to aim for
    };
    Object.extend(this.options, options || {});

    // Data range
    this.min = data.min();
    this.max = data.max();

    // Bottom of graph
    this.start_value = undefined;
    // Used in barcharts
    this.zero_value  = undefined;
    // Range displayed on the axis
    this.range = undefined;
    // Difference between labels
    this.step = undefined;

    // Override start_value with options value
    if (this.options.start_value !== undefined) {
      this.start_value = this.options.start_value;
      this.zero_value  = this.options.start_value;
    }

    // Edgecase of zero values
    if (this.min == 0 && this.min == this.max) {
      this.start_value = 0;
      this.zero_value  = 0;
      this.range       = 1;
      this.step        = 1;
    } else {
      var normalized_min;

      if (this.start_value !== undefined && this.min >= 0) {
        normalized_min = this.start_value;
      } else {
        normalized_min = this.min;
      }
      this.looseLabels(normalized_min, this.max);
    }
  },

  // Based on:
  // http://books.google.com/books?id=fvA7zLEFWZgC&pg=PA61&lpg=PA61#v=onepage&q&f=false
  looseLabels: function(min, max) {
    var range = min == max ? this.niceNumber(Math.abs(max), false) : this.niceNumber(max - min, false),
        d     = this.niceNumber(range / (this.options.number_of_tickmarks - 1), true),
        precision = [(-Math.floor(Math.LOG10E * Math.log(d))), 0].max(),
        graphmin  = this.floorToPrecision(min / d , precision) * d,
        graphmax  = this.ceilToPrecision(max / d, precision) * d,
        margin    = this.roundToPrecision(this.niceNumber(0.5 * d, true), precision);

    this.step = this.roundToPrecision(d, precision);

    // Leave some headroom on top
    // handle cases of negative values
    if (this.max <= 0) {
      graphmax = [graphmax + margin, 0].min();
    } else {
      graphmax = graphmax + margin;
    }

    // Add some headroom to the bottom
    if (this.min < 0) {
      graphmin = graphmin - margin;
    } else {
      graphmin = [graphmin - margin, 0].max();
    }

    // Round to a proper origin value
    if (min !== max) {
      graphmin = this.roundToOrigin(graphmin, 1);
    }

    this.range = this.roundToPrecision(Math.abs( this.ceilToPrecision(graphmax, precision) - this.floorToPrecision(graphmin, precision)), precision);
    this.start_value = this.floorToPrecision(graphmin, precision);
    this.zero_value = this.roundToPrecision(Math.abs(graphmin) / this.step, precision);
  },

  roundToPrecision: function(x, precision) {
    var exp = Math.pow(10, precision);
    return Math.round(x * exp) / exp;
  },

  floorToPrecision: function(x, precision) {
    var exp = Math.pow(10, precision);
    return Math.floor(x * exp) / exp;
  },

  ceilToPrecision: function(x, precision) {
    var exp = Math.pow(10, precision);
    return Math.ceil(x * exp) / exp;
  },

  niceNumber: function(x, round) {
    var exp = Math.floor(Math.LOG10E * Math.log(x)), // exponent of x
        p, f, nf;

    // Fix for inaccuracies calculating negative powers
    if (exp < 0) {
      p = parseFloat(Math.pow(10, exp).toFixed(Math.abs(exp)));
    } else {
      p = Math.pow(10, exp);
    }
    f = x / p;

    if (round) {
      if (f < 1.5) {
        nf = 1;
      } else if (f < 3) {
        nf = 2;
      } else if (f < 7) {
        nf = 5;
      } else {
        nf = 10;
      }
    } else {
      if (f <= 1) {
        nf = 1;
      } else if (f <= 2) {
        nf = 2;
      } else if (f <= 5) {
        nf = 5;
      } else {
        nf = 10;
      }
    }

    return nf * p;
  },

  roundToOrigin: function (value, offset) {
    var rounded_value = value,
        multiplier;

    offset = offset || 1;
    multiplier = Math.pow(10, -offset);
    rounded_value = Math.round(value * multiplier) / multiplier;
    return (rounded_value > this.min) ? this.roundToOrigin(value - this.step) : rounded_value;
  }
});

Grafico.BaseGraph = Class.create(Grafico.Base, {
  initialize: function (element, data, options) {
    this.options = {
      width:                  parseInt(element.getStyle('width'), 10),
      height:                 parseInt(element.getStyle('height'), 10),
      grid:                   true,
      show_vertical_grid:     true,
      show_horizontal_grid:   true,
      plot_padding:           10,    // Padding for the graph line/bar plots
      font_size:              10,    // Label font size
      show_horizontal_labels: true,
      show_vertical_labels:   true,
      show_ticks:             true,
      vertical_label_unit:    '',
      background_color:      '#fff',
      label_color:           '#000', // Label text color
      grid_color:            '#ccc', // Grid line color
      hover_text_color:      '#fff', // hover color
      markers:                false, // false, circle, value
      marker_size:            5,
      meanline:               false,
      padding_top:            20,
      draw_axis:              true,
      datalabels:             '',    // interactive, filled with same # of elements as graph items.
      hover_color:            '',    // hover color if there are datalabels
      hover_radius:           15,    // pixels minimum at the top and at the bottom of a line for hover activation
      watermark:              false,
      watermark_location:     false, // determine position of watermark. currently available is bottomright and middle
      hide_empty_label_grid:  false, // hide gridlines for labels with no value
      left_padding:           false, // set a standard leftpadding regardless of label width
      right_padding:          false,
      label_rotation:         0,
      label_max_size:         false,
      focus_hint:             true,
      min:                    0,
      max:                    null,
      normaliser:        Grafico.Normaliser
    };

    Object.extend(this.options, this.chartDefaults() || { });
    Object.extend(this.options, options || { });

    this.element = element;
    this.data_sets = Object.isArray(data) ? new Hash({ one: data }) : $H(data);
    if (this.chartDefaults().stacked === true) {
      this.real_data = this.deepCopy(this.data_sets);
      this.data_sets = this.stackData(this.data_sets);
    }

    this.flat_data = this.data_sets.collect(function (data_set) { return data_set[1]; }).flatten();
    if (this.hasBaseLine()) {
      this.flat_data.push(this.base_line);
      this.flat_data = this.flat_data.flatten();
    }
    this.normaliser = new this.options.normaliser(this.flat_data, this.normaliserOptions());
    this.label_step = this.normaliser.step;
    this.range = this.normaliser.range;
    this.start_value = this.normaliser.start_value;
    this.zero_value = this.normaliser.zero_value;
    this.data_size = this.longestDataSetLength();

    /* If one color is specified, map it to a compatible set */
    if (options && options.color) {
      options.colors = {};
      this.data_sets.keys().each(function (key) {
        options.colors[key] = options.color;
      });
    }

    /* overwrite some defaults and then add the options AGAIN */
    this.options.colors = this.makeRandomColors();
    this.options.labels = $A($R(1, this.data_size));

    /* add the options again, because some defaults (labels, colors) could not be
     * generated withouth first knowing the user options (which is kind of a
     * chicken-and-egg problem)
     */
    Object.extend(this.options, this.chartDefaults() || { });
    Object.extend(this.options, options || { });

    /* Padding around the graph area to make room for labels */
    this.x_padding_left = 10 + this.paddingLeftOffset();
    this.x_padding_left += this.options.vertical_label_unit ? 6 : 0;
    this.x_padding_left = this.options.left_padding ? this.options.left_padding : this.x_padding_left;
    this.x_padding_right = this.options.right_padding || this.paddingRightOffset();
    this.x_padding = this.x_padding_left + this.x_padding_right;
    this.y_padding_top = this.options.padding_top;
    this.y_padding_bottom = 20 + this.paddingBottomOffset();
    this.y_padding = this.y_padding_top + this.y_padding_bottom;

    this.graph_width = this.options.width - this.x_padding;
    this.graph_height = this.options.height - this.y_padding;

    this.step = this.calculateStep();

    /* Calculate how many labels are required */
    this.y_label_count = (this.range / this.label_step).round();
    if (isNaN(this.y_label_count)) {
      this.y_label_count = 1;
      this.options.show_vertical_labels = false;
    }

    if ((this.normaliser.min + (this.y_label_count * this.normaliser.step)) < this.normaliser.max) {
      this.y_label_count += 1;
    }

    this.value_labels = this.makeValueLabels(this.y_label_count);

    this.top_value = this.value_labels.last();
    /* Grid control options */
    this.grid_start_offset = -1;

    /* Drawing */
    this.paper = new Raphael(this.element, this.options.width, this.options.height);
    this.background = this.paper.rect(this.x_padding_left, this.y_padding_top, this.graph_width, this.graph_height);
    this.background.attr({fill: this.options.background_color, stroke: 'none' });
    this.options.meanline = (this.options.meanline === true) ? { 'stroke-width': '2px', stroke: '#BBBBBB' } : this.options.meanline;

    /* global Sets */
    this.globalMarkerSet = this.paper.set();
    this.globalHoverSet = this.paper.set();
    this.globalBlockSet = this.paper.set();
    this.globalAreaLineSet = this.paper.set();

    this.setChartSpecificOptions();
    this.draw();

    this.globalAreaLineSet.toFront();
    this.globalMarkerSet.toFront();
    this.globalHoverSet.toFront();
    this.globalBlockSet.toFront();
  },

  normaliserOptions: function () {
    return {graph_height : parseInt(this.element.getStyle('height'), 10)};
  },

  hasBaseLine: function () {
    return false;
  },

  getNormalizedBaseLine: function () {
    if (this.normalized_base_line == undefined) {
      this.normalized_base_line = this.normaliseData(this.base_line);
    }
    return this.normalized_base_line;
  },

  getNormalizedRealData: function () {
    if (this.normalized_real_data == undefined) {
      this.normalized_real_data = this.real_data.collect(function(data) { return this.normaliseData(data[1]); }.bind(this));
    }
    return this.normalized_real_data;
  },

  chartDefaults: function () {
    /* Define in child class */
  },

  drawPlot: function (index, cursor, x, y, color, coords, datalabel, element, graphindex) {
    /* Define in child class */
  },

  calculateStep: function () {
    /* Define in child classes */
  },

  getMousePos: function (e) {
    var posx = 0,
        posy = 0,
        mousepos;
    if (!e) {
      e = window.event;
    }
    if (e.pageX || e.pageY) {
      posx = e.pageX;
      posy = e.pageY;
    }
    else if (e.clientX || e.clientY) {
      posx = e.clientX + document.body.scrollLeft - document.documentElement.scrollLeft;
      posy = e.clientY + document.body.scrollTop - document.documentElement.scrollTop;
    }
    mousepos = {x : posx , y : posy};
    return mousepos;
  },

  makeRandomColors: function (number) {
    var colors = {};
    var step = 1/this.data_sets.size();
    var hue = Math.random();
    this.data_sets.each(function (data) {
      colors[data[0]] = Raphael.hsb2rgb(hue, 0.85, 0.75).hex;
      hue = (hue + step)%1;
    });
    return colors;
  },

  longestDataSetLength: function () {
    var length = 0;
    this.data_sets.each(function (data_set) {
      length = data_set[1].length > length ? data_set[1].length : length;
    });
    return length;
  },

  roundValue: function (value, length) {
    var multiplier = Math.pow(10, length);
    value *= multiplier;
    value = Math.round(value) / multiplier;
    return value;
  },

  roundValues: function (data, length) {
    return $A(data).collect(function (value) { return this.roundValue(value, length); }.bind(this));
  },

  paddingLeftOffset: function () {
    var result = 0;
    if (this.options.show_vertical_labels) {
      /* Find the longest label and multiply it by the font size */
      var data = this.flat_data,
           longest_label_length;

        // Round values
      data = this.roundValues(data, 2);
      longest_label_length = $A(data).max(function (value,i) { return value.toString().length; });
      longest_label_length = longest_label_length > 2 ? longest_label_length - 1 : longest_label_length;
      result = longest_label_length * this.options.font_size;
    }
    return result;
  },

  paddingRightOffset: function () {
    // default value, can be overridden
    return 20;
  },

  paddingBottomOffset: function () {
    /* height of the text */
    return this.options.font_size;
  },

  normalise: function (value) {
    var total = this.start_value === 0 ? this.top_value : this.range;
    if (total === 0) {total = 1;}
    return ((value / total) * this.graph_height);
  },

  draw: function () {
    if (this.options.grid) {
      this.drawGrid();
    }
    if (this.options.watermark) {
      this.drawWatermark();
    }

    if (this.options.show_vertical_labels) {
      this.drawVerticalLabels();
    }

    if (this.options.show_horizontal_labels) {
      this.drawHorizontalLabels();
    }

    if (!this.options.watermark) {
      this.drawLinesInit(this);
    }
    
    if (this.options.drawlegend){
      this.drawLegend(this);
    }
    
    if (this.options.draw_axis) {
      this.drawAxis();
    }

    if (this.start_value !== 0 && this.options.focus_hint) {
      this.drawFocusHint();
    }

    if (this.options.meanline) {
      this.drawMeanLine(this.normaliseData(this.flat_data));
    }
  },

  drawLinesInit: function (thisgraph) {
    thisgraph.data_sets.each(function (data, index) {
      thisgraph.drawLines(data[0], thisgraph.options.colors[data[0]], thisgraph.normaliseData(data[1]), thisgraph.options.datalabels[data[0]], thisgraph.element, index);
    }.bind(thisgraph));
  },

  drawWatermark: function () {
    var watermark = this.options.watermark,
        watermarkimg = new Image(),
        thisgraph = this;

    watermarkimg.onload = function (){
      var right, bottom, image;
      if (thisgraph.options.watermark_location === "middle") {
        right = (thisgraph.graph_width - watermarkimg.width) / 2 + thisgraph.x_padding_left;
        bottom = (thisgraph.graph_height - watermarkimg.height) / 2 + thisgraph.y_padding_top;
      } else {
        right = thisgraph.graph_width - watermarkimg.width + thisgraph.x_padding_left - 2;
        bottom = thisgraph.graph_height - watermarkimg.height + thisgraph.y_padding_top - 2;
      }
      image = thisgraph.paper.image(watermarkimg.src, right, bottom, watermarkimg.width, watermarkimg.height).attr({'opacity': '0.4'});

      thisgraph.drawLinesInit(thisgraph, thisgraph.data);

      if (thisgraph.options.stacked_fill||thisgraph.options.area) {
        image.toFront();
      }
    };
    watermarkimg.src = watermark.src || watermark;
  },

  drawGrid: function () {
    var path = this.paper.path().attr({ stroke: this.options.grid_color}),
        y, x, x_labels, i;

    if (this.options.show_horizontal_grid) {
      y = this.graph_height + this.y_padding_top;
      for (i = 0; i < this.y_label_count + 1; i++) {
        path.moveTo(this.x_padding_left - 0.5, parseInt(y, 10) + 0.5);
        path.lineTo(this.x_padding_left + this.graph_width - 0.5, parseInt(y, 10) + 0.5);
        y = y - (this.graph_height / this.y_label_count);
      }
    }
    if (this.options.show_vertical_grid) {
      x = this.x_padding_left + this.options.plot_padding + this.grid_start_offset;
      x_labels = this.options.labels.length;

      for (i = 0; i < x_labels; i++) {
        if ((this.options.hide_empty_label_grid === true && this.options.labels[i] !== "") || this.options.hide_empty_label_grid === false) {
          path.moveTo(parseInt(x, 10), this.y_padding_top);
          path.lineTo(parseInt(x, 10), this.y_padding_top + this.graph_height);
        }
        x = x + this.step;
      }
    }
  },
  drawLegend: function () {
	    /* Define in child classes */
  },
  drawLines: function (label, color, data, datalabel, element, graphindex) {
    var coords = this.calculateCoords(data),
        y_offset = (this.graph_height + this.y_padding_top),
        cursor,
        cursor2,
        odd_horizontal_offset,
        rel_opacity;

    if (this.options.start_at_zero === false) {
      odd_horizontal_offset = 0;
      $A(coords).each(function (coord, index) {
        if (coord[1] === y_offset) {odd_horizontal_offset++;}
      });
      this.options.odd_horizontal_offset = odd_horizontal_offset;

      if (this.options.odd_horizontal_offset > 1) {
        coords.splice(0, this.options.odd_horizontal_offset);
      }
    }

    if (this.options.stacked_fill || this.options.area) {
      if (this.options.area) {
        rel_opacity = this.options.area_opacity ? this.options.area_opacity : 1.5 / this.data_sets.collect(function (data_set) { return data_set.length; }).length;
        cursor = this.paper.path().attr({stroke: color, fill: color, 'stroke-width': '0', opacity: rel_opacity, 'stroke-opacity': 0});
      } else {
        cursor = this.paper.path().attr({stroke: color, fill: color, 'stroke-width': '0'});
      }

      /* add first and last to fill the area */
      if (!this.hasBaseLine()) {
        coords.unshift([coords[0][0] , y_offset]);
        coords.push([coords[coords.length-1][0] , y_offset]);
      }
    } else {
      cursor = this.paper.path().attr({stroke: color, 'stroke-width': this.options.stroke_width + "px"});
    }

    $A(coords).each(function (coord, index) {
      var x = coord[0],
      y = coord[1];
      if (color instanceof Array) {
        var color_index = index % color.length;
        this.drawPlot(index, cursor, x, y, color[color_index], coords, datalabel, element, graphindex);
      } else {
        this.drawPlot(index, cursor, x, y, color, coords, datalabel, element, graphindex);
      }
    }.bind(this));

    if (this.options.area && this.options.stroke_width > 0) {
      cursor2 = this.paper.path().attr({stroke: color, 'stroke-width': this.options.stroke_width + "px"});
      coords.remove(0);
      coords.remove(-1);
      $A(coords).each(function (coord, index) {
          var x = coord[0],
              y = coord[1];
          this.drawPlot(index, cursor2, x, y, color, coords, datalabel, element, graphindex, true);
      }.bind(this));
      this.globalAreaLineSet.push(cursor2);
    }

    if (this.options.datalabels && this.options.draw_hovers) {
      this.drawHover(cursor, datalabel, element, color);
      this.globalHoverSet.toFront();
    }

  },

  calculateCoords: function (data) {
    var x = this.x_padding_left + this.options.plot_padding - this.step,
        y_offset = (this.graph_height + this.y_padding_top) + this.normalise(this.start_value);

    var top = $A(data).collect(function (value) {
      x += this.step;
      return [x, y_offset - value];
    }.bind(this));

    if (!this.hasBaseLine()) {
      return top;
    }

    x += this.step;
    var bottom = this.getNormalizedBaseLine();

    for (var i = bottom.length - 1; i >= 0; i--) {
      x -= this.step;
      top.push([x, y_offset - bottom[i]]);
    }
    return top;
  },

  drawFocusHint: function () {
    var length = 5,
        x = this.x_padding_left + (length / 2) - 1,
        y = this.options.height - this.y_padding_bottom,
        cursor = this.paper.path().attr({stroke: this.options.label_color, 'stroke-width': 2});

    cursor.moveTo(x, y);
    cursor.lineTo(x - length, y - length);
    cursor.moveTo(x, y - length);
    cursor.lineTo(x - length, y - (length * 2));
  },

  drawMeanLine: function (data) {
    var cursor = this.paper.path().attr(this.options.meanline),
        offset = $A(data).inject(0, function (value, sum) { return sum + value; }) / data.length - 0.5;
        offset = this.options.bar ? offset + (this.zero_value * (this.graph_height / this.y_label_count)) : offset;

    cursor.moveTo(this.x_padding_left - 1, this.options.height - this.y_padding_bottom - offset).
           lineTo(this.graph_width + this.x_padding_left, this.options.height - this.y_padding_bottom - offset);
  },

  drawAxis: function () {
    var cursor = this.paper.path().attr({stroke: this.options.label_color});

    //horizontal
    cursor.moveTo(parseInt(this.x_padding_left, 10) - 0.5, this.options.height - parseInt(this.y_padding_bottom, 10) + 0.5);
    cursor.lineTo(parseInt(this.graph_width + this.x_padding_left, 10) - 0.5, this.options.height - parseInt(this.y_padding_bottom, 10) + 0.5);

    //vertical
    cursor.moveTo(parseInt(this.x_padding_left, 10) - 0.5, parseInt(this.options.height - this.y_padding_bottom, 10) + 0.5);
    cursor.lineTo(parseInt(this.x_padding_left, 10) - 0.5, parseInt(this.y_padding_top, 10));
  },

  makeValueLabels: function (steps) {
    var step = this.label_step,
        label = this.start_value,
        labels = [];
    for (var i = 0; i < steps; i++) {
      label = this.roundValue((label + step), 3);
      labels.push(label);
    }
    return labels;
  },

  drawMarkers: function (labels, direction, step, start_offset, font_offsets, extra_font_options) {
  /* Axis label markers */
    function x_offset(value) {
      return value * direction[0];
    }

    function y_offset(value) {
      return value * direction[1];
    }

    /* Start at the origin */
    var x = parseInt(this.x_padding_left, 10) - 0.5 + x_offset(start_offset),
        y = this.options.height - this.y_padding_bottom + y_offset(start_offset),
        cursor = this.paper.path().attr({stroke: this.options.label_color}),
        font_options = {"font": this.options.font_size + 'px "Arial"', stroke: "none", fill: this.options.label_color};

    Object.extend(font_options, extra_font_options || {});

    labels.each(function (label) {
      if (this.options.draw_axis &&
          ((this.options.hide_empty_label_grid === true && label !== "") || this.options.hide_empty_label_grid === false) &&
          this.options.show_ticks) {
        cursor.moveTo(parseInt(x, 10), parseInt(y, 10) + 0.5);
        cursor.lineTo(parseInt(x, 10) + y_offset(5), parseInt(y, 10) + 0.5 + x_offset(5));
      }

      if (label !== "") {
        this.paper.text(x + font_offsets[0], y - 2 - font_offsets[1], label.toString()).attr(font_options);
      }

      x = x + x_offset(step);
      y = y + y_offset(step);
    }.bind(this));
  },

  drawVerticalLabels: function () {
    var y_step = this.graph_height / this.y_label_count;
    var vertical_label_unit = this.options.vertical_label_unit ? " " + this.options.vertical_label_unit : "";
    for (var i = 0; i < this.value_labels.length; i++) {
      this.value_labels[i] += vertical_label_unit;
    }
    this.drawMarkers(this.value_labels, [0, -1], y_step, y_step, [-8, -2], { "text-anchor": 'end' });
  },

  drawHorizontalLabels: function () {
    var extra_options = this.options.label_rotation ? {rotation: this.options.label_rotation, translation: -this.options.font_size + " 0"} : {},
        labels = this.options.labels;

    if (this.options.label_max_size) {
      for (var i = 0; i < labels.length; i++) {
        labels[i] = labels[i].truncate(this.options.label_max_size + 1, "…");
      }
    }

    this.drawMarkers(labels, [1, 0], this.step, this.options.plot_padding, [0, (this.options.font_size + 7) * -1], extra_options);
  },

  drawHover: function(cursor, datalabel, element, color) {
    var thisgraph = this,
        colorattr = (this.options.stacked_fill || this.options.area) ? "fill" : "stroke",
        hover_color = this.options.hover_color || color,
        hoverSet = this.paper.set(),
        textpadding = 4,
        text = this.paper.text(cursor.attrs.x, cursor.attrs.y - (this.options.font_size * 1.5) - textpadding, datalabel).
                          attr({'font-size': this.options.font_size, fill:this.options.hover_text_color,opacity: 1}),
        textbox = text.getBBox(),
        roundRect = this.drawRoundRect(text, textbox, textpadding);

    hoverSet.push(roundRect,text).attr({opacity: 0});
    this.checkHoverPos({rect: roundRect, set: hoverSet});
    this.globalHoverSet.push(hoverSet);

    cursor.hover(function (event) {
      if (colorattr === "fill") {
        cursor.animate({fill : hover_color,stroke : hover_color}, 200);
      } else {
        cursor.animate({stroke : hover_color}, 200);
      }

      var mousepos = thisgraph.getMousePos(event);
      hoverSet[0].attr({
        x:mousepos.x - (textbox.width / 2 ) - textpadding - element.offsetLeft,
        y:mousepos.y - (textbox.height / 2) - (thisgraph.options.font_size * 1.5) - textpadding - element.offsetTop,
        opacity:1});
      hoverSet[1].attr({
        x:mousepos.x - element.offsetLeft,
        y:mousepos.y - (thisgraph.options.font_size * 1.5) - element.offsetTop,
        opacity:1});

      cursor.mousemove(function (event) {
        var mousepos = thisgraph.getMousePos(event);
        hoverSet[0].attr({
          x:mousepos.x - (textbox.width / 2) - textpadding-element.offsetLeft,
          y:mousepos.y - (textbox.height / 2) - (thisgraph.options.font_size * 1.5) - textpadding-element.offsetTop,
          opacity:1});
        hoverSet[1].attr({
          x:mousepos.x-element.offsetLeft,
          y:mousepos.y-(thisgraph.options.font_size*1.5)-element.offsetTop,
          opacity:1});
        thisgraph.checkHoverPos(roundRect,hoverSet);
      });

    }, function (event) {
      if (colorattr === "fill") {
        cursor.animate({fill : color,stroke : color}, 200);
      } else {
        cursor.animate({stroke : color}, 200);
      }
      hoverSet.attr({opacity:0});
    });
  },

  checkHoverPos: function (elements) {
    var diff, rect, rectsize, set, setbox, marker, nib, textpadding;
    if (elements.rect) {
      rect = elements.rect;
      rectsize = rect.getBBox();
    }
    if (elements.set) { set = elements.set; }
    if (elements.marker) { marker = elements.marker;}
    if (elements.nib) {    nib = elements.nib;}
    if (elements.textpadding) { textpadding = elements.textpadding;}

    if (rect && set) {
      /* top */
      if (rect.attrs.y < 0) {
        if (nib && marker) {
          setbox = set.getBBox();
          set.translate(0,     setbox.height + (textpadding * 2));
          marker.translate(0, -setbox.height - (textpadding * 2));
          nib.translate(0,    -rectsize.height - textpadding + 1.5).scale(1, -1);
        } else {
          diff = rect.attrs.y;
          set.translate(0, 1 - diff);
        }
      }
      /* bottom */
      if ((rect.attrs.y + rectsize.height) > this.options.height) {
        diff = (rect.attrs.y + rectsize.height) - this.options.height;
        set.translate(0, -diff - 1);
        if (marker) { marker.translate(0, diff + 1); }
      }
      /* left */
      if (rect.attrs.x < 0) {
        diff = rect.attrs.x;
        set.translate(-diff + 1, 0);
        if (nib)    { nib.translate(diff - 1, 0); }
        if (marker) { marker.translate(diff - 1, 0); }
      }
      /* right */
      if ((rect.attrs.x + rectsize.width) > this.options.width) {
        diff = (rect.attrs.x + rectsize.width) - this.options.width;
        set.translate(-diff - 1, 0);
        if (nib)    { nib.translate(diff + 1, 0); }
        if (marker) { marker.translate(diff + 1, 0); }
      }
    }
  },

  drawNib: function (text, textbox, textpadding) {
    return this.paper.path()
    .attr({fill: this.options.label_color, opacity: 1, stroke: this.options.label_color, 'stroke-width':'0px'})
    .moveTo(text.attrs.x - textpadding, text.attrs.y + (textbox.height / 2) + textpadding - 1)
    .lineTo(text.attrs.x, text.attrs.y + (textbox.height / 2) + (textpadding * 2))
    .lineTo(text.attrs.x + textpadding, text.attrs.y + (textbox.height / 2) + textpadding - 1)
    .andClose();
  },

  drawRoundRect : function(text, textbox, textpadding) {
    return this.paper.rect(
    text.attrs.x - (textbox.width / 2) - textpadding,
    text.attrs.y - (textbox.height / 2) - textpadding,
    textbox.width + (textpadding * 2),
    textbox.height + (textpadding * 2),
    textpadding * 1.5).attr({fill: this.options.label_color,opacity: 1, stroke: this.options.label_color, 'stroke-width':'0px'});
  }
});

/* Supporting methods to make dealing with arrays easier */
/* Note that some of this work to reduce framework dependencies */
Array.prototype.sum = function () {
  for (var i = 0, sum = 0; i < this.length; sum += this[i++]) {}
  return sum;
};

if (typeof Array.prototype.max === 'undefined') {
  Array.prototype.max = function () {
    return Math.max.apply({}, this);
  };
}

if (typeof Array.prototype.min === 'undefined') {
  Array.prototype.min = function () {
    return Math.min.apply({}, this);
  };
}

Array.prototype.mean = function () {
  return this.sum() / this.length;
};

Array.prototype.variance = function () {
  var mean = this.mean(),
      variance = 0;
  for (var i = 0; i < this.length; i++) {
    variance += Math.pow(this[i] - mean, 2);
  }
  return variance / (this.length - 1);
};

Array.prototype.standard_deviation = function () {
  return Math.sqrt(this.variance());
};

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

/* Raphael path methods. Supporting methods to make dealing with arrays easier */
Raphael.el.isAbsolute = true;
Raphael.el.absolutely = function () {
  this.isAbsolute = 1;
  return this;
};

Raphael.el.relatively = function () {
  this.isAbsolute = 0;
  return this;
};

Raphael.el.moveTo = function (x, y) {
  this._last = {x: x, y: y};
  return this.attr({path: this.attrs.path + ["m", "M"][+this.isAbsolute] + parseFloat(x) + " " + parseFloat(y)});
};

Raphael.el.lineTo = function (x, y) {
  this._last = {x: x, y: y};
  return this.attr({path: this.attrs.path + ["l", "L"][+this.isAbsolute] + parseFloat(x) + " " + parseFloat(y)});
};

Raphael.el.cplineTo = function (x, y, w) {
  if (x > this._last.x) {
    this.attr({path: this.attrs.path + ["C", this._last.x + w, this._last.y, x - w, y, x, y]});
  }
  else if (x == this._last.x) {
    this.lineTo(x, y);
  }
  else {
    this.attr({path: this.attrs.path + ["C", this._last.x - w, this._last.y, x + w, y, x, y]});
  }
  this._last = {x: x, y: y};
  return this;
};

Raphael.el.andClose = function () {
  return this.attr({path: this.attrs.path + "z"});
};

