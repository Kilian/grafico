/**
 * Grafico - SVG graphing library - linegraph, areagraph and stacked areagraph file
 *
 * Copyright (c) 2009 - 2010 Kilian Valkhof (kilianvalkhof.com) - Originally developed by Alex Young (http://alexyoung.org)
 * Visit grafico.kilianvalkhof.com for more information and changelogs.
 * Licensed under the MIT license. http://www.opensource.org/licenses/mit-license.php
 *
 */

Grafico.LineGraph = Class.create(Grafico.BaseGraph, {
  chartDefaults: function () {
    return {
      line: true,
      start_at_zero: true,
      stroke_width: 5,
      drawlegend: false,
      curve_amount: 10,
      legend_title: 'Legend:',
      legend_positon_x: 'right',
      legend_positon_y: 'bottom'
    };
  },

  setChartSpecificOptions: function () {
  },

  calculateStep: function () {
    return (this.graph_width - (this.options.plot_padding * 2)) / (this.data_size - 1);
  },

  startPlot: function (cursor, x, y, color) {
    cursor.moveTo(x, y);
  },  
  drawLegend: function (thisgraph){
		var linelength = 20;
		var textpadding = 2;
		var textheight = 12;
		var textwidth = 8;
		var textspacer = textheight+textpadding;
		var textgap = 40;
		var xroot;
		var yroot;
		
		var lWidth = (thisgraph.options.datalabels[thisgraph.data_sets.keys().max()].length*textwidth) + (4*textwidth) + linelength;
		var lHeight = (thisgraph.data_sets.keys().length * (textheight + textpadding)) + 2*textheight;
		(thisgraph.options.legend_positon_x == 'left')  ?  xroot = parseInt(this.x_padding_left, 10) * 1.5 : xroot = this.graph_width - lWidth;	   
		(thisgraph.options.legend_positon_y == 'top') ? yroot = this.y_padding_bottom : yroot = this.graph_height - lHeight;

		var legendRect = this.paper.rect(xroot,yroot,lWidth,lHeight).attr({
			fill: "white",
			opacity: 0.9
		});
		var legendTitle = thisgraph.options.legend_title;
		var legendText = this.paper.text((xroot+(3*textwidth)),(yroot+textheight), legendTitle);
		var legendSet = this.paper.set(legendRect, legendText);
		for (var i=0; i < thisgraph.data_sets.keys().length; i++){
			var thiscolor = thisgraph.options.colors[thisgraph.data_sets.keys()[i]];
			var path = this.paper.path().attr({stroke: thiscolor, fill: thiscolor, 'stroke-width': '3px'});
			path.moveTo(xroot+textwidth,yroot+(2*textspacer)+(i*textspacer));
	        path.lineTo(xroot+textwidth+linelength,yroot+(2*textspacer)+(i*textspacer));
			var thislabel = thisgraph.options.datalabels[thisgraph.data_sets.keys()[i]];

			var labeltext = this.paper.text(xroot+textgap,yroot+(2*textspacer)+(i*textspacer),thislabel).attr({'text-anchor': 'start'});
			legendSet.push(path);
			legendSet.push(labeltext);
		};
		var start = function () {
			// storing original coordinates
			this.oBB = this.getBBox();
			legendRect.attr({opacity: 0.3});
		},
		move = function (dx, dy) {
			// move will be called with dx and dy
			var bb = this.getBBox();
			legendSet.translate(this.oBB.x - bb.x + dx, this.oBB.y - bb.y + dy);
		},
		up = function () {
			// restoring state
			legendRect.attr({opacity: 0.9});
		};
		legendSet.drag(move, start, up);
  },  
  drawPlot: function (index, cursor, x, y, color, coords, datalabel, element, graphindex) {
    if (index === 0) {
      return this.startPlot(cursor, x - 0.5, y, color);
    }

    if (this.options.curve_amount) {
      cursor.cplineTo(x, y, this.options.curve_amount);
    } else {
      cursor.lineTo(x, y);
    }

    if (this.options.markers === 'circle') {
      this.drawGraphMarkers(index, x, y, color, datalabel, element);
    } else if (this.options.markers === 'value') {
      this.drawGraphValueMarkers(index, x, y, color, datalabel, element, graphindex);
    }
  },

  drawGraphMarkers: function (index, x, y, color, datalabel, element) {
    var circle = this.paper.circle(x, y, this.options.marker_size),
        old_marker_size = this.options.marker_size,
        color2 = this.options.hover_color || color,
        new_marker_size = parseInt(1.7 * old_marker_size, 10);

    circle.attr({ 'stroke-width': '1px', stroke: this.options.background_color, fill: color });
    this.globalMarkerSet.push(circle);

    circle.hover(function (event) {
      circle.animate({r: new_marker_size, fill: color2}, 200);
    }, function (event) {
      circle.animate({r: old_marker_size, fill: color}, 200);
    });
  },

  drawGraphValueMarkers: function (index, x, y, color, datalabel, element, graphindex) {
    index += this.options.odd_horizontal_offset>1 ? this.options.odd_horizontal_offset : 0;
    index -= this.options.stacked_fill || this.options.area ? 1 : 0;

    var currentset   = this.options.stacked ? this.real_data : this.data_sets,
        currentvalue = currentset.collect(function (data_set) { return data_set[1][index]; })[graphindex];

    if (currentvalue) {
      currentvalue = "" + currentvalue.toString().split('.');
      if (currentvalue[1]) {
        currentvalue[1] = currentvalue[1].truncate(3, '');
      }
    }
    if (
      (this.options.line||this.options.stacked) || //if the option is a line graph
      ((this.options.stacked_fill||this.options.area) && index != -1) && //if it's stacked or an area and it's not the first
      typeof currentvalue != "undefined") { //if there is a current value

      var rectx  = x-(this.step/2),
          recty  = y-[this.options.stroke_width/2, this.options.hover_radius].max(),
          rectw  = this.step,
          recth  = [this.options.stroke_width, this.options.hover_radius*2].max(),
          circle = this.paper.circle(x, y, this.options.marker_size == 0 ? [this.options.stroke_width*1.5, this.step].min() : this.options.marker_size).attr({ 'stroke-width': '1px', stroke: this.options.background_color, fill: color,opacity:0}),
          block  = this.paper.rect(rectx, recty, rectw, recth).attr({fill:color, 'stroke-width': 0, stroke : color,opacity:0});

			if (this.options.datalabels) {
				if(typeof(datalabel) == 'function') {
					datalabel = datalabel.call(this, index, currentvalue);
				} else {
        	datalabel = datalabel + ": " + currentvalue;
				}
      } else {
        datalabel = "" + currentvalue;
      }
      datalabel += this.options.vertical_label_unit ? " " + this.options.vertical_label_unit : "";

      var hoverSet = this.paper.set(),
          textpadding = 4,
          text = this.paper.text(circle.attrs.cx, circle.attrs.cy - (this.options.font_size * 1.5) -2 * textpadding, datalabel).attr({'font-size': this.options.font_size, fill:this.options.hover_text_color, opacity: 1}),
          textbox = text.getBBox(),
          roundRect= this.drawRoundRect(text, textbox, textpadding),
          nib = this.drawNib(text, textbox, textpadding);

      hoverSet.push(circle,roundRect,nib,text).attr({opacity:0});
      this.checkHoverPos({rect:roundRect,set:hoverSet,marker:circle,nib:nib,textpadding:textpadding});
      this.globalHoverSet.push(hoverSet);
      this.globalBlockSet.push(block);

      block.hover(function (event) {
        hoverSet.animate({opacity:1},200);
      }, function (event) {
        hoverSet.animate({opacity:0},200);
      });
    }
  }
});

