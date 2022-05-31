const { exec } = require("child_process");
const ffmpegPath = "/opt/bin/ffmpeg";

function video(options, callback) {
  let { input, time, size, output } = options;

  if (!time) {
    time = "00:00:01";
  }

  exec(
    `${ffmpegPath} -i "${input}" -y -ss ${time} -f image2 -vframes 1 -vf scale=${size}:force_original_aspect_ratio=decrease "${output}"`,
    function (err) {
      if (err) return callback(err, null);
      callback(null, options.output);
    }
  );
}

function image(options, callback) {
  const { input, size, output } = options;
  exec(
    `${ffmpegPath} -i "${input}" -y -vf scale=${size}:force_original_aspect_ratio=decrease "${output}"`,
    function (err) {
      if (err) return callback(err, null);
      callback(null, options.output);
    }
  );
}

module.exports = function (options, callback) {
  if (options.type == "video") {
    video(options, function (err, path) {
      if (err) return callback(err, null);
      callback(null, path);
    });
  } else if (options.type == "image") {
    image(options, function (err, path) {
      if (err) return callback(err, null);
      callback(null, path);
    });
  } else {
    callback("Not supported.", null);
  }
};