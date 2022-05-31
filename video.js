const convertor = require("./convertor");

module.exports = async function (originalSaveKey, thumbnailSaveKey, options) {
  return new Promise((resolve, reject) => {
    convertor(
      {
        type: "video",
        input: `/tmp/${originalSaveKey}`,
        output: `/tmp/${thumbnailSaveKey}`,
        time: options.snapshotTime,
        size: options.size,
      },
      function (err, path) {
        if (err) {
          reject(err);
        } else {
          resolve(path);
        }
      }
    );
  });
};
