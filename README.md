# metagrapho-api README

This is the README for the extension "metagrapho-api".
It helps you sending images of the type jpg to the Metagrapho-API as it is documented here:

https://www.transkribus.org/metagrapho/documentation

## Features

Currently the following features are supported:

* Authentificate in Transkribus (check if you are eligible to use the Transkribus API)
* Send an image (of type jpg) to the Metagrapho API
* Get the result of the recognition (only for last recognition)
* Show pagexml in editor (view only/line-polygons with text)

## Requirements

Register here: https://app.transkribus.org/

Make sure to have an appropriate subscription to use the Metagrapho API.

## Extension Settings

This extension contributes the following settings:

* metagrapho-api.sendImageToEndpoint: Send image(jpg) to Metagrapho API.
* metagrapho-api.getXML: Get result from Metagrapho API.

## Known Issues

* The following error message is shown if the job is still running or failed:
  "An error occurred while retrieving the XML file: Request failed with status code 404"

## Release Notes

### 0.0.9-0.0.11

* load black image with same resolution when image not found
* Icon added
* Better error handling for image preview.
* When image name in pagexml is not properly defined -> fall back to name of pagexml and [jpg, png, tif] in parent dir of pagexml.

---

## For more information

* [Transkribus Web App](https://app.transkribus.org/)
* [Metagrapho Documentation](https://www.transkribus.org/metagrapho/documentation)
