 var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc = 
  { _id:'_design/moduling'
  , rewrites : 
    [ {from:"/", to:'index.html'}
    // , {from:"/api", to:'../../'}
    // , {from:"/api/*", to:'../../*'}
    , {from:"/*", to:'*'}
    ]
  }
  ;

ddoc.views = {
  'byTitle': {
    map: function (doc){
      if(doc.title && doc.title.length){
        var name = doc.title.replace(/^(A|The) /, '');
        emit(name, 1);
      }
    }
  },
  'byRunningTime': {
    map: function(doc) {
      if (doc.duration){
        var parts = doc.duration.split(':');
        var min = parseInt(parts[0]);
        var sec = parseInt(parts[1]);
        emit((min*60)+sec, null);
      }
    }
  },

  'byInventoryNumber': {
    map: function(doc) {
      if (doc['meta-view-id'] == 'ygr5-vcbg'){ // type check
        if ('Inventory Number' in doc){
          emit( parseInt(doc['Inventory Number']), null);
        }
      }
    }
  },

  'byColor': {
    map: function(doc) {
      if (doc['meta-view-id'] == 'ygr5-vcbg'){ // type check
        if ('Color' in doc){
          emit( {'color':doc['Color']}, 1);
        }else{
          emit( {'color':'Unspecified'}, 1);
        }
      }
    }, 
    reduce: '_sum'
  },

  'byColour': {
    map: function(doc) {
      if (doc['meta-view-id'] == 'ygr5-vcbg'){ // type check
        if ('Color' in doc){
          emit( [doc['Color']], 1);
        }else{
          emit( ['Unspecified'], 1);
        }
      }
    }, 
    reduce: '_sum'
  }


};


ddoc.lists = {

  /* Returns an html table of all the rows in the view.
   * Takes a comma separated list of headers as an argument 
   */
  table: function(head, req){
    start({
      "headers": {
        "Content-Type": "text/html"
      }
    });
    if('headers' in req.query){
      var headers = req.query.headers.split(',');
      var row;
      send('<table><thead><tr>');
      for(var header in headers){
        send('<td>'+headers[header]+'</td>');
      }
      send('</tr></thead><tbody>')
      while(row = getRow()){
        send('<tr>');
        for(var header in headers){
          send('<td>'+row.value[headers[header]]+'</td>');
        }
        send('</tr>');
      }
      send('</tbody></table>')
    }else{
      send("A urlencoded list of table headers argument is required.")
    }
  },
  
  plain_br: function(head, req){
    start({
      "headers": {
        "Content-Type": "text/html"
      }
    });
    var row;
    while(row = getRow()){
      send(row.key + '<br/>');
    }
  }
  
  // simple_json: function(head, req){
  //   // start({
  //   //   "headers": {
  //   //     "Content-Type": "application/json"
  //   //   }
  //   // });
  //   var row;
  //   var first=true;
  //   send('[ ');
  //   while(row = getRow()){
  //     if(first){ first=false; }else{ send(', '); }
  //     send( '\n{'+ '"id":"' + row.id + '"' +'}' );
  //   }
  //   send(' ]\n');
  //   
  // }
  
};


ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {   
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  } 
}

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;