Grafico.AreaGraph = Class.create(Grafico.LineGraph, {
  chartDefaults: function () {
    return {
      area: true,
      area_opacity: false,
      stroke_width: 0,
      curve_amount: 10
    };
  },

  drawPlot: function (index, cursor, x, y, color, coords, datalabel, element, graphindex, dontdraw) {
    var filltype = this.options.area || this.options.stacked_fill;

    if (!dontdraw) {
      if (filltype === true) {
        if (index !== 0 && index !== coords.length-1) {
          if (this.options.markers === 'circle') {
            this.drawGraphMarkers(index, x, y, color, datalabel, element);
          } else if (this.options.markers === 'value') {
            this.drawGraphValueMarkers(index, x, y, color, datalabel, element, graphindex);
          }
        }
      } else {
        if (this.options.markers === 'circle') {
          this.drawGraphMarkers(index, x, y, color, datalabel, element);
        } else if (this.options.markers === 'value') {
          this.drawGraphValueMarkers(index, x, y, color, datalabel, element, graphindex);
        }
      }
    }
    x -= 0.5;
    if (index === 0) {
      return this.startPlot(cursor, x, y, color);
    }

    if (this.options.curve_amount && index > 1 && (index < coords.length - 1)) {
      cursor.cplineTo(x, y, this.options.curve_amount);
    } else if (this.options.curve_amount && !filltype && (index = 1 || (index = coords.length - 1))) {
      cursor.cplineTo(x, y, this.options.curve_amount);
    } else {
      cursor.lineTo(x, y);
    }
  }
});

Grafico.StackGraph = Class.create(Grafico.AreaGraph, {
  chartDefaults: function () {
    return {
      stacked: true,
      stacked_fill: true,
      stroke_width: 0,
      curve_amount: 10
    };
  },

  setChartSpecificOptions: function () {
    if (!this.options.stacked_fill) {
      this.options.stroke_width = 5;
    }
  },

  stackData: function (stacked_data) {
    // apparently the arrays are pointers
    // which is the only reason this actually works
    var stacked_data_array = stacked_data.collect(
      function (data_set) {
        return data_set[1];
      });

    for (var i = stacked_data_array.length - 2; i >= 0; i--) {
      for (var j = 0; j < stacked_data_array[0].length; j++) {
        stacked_data_array[i][j] += stacked_data_array[i + 1][j];
      }
    }
    return stacked_data;
  }
});

