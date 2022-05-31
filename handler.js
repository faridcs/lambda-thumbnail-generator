const aws = require("aws-sdk");
const { promises: fs } = require("fs");
const imageConvertor = require("./image");
const videoConvertor = require("./video");

const s3 = new aws.S3();

function getUriFriendlyKey(key) {
  return key.split("/").join("_");
}

function getThumbnailUriFriendlyKey(key) {
  return getUriFriendlyKey(key.replace(/image|video/, "thumbnail"))
    .split(".")[0]
    .concat(".jpg");
}

function getPathFromUriFriendlyKey(key) {
  return key.split("_").join("/");
}

async function createThumbnail(event) {
  let bucket = "null";
  let key = "key null";
  const uploadBucket = process.env.S3_AMVLET_BUCKET || "amvlet-media-prod";
  if (event.Records) {
    bucket = event.Records[0].s3.bucket.name;
    key = event.Records[0].s3.object.key;

    if (!key.startsWith("image") && !key.startsWith("video")) {
      console.error('Keys must start with "image" or "video"');
      throw new Error(`Key ${key} does not start with "image" or "video"`);
    }

    const originalSaveKey = getUriFriendlyKey(key);
    const thumbnailSaveKey = getThumbnailUriFriendlyKey(key);
    const thumbnailUploadKey = getPathFromUriFriendlyKey(thumbnailSaveKey);

    const isDownloaded = await download(bucket, key, originalSaveKey);

    if (isDownloaded) {
      const fileType = key.split("/").shift();
      switch (fileType) {
        case "image":
          console.log(
            `file type of key: ${fileType}, bucket: ${bucket} is image`
          );
          await handleImageThumbnail(
            uploadBucket,
            originalSaveKey,
            thumbnailSaveKey,
            thumbnailUploadKey
          );
          break;
        case "video":
          console.log(
            `file type of key: ${fileType}, bucket: ${bucket} is video`
          );
          await handleVideoThumbnail(
            uploadBucket,
            originalSaveKey,
            thumbnailSaveKey,
            thumbnailUploadKey
          );
          break;
        default:
          console.log(
            `file type of key: ${fileType}, bucket: ${bucket} is unknown`
          );
          await deleteFile(`/tmp/${originalSaveKey}`);
          break;
      }
    }
    return {
      status: 200,
      code: 200,
      message: `File ${key} successfully uploaded to bucket ${bucket}`,
      object: {},
    };
  } else {
    throw new Error(
      `Error: Could not upload file ${key} to bucket ${bucket}, Record is undefined.`
    );
  }
}

async function download(bucket, key, originalSaveKey) {
  const resp = await getObject(bucket, key);
  console.log("download successfully");
  await fs.writeFile(`/tmp/${originalSaveKey}`, resp.Body);
  console.log("download and saved file");
  return true;
}

async function upload(bucket, thumbnailSaveKey, thumbnailUploadKey) {
  if (await checkFileExistance(`/tmp/${thumbnailSaveKey}`)) {
    try {
      const fileBuffer = await fs.readFile(`/tmp/${thumbnailSaveKey}`);
      const isPublic = thumbnailSaveKey.split("_").pop().includes("public");
      const params = {
        Bucket: bucket,
        Key: thumbnailUploadKey,
        Body: fileBuffer,
      };
      if (isPublic) {
        params["ACL"] = "public-read";
      }

      await new Promise((resolve, reject) => {
        s3.putObject(params, (err, data) => {
          if (err) {
            console.log(`upload file: bucket: ${thumbnailUploadKey}, key: ${thumbnailSaveKey} was unsuccessful 
        because of ${err}`);
            reject();
          } else {
            console.log(
              `upload file: bucket: ${thumbnailUploadKey}, key: ${thumbnailSaveKey} was successful`
            );
            resolve();
          }
        });
      });
    } finally {
      deleteFile(`/tmp/${thumbnailSaveKey}`);
    }
  }
}

async function getObject(bucket, key) {
  return new Promise((resolve, reject) => {
    s3.getObject(
      {
        Bucket: bucket,
        Key: key,
      },
      (err, data) => {
        if (err) {
          console.log(
            `get object err: key: ${key}, bucket: ${bucket}, error: ${err}`
          );
          reject(err);
        } else {
          console.log(
            `get object successfully: key: ${key}, bucket: ${bucket}`
          );
          resolve(data);
        }
      }
    );
  });
}

async function handleImageThumbnail(
  bucket,
  originalSaveKey,
  thumbnailSaveKey,
  thumbnailUploadKey
) {
  try {
    await imageConvertor(originalSaveKey, thumbnailSaveKey, {
      size: process.env.IMAGE_SIZE || "320x240",
      snapshotTime: process.env.SNAPSHOT_TIME || "00:00:02",
    });
    console.log(
      `going to upload image thumbnail: ${thumbnailUploadKey}, bucket: ${bucket}`
    );
    await upload(bucket, thumbnailSaveKey, thumbnailUploadKey);
  } finally {
    deleteFile(`/tmp/${originalSaveKey}`);
  }
}

async function handleVideoThumbnail(
  bucket,
  originalSaveKey,
  thumbnailSaveKey,
  thumbnailUploadKey
) {
  try {
    await videoConvertor(originalSaveKey, thumbnailSaveKey, {
      size: process.env.VIDEO_SIZE || "320x240",
    });
    console.log(
      `going to upload video thumbnail: ${thumbnailUploadKey}, bucket: ${bucket}`
    );
    await upload(bucket, thumbnailSaveKey, thumbnailUploadKey);
  } finally {
    deleteFile(`/tmp/${originalSaveKey}`);
  }
}

async function checkFileExistance(path) {
  const stat = await fs.stat(path);
  const exist = stat.isFile();
  console.log(`path ${path} exist state is ${exist}`);
  return exist;
}

async function deleteFile(path) {
  if (await checkFileExistance(path)) {
    await fs.unlink(path);
    console.log(`delete file ${path} was successful`);
  }
}
module.exports = {
  createThumbnail,
};
