var fs = require('fs'),
    Compose = require('compose'),
    couchdb = require('felix-couchdb');

var Uploader = Compose(Compose, {
  initDb: function(host, port, dbName){
    this.client = couchdb.createClient(port, host);
    this.db = this.client.db(dbName);
  },
  
  dumpInfo: function(){
    console.log("view id: " + this.data.meta.view.id);
    
    console.log("col count: " + this.data.meta.view.columns.length);
    
    var cols = this.data.meta.view.columns;
    console.log("COLUMNS");
    cols.forEach(function(col){
      console.log("  col: '"+col.name+"'");
    });
    
    console.log("data row count: " + this.data.data.length);
  },
  
  importFile: function(filename){
    this.data = JSON.parse(fs.readFileSync(filename));
    this.colNames = this.data.meta.view.columns.map(function(col){ return col.name; });
    
  },
  
  pushViewInfo: function(){
    var infoDoc = {
      type: 'raw-doc-info',
      "meta-view": this.data.meta.view
    };
    
    this.db.saveDoc(infoDoc, function(err, resp){
      if(err){
        throw new Error("Error saving view doc: " + JSON.stringify(err));
      }
      console.log("document saved: " + JSON.stringify(resp));
    });
  },
  
  _buildDoc: function(lineItem){
    console.log('building doc...');
    var doc = {
      // Not sure what the correct back-link is
      "meta-view-id": this.data.meta.view.id,
      "meta-view-tableId": this.data.meta.view.tableId,
      "meta-view-oid": this.data.meta.view.oid
    };
    for(var i=0; i<this.colNames.length; i++){
      doc[this.colNames[i]] = lineItem[i];
    }
    return doc;
  },
  
  pushAllDocs: function(){
    var items = this.data.data;
    var docs = [];
    
    // (items.forEach.bind(this))(function(item){
    //   docs.push(this._buildDoc(item));
    // });

    // var self = this;
    // items.forEach(function(item){
    //   docs.push(self._buildDoc(item));
    // });
    
    var self = this;
    for(var i=1; i<items.length; i++){ // There is a head row, so we'll start at index 1
      docs.push( self._buildDoc( items[i] ) );
    }
    
    var bulkData = JSON.stringify({
      docs:docs
      //all_or_nothing: true
    });
    this.db.bulkDocs(bulkData, function(err, resp){
      if(err){
        throw new Error("Error saving docs: " + JSON.stringify(err));
      }
      console.log("docs saved: " + JSON.stringify(resp));
    });
  }
  
});


var pusher = new Uploader({
});

// How do I put these in a constructor?
pusher.initDb('hitchcock.local', 5984, 'chicago');

pusher.importFile('rows.json');
pusher.pushViewInfo();
pusher.dumpInfo();
pusher.pushAllDocs();
