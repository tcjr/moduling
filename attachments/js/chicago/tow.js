define([
  'dojo/_base/array',
  'dojo/_base/declare',
  "dojo/_base/lang",
  'put-selector/put',
  'mycouch/CouchDbStore',
  'dojox/charting/Chart2D'
], 
function(array, declare, lang, put, CouchStore, Chart2D){

  var Tow = declare([], {
    _store: null, 
    
    constructor: function(){
      this._store = new CouchStore({target:"/chicago/"});  // TODO: should we pass this in instead?
      console.debug("this._store == %o", this._store);
    },

    _getColorCounts: function(){
      
      return this._store.query({
        type: 'view',
        design: 'moduling', // TODO: avoid hard-coding this
        view: 'byColour',
        processAs: 'viewKeyArray'
      }, {
        group_level: 1,
        reduce: true,
        keyFields: ['color']
      });
      
    },
    
    chartColors: function(node){
      // build the chart
      
      var loadData = this._getColorCounts();
      loadData.then(this._dumpView);
      loadData.then(lang.hitch(this, '_showColorsChart', node));
    },
    
    _showColorsChart: function(node, colorCounts){
      var counts = colorCounts.sort(function(a,b){
        if(a._view_value<b._view_value) return -1;
        if(a._view_value>b._view_value) return 1;
        return 0;
      });
      console.debug("about to chart %o into node %o", counts, node);

      var colors = array.map(counts, "return item.color");
      var numbers = array.map(counts, function(item){return item._view_value;});

      var chart = Chart2D(node);
      chart.addPlot("totals", {
        type: 'Bars',
        hAxis: 'colorName'
      });

      chart.addAxis("colorName", {
        labels: colors,
        vertical: true
      });
      
      chart.addSeries("Totals", numbers, {plot: 'totals'});
      chart.render();
      
    },
    
    _dumpView: function(data){
      console.debug("got successful response.  data.length=%o, data.total=%o", data.length, data.total);
      console.debug(data);
    }
    
  });
  
  return Tow;
});


