const convertor = require("./convertor");

module.exports = async function (originalSaveKey, thumbnailSaveKey, options) {
  await new Promise((resolve, reject) => {
    convertor(
      {
        type: "image",
        input: `/tmp/${originalSaveKey}`,
        output: `/tmp/${thumbnailSaveKey}`,
        size: options.size
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
