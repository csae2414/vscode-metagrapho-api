# metagrapho-api README

This is the README for the extension "metagrapho-api".
It helps you sending images of the type jpg to the Metagrapho-API as it is documented here:

https://www.transkribus.org/metagrapho/documentation

## Features

Currently the following features are supported:

* Authentificate in Transkribus (check if you are eligible to use the Transkribus API)
* Send an image (of type jpg) to the Metagrapho API

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

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

### 0.0.7

* Get XML-file from last recognition
* Different naming for Commands:
  * metagrapho-api: Send Image to Endpoint
  * metagrapho-api: Get XML from last Image

### 0.0.4

* Send jpg (base64 encoded) to metagrapho-API

---

## For more information

* [Transkribus Web App](https://app.transkribus.org/)
* [Metagrapho Documentation](https://www.transkribus.org/metagrapho/documentation)
