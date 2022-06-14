// module dependencies
const http = require('http')
var dclassify = require('dclassify')

var pluralize = require('pluralize')
var func = require('./functions.js')

// Utilities provided by dclassify
var Classifier = dclassify.Classifier
var DataSet    = dclassify.DataSet
var Document   = dclassify.Document

var sfwFromFile = func.readFile("avm/sfw.txt")
var nsfwFromFile = func.readFile("avm/nsfw.txt")

// var userInput, userTraining
var dir = "./avm/"

const hostname = '127.0.0.1'
const port = 7007

// get querystring parameters
var params=function(req){
  let q=req.url.split('?'),result={}
  if(q.length>=2){
      q[1].split('&').forEach((item)=>{
           try {
             result[item.split('=')[0]]=item.split('=')[1]
           } catch (e) {
             result[item.split('=')[0]]=''
           }
      })
  }
  return result
}

var url_params
const server = http.createServer((req, res) => {
  req.params=params(req)
  url_params = req.params
  //console.log(req.params)

  var avm = []
  avm["sfw"] = 0
  avm["nsfw"] = 0

  var output = []
  var collect = []
  var keys = []

  if (req.params.q) {
    console.log("Category requested: " + req.params.q)

    var aQ = req.params.q.replace("%20","").split(",")
    for (var i = 0; i < aQ.length; i++) {
      var tmp = aQ[i]
      var aTmp = tmp.split("-")
      var key = aTmp[0]
      var val = parseInt(aTmp[1])

      if (key != '') {
      keys.push(key)

      if (val > 0) {
        val = val / 100
      }

      //console.log(key + ": " + val)

      var cl = classify(key)

      var final = {}
      final.keyword = key
      final.strength = val
      final.category = cl.category
      final.probability = cl.probability

      var tmpCat = final.strength * final.probability
      switch(final.category) {
        case "sfw":
          avm["sfw"] += tmpCat
          break
        case "nsfw":
          avm["nsfw"] += tmpCat
          break
        default:
          avm["unknown"] += tmpCat
          break
      }

      collect.push(final)
    }
  }

    var lg = {}

    var largest = 0
    for (i in avm) {
      var tmp = avm[i]

      if (largest < tmp ) {
        lg.category = i
        lg.total = Math.ceil(tmp * 100) /100

        largest = tmp
      }
    }

    lg.keywords = keys.join(",")
    lg.categories = avm
    lg.breakdown = collect

    output.push(lg)
    //console.log(collect)
    console.log(output)

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(output))
  } else {
    var fail = {}
    res.end(JSON.stringify(fail))
  }
})

server.listen(port, hostname, () => {
  // create temp folder if it doesn't exist
  console.log(`Server running at http://${hostname}:${port}/`)
})

function classify(which) {

    // create some 'good' test items (name, array of characteristics)
    var itemUnknown = new Document('unknown',[])
    var itemSFW = new Document('sfwFromFile', sfwFromFile)
    var itemNSFW = new Document('nsfwFromFile', nsfwFromFile)

    // create a DataSet and add test items to appropriate categories
    // this is 'curated' data for training
    var data = new DataSet()
    data.add('unknown', itemUnknown)
    data.add('sfw', itemSFW)
    data.add('nsfw', itemNSFW)

    // an optimisation for working with small vocabularies
    var options = {
        //applyInverse: true
    }

    // create a classifier
    var classifier = new Classifier(options)

    // train the classifier
    classifier.train(data)
    //console.log('Classifier trained.')
    //console.log(JSON.stringify(classifier.probabilities, null, 4))

    userInput = pluralize.singular(which)
    //console.log('Classifying: \"' + func.sentenceCase(userInput) + '\": ')

    // test the classifier on a new test item
    var testThis = []
    testThis.push(userInput.toLowerCase())

    var testDoc = new Document('testDoc', testThis)
    var result1 = classifier.classify(testDoc)
    result1.q = which

    // report to the user
    //console.log(result1)
    //console.log(func.sentenceCase(result1.category))

    return result1
}
