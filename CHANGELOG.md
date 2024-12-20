# Change Log

All notable changes to the "metagrapho-api" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.12]

* Error when adding templates to package

## [0.0.11]

* load black image with same resolution when image not found

## [0.0.10]

* Icon added

## [0.0.9]

* Better error handling for image preview.
* When image name in pagexml is not properly defined -> fall back to name of pagexml and [jpg, png, tif] in parent dir of pagexml.

## [0.0.8]

* Simple pagexml visualization:
  * example.jpg, page/example.xml
  * xml - file must have correct filename ('PageimageFilename="" imageWidth...')

## [0.0.7]

* Get XML-file from last recognition
* Different naming for Commands:
  * metagrapho-api: Send Image to Endpoint
  * metagrapho-api: Get XML from last Image

## [0.0.4]

- Initial release
- AUTH on transkribus using username and password (not OpenID)
- Send image (jpg/base64) to Metagrapho API