Grafico.StreamGraph = Class.create(Grafico.StackGraph, {
  chartDefaults: function () {
    return {
      stacked: true,
      stacked_fill: true,
      stroke_width: 5,
      grid: false,
      draw_axis: false,
      show_horizontal_labels: false,
      show_vertical_labels:   false,
      stream: true,
      stream_line_smoothing:  false, // false, simple, weighted
      stream_smart_insertion: false,
      curve_amount: 4,
      stream_label_threshold: 0
    };
  },

  hasBaseLine: function() {
    return true;
  },

  calcBaseLine: function (stacked_data) {
    var base_line_data = stacked_data.collect(
      function (data_set) {
        return data_set[1];
      });

    var base_line = [], i, j;
    for (j = 0; j < base_line_data[0].length; j++) {
      sum = 0;
      for (i = 0; i < base_line_data.length; i++) {
        if (this.options.stream_line_smoothing == false) {
          sum += base_line_data[i][j];
        } else {
          sum += (i + 1) * base_line_data[i][j];
        }
      }

      if (this.options.stream_line_smoothing == false) {
        base_line[j] = -sum / 2;
      } else {
        base_line[j] = -sum / (base_line_data.length + 1);
      }
    }

    var base_line_min = base_line.min();
    for (i = 0; i < base_line.length; i++) {
      base_line[i] -= base_line_min;
    }

    this.base_line = base_line;
  },

  stackData: function (stacked_data) {
    var i,j;

    if (this.options.stream_smart_insertion) {
      stacked_data = $A(stacked_data);
      stacked_data.each(function(data_set) {
        i = 0;
        while (i < data_set[1].length && data_set[1][i] <= 0.0000001) {
          i++;
        }
        data_set[2] = i;
      });

      var sorted_data = stacked_data.sortBy(function(data_set) {
        return data_set[2];
      });

      var final_data = [];
      var bottom = false;
      sorted_data.each(function(data_set) {
        if (bottom) {
          final_data.push(data_set);
        } else {
          final_data.unshift(data_set);
        }
        bottom = !bottom;
      });

      stacked_data = $H();
      final_data.each(function(data_set) {
        stacked_data.set(data_set[0], data_set[1]);
      });
    }

    this.real_data = this.deepCopy(stacked_data);
    this.calcBaseLine(stacked_data);

    var stacked_data_array = stacked_data.collect(
      function (data_set) {
        return data_set[1];
      });

    for (j = 0; j < stacked_data_array[0].length; j++) {
      stacked_data_array[stacked_data_array.length - 1][j] += this.base_line[j];
    }

    for (i = stacked_data_array.length - 2; i >= 0; i--) {
      for (j = 0; j < stacked_data_array[0].length; j++) {
        stacked_data_array[i][j] += stacked_data_array[i + 1][j];
      }
    }

    return stacked_data;
  },

  drawPlot: function (index, cursor, x, y, color, coords, datalabel, element, graphindex, dontdraw) {
    if (this.options.datalabels && !dontdraw) {
      var real_data = this.getNormalizedRealData();
      var best_positions = this.bestMarkerPositions();

      if (index < coords.length/2) {
        if (best_positions[graphindex] >= index && best_positions[graphindex] < index + 1) {
          this.drawStreamMarker(index + 1, x + (best_positions[graphindex] - index) * this.step,
              y + real_data[graphindex][index] / 2, color, datalabel, element);
        }
      }
    }

    x -= 0.5;
    if (index === 0) {
      return this.startPlot(cursor, x, y, color);
    }

    cursor.cplineTo(x, y, this.options.curve_amount);
  },

  bestMarkerPositions: function () {
    if (this.best_marker_positions == undefined) {
      this.best_marker_positions = this.real_data.collect(function (data) {
        var best_index = -1, best_value = 0, streak_counter = 0;
        for (var i = 0; i < data[1].length; i++) {
          var value = data[1][i];
          if (value > best_value && value >= this.options.stream_label_threshold) {
            best_value = value;
            best_index = i;
            streak_counter = 0;
          }
          else if (value == best_value && best_value > 0) {
            streak_counter++;
          }
        }
        return best_index + streak_counter / 2;
      }.bind(this));
    }
    return this.best_marker_positions;
  },

  drawStreamMarker: function (index, x, y, color, datalabel, element, graphindex) {
    if (this.options.datalabels) {
      var hoverSet = this.paper.set(),
          textpadding = 4,
          text = this.paper.text(x, y - 2 * textpadding + this.options.font_size / 2, datalabel).attr(
      {'font-size': this.options.font_size,
        fill: this.options.hover_text_color,
        opacity: 1}),
          textbox = text.getBBox(),
          roundRect = this.drawRoundRect(text, textbox, textpadding);

      hoverSet.push(roundRect,text);
      this.checkHoverPos({rect: roundRect, set: hoverSet, textpadding: textpadding});
      this.globalHoverSet.push(hoverSet);
    }
  }
});

