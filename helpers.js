var fs = require('fs');

// writes the given array to a set of files
// one file per array object
// file name is based on fileNameBase + array[i][propertyToAppend]
function writeArrayToFile(arrayObject, fileNameBase, propertyToAppend, i) {
    if (!!!i) {
        i = 0;
    }

    if (i >= arrayObject.length) {
        return;
    }
    
    var item = arrayObject[i];
    
    var fileName = item.openT2T.translator + fileNameBase + item[propertyToAppend] + ".json";

    console.log(fileName);
    var contents = JSON.stringify(item);
    fs.writeFile(fileName, contents, function (err, data) {
        if (err) {
            return console.log(err);
        }

        return writeArrayToFile(arrayObject, fileNameBase, propertyToAppend, i+1);
    })
}

module.exports.writeArrayToFile = writeArrayToFile;