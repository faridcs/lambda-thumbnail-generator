#!/bin/bash
# Set AWS_LAMBDA_ACCESS_KEY_ID, AWS_LAMBDA_SECRET_ACCESS_KEY, AWS_LAMBDA_DEFAULT_REGION, and AWS_LAMBDA_BUCKET_NAME environment variables

FUNCTION_DIRECTORY="./lambda-thumbnail"
REPO_NAME=$(basename `git rev-parse --show-toplevel`)
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
ZIP_FILENAME="lambda-thumbnail.zip"

function msg {
    if [ $? -eq 0 ]
    then
        echo $1
    else
        echo $2
        exit 1
    fi
}

function checkcmd {
    if ! command -v $@ &> /dev/null
    then
        echo "$@ could not be found, please install it first."
        exit
    fi
}

function checkenv {
    if [ -z ${2} ]
    then
        echo "$1 environment variable is not set."
        exit
    fi
}

checkenv AWS_LAMBDA_ACCESS_KEY_ID $AWS_LAMBDA_ACCESS_KEY_ID
checkenv AWS_LAMBDA_SECRET_ACCESS_KEY $AWS_LAMBDA_SECRET_ACCESS_KEY
checkenv AWS_LAMBDA_DEFAULT_REGION $AWS_LAMBDA_DEFAULT_REGION
checkenv AWS_LAMBDA_BUCKET_NAME $AWS_LAMBDA_BUCKET_NAME

checkcmd aws --version
checkcmd zip

msg "Installing dependencies..."
cd $FUNCTION_DIRECTORY && npm install --production
msg "Creating zip file..."
zip -rq "../${ZIP_FILENAME}" . 
cd ..
msg "Zip file ${ZIP_FILENAME} created successfully." "Could not create zip file. exiting..."
msg "Uploading to S3..."
AWS_DEFAULT_REGION=$AWS_LAMBDA_DEFAULT_REGION AWS_ACCESS_KEY_ID=$AWS_LAMBDA_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$AWS_LAMBDA_SECRET_ACCESS_KEY aws s3 cp $ZIP_FILENAME "s3://${AWS_LAMBDA_BUCKET_NAME}/${ZIP_FILENAME}"
msg "Zip file upload successfully to S3." "Could not upload zip file."