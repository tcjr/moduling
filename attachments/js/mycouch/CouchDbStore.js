define([
  'dojo/_base/array',
  'dojo/_base/declare',
  'dojo/_base/Deferred',
  'dojo/_base/lang',
  'dojo/_base/xhr',
  'dojo/io-query',
  'dojo/store/JsonRest',
  'dojo/store/util/QueryResults'
],
function(array, declare, Deferred, lang, xhr, ioQuery, JsonRestStore, StockQueryResults){

  var util = {};

  util._checkArgs = function(obj, info, deps){
    var good = array.every(deps, function(dep){ return (dep in obj); });
    if(!good){
      throw new Error("options for " + info + " must include: " + deps.join(', '))
    }
  }

  util._updateOptions = function(query, opts){
    if ('processAs' in query){
      switch(query.processAs){
        case 'viewWithDocIncluded':
          opts.include_docs = true
          break
      }
    }
  }

  util.buildCouchCall = function(inputQuery, inputOptions){
    var DEFAULT_QUERY = {};
    var query = lang.mixin(dojo.clone(DEFAULT_QUERY), inputQuery);
    var options = lang.mixin({}, inputOptions);
    var queryUrl = '';
    var processor = null;
    util._checkArgs(query, 'query', ['type']);

    
    switch(query.type){
      case 'view':
        util._checkArgs(query, 'type view', ['design', 'view']);
        // req: design
        // req: view
        queryUrl = '_design/' + query.design + '/_view/' + query.view;
        processor = util.resultsProcessors.standardView; // default, may be overwritten with processAs
        break;
      case 'list':
        util._checkArgs(query, 'type list', ['design', 'view', 'list']);
        // req: design
        // req: view
        // req: list
        queryUrl = '_design/' + query.design + '/_list/' + query.list + '/' + query.view;
        processor = StockQueryResults;  // default, may be overwritten with processAs
        break;
      default:
        throw new Error("query type "+query.type+"not supported");
    };

    if ('processAs' in query){
      processor = (util.resultsProcessors[query.processAs]);
    }

    util._updateOptions(query, options);

    var couchCall = {
      url: queryUrl + (Object.keys(options).length ? '?'+ioQuery.objectToQuery(options) : ''),
      processor: processor
    };
    
    console.debug("Full couch-ready info: %o", couchCall);
    return couchCall;
  };
  
  
  util.resultsProcessors = {};

  /* 
   * All of the results processors return an array-like object compatable with dojo.store.api.Store.QueryResults.
   */
   
  /* Normal couch views return data in this form:
   *  {"total_rows":968, "offset":0, "rows":[ ... ]}
   * This basic processor returns the rows part
   */
  util.resultsProcessors.standardView = function(couch_view_results){
    console.debug("processing couch results with: standardView");
    var store_results = Deferred.when(couch_view_results, function(wrapped_results){
      var results_array = wrapped_results.rows;
      // add-in the total and offset values
      results_array.total = wrapped_results.total_rows || results_array.length;
      results_array.offset = wrapped_results.offset;
      return results_array;
    });
    return store_results;
  };

  /* For couch views, if include_docs=true is used, then couch will put the doc into each row of the results, like this:
   *  {"total_rows":2, "offset":0, "rows":[ 
   *    {"id":"xxxxxx", "key": ..., "value": ... , doc: {"_id":"xxxxxx", ... } },
   *    {"id":"yyyyyy", "key": ..., "value": ... , doc: {"_id":"yyyyyy", ... } }
   *  ]}
   * This processor returns an array of just the docs (with "id" not "_id").
   * NOTE: 'key' and 'value' are mixed into the doc as '_view_key' and '_view_value'
   * TODO: Perhaps the key & value mixing-in should be a different processor...
   */
  util.resultsProcessors.viewWithDocIncluded = function(couch_view_results){
    console.debug("processing couch results with: viewWithDocIncluded");
    var store_results = Deferred.when(couch_view_results, function(wrapped_results){
      
      var results_array = array.map(wrapped_results.rows, function(row){
        var doc = row.doc;
        doc.id = doc._id;
        doc._view_key = row.key;
        doc._view_value = row.value;
        delete doc._id;
        return doc;
      });
      results_array.total = wrapped_results.total_rows || results_array.length;
      results_array.offset = wrapped_results.offset;
      return results_array;
    });
    
    return store_results;
  };

  /* Some people like to write view map functions that emil the document as the value, like this:
  *  {"total_rows":2, "offset":0, "rows":[ 
  *    {"id":"xxxxxx", "key": ..., "value": {"_id":"xxxxxx", ... } },
  *    {"id":"yyyyyy", "key": ..., "value": {"_id":"yyyyyy", ... } }
  *  ]}
  *  This processor returns an array of these values (with "id" not "_id").
  *  NOTE: 'key' is not included in the results
  */
  util.resultsProcessors.viewWithDocAsValue = function(couch_view_results){
    throw new Error("processor not yet implemented");
  };
  
  /* Couch allows you to use objects as view keys, like this:
  *  {"total_rows":2, "offset":0, "rows":[ 
  *    {"id":"xxxxxx", "key": { ... }, "value": ... },
  *    {"id":"yyyyyy", "key": { ... }, "value": ... }
  *  ]}
  *  This processor returns an array of the key objects.  If the key does not contain an 'id' property, then the id from 
  *  the result row will be mixed-in.
  *  NOTE: View ids are not guaranteed by couchdb to be unique!
  */
  util.resultsProcessors.viewKeys = function(couch_view_results){
    throw new Error("processor not yet implemented");
  };
  
  
  var CdbUtil = util;  
  
// ***  

  var CouchDbStore = dojo.declare([JsonRestStore], {

    constructor: function(){
      this.inherited(arguments);
      this.put = this._readOnlyImpl;
      this.add = this._readOnlyImpl;
      this.remove = this._readOnlyImpl;
    },

    _readOnlyImpl: function(){
      throw new Error("read-only store implementation");
    },

    get: function(){
      return this.inherited(arguments).then(function(doc){
        doc.id = doc._id;
        delete doc._id;
        return doc;
      });
    },

    query: function(query, options){
      var couchCall = {};
      
      if(query && typeof query == 'object'){

        couchCall = CdbUtil.buildCouchCall(query, options);
        
      }else{ 
        throw new Error("query must be an object");
      }
      
      console.debug("Query to send to couch: %s", couchCall.url);

      var results = xhr('GET', {
        handleAs: 'json',
        url: this.target + couchCall.url
      });

      //var processedResults = CdbUtil.resultsProcessors.standardView(results); // hardcoded
      var processedResults = (couchCall.processor)(results); 

      return processedResults;
    }
    
  });

  return CouchDbStore;
  
});
