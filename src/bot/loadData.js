const csv = require("csv-parser");
const fs = require("fs");

module.exports.loadFile = (manager, filePath, type) => {
  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", row => {
      switch (type) {
        case "questions":
          manager.addDocument(row["Language"], row["Key"], row["Group"]);
        case "answer":
          manager.addAnswer(row["Language"], row["Group"], row["Key"]);
          break;
        default:
          console.log(row);
          break;
      }
    })
    .on("end", () => {
      console.log(`CSV file ${filePath} has been process successfully!`);
    });
};